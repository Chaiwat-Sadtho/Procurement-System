# ADR-0001: Audit logs are written inside the business transaction

- Status: Accepted
- Date: 2026-06-05
- Deciders: project owner
- Related: `CONTEXT.md` invariant #10; spec `docs/superpowers/specs/2026-06-05-audit-durability-design.md`

## Context

Every state-changing action on a Purchase Request, Purchase Order, or Goods Receipt
Note records an entry in the `audit_logs` table (who did what, to which entity, old
value → new value). These records are the system's compliance trail.

The original implementation emitted the audit entry as a detached, best-effort side
effect, fired *after* the business action had already committed:

```ts
void this.auditLogsService.log({ ... }).catch(() => {});
```

This has two failure modes:

1. **Silent loss.** The trailing `.catch(() => {})` swallows every error. If the audit
   write fails (a dropped connection, an exhausted pool, the process dying between the
   business commit and the audit write), the record is lost and *nothing reports it* —
   no log line, no alert.
2. **No atomicity.** The audit write runs outside the business transaction, so a
   business action can commit while its audit entry never lands. The result is a
   committed action with no record of who performed it — a compliance gap.

`CONTEXT.md` invariant #10 had codified the original stance — "AuditLog + Notification
= fire-and-forget (does not block the main flow)." That stance optimised for
availability (the action never fails because of a logging concern) at the cost of
durability. For a procurement system whose audit trail is its accountability
mechanism, that trade is wrong: an unrecorded approval is worse than a failed one.

## Decision

**Write the audit entry inside the same database transaction as the business action it
records.** Audit becomes atomic with the action: either both commit or both roll back.
If the audit write fails, the business action is rolled back and the caller receives an
HTTP 500.

Mechanically:

- `AuditLogsService.log(params, manager?)` gains an optional `EntityManager`. When a
  manager is supplied the audit row is saved through it (joining the caller's
  transaction); when omitted it falls back to the injected repository (backward
  compatible).
- Actions that already run in a `dataSource.transaction` (PR approve, PO create, GRN
  create) move their audit call inside the existing callback.
- Actions that were a single bare `save` (PR submit/reject, PO acknowledge/cancel) are
  wrapped in a new transaction that covers both the status change and the audit write.

**Notifications keep the original best-effort, non-blocking stance** — a missed
notification is a UX inconvenience, not a compliance gap — but their silent
`.catch(() => {})` is replaced with `.catch(err => logger.warn(...))` so failures are
at least observable.

Invariant #10 is therefore split: **audit = durable (atomic-in-transaction);
notification = best-effort (logged on failure).**

## Consequences

**Positive**

- A committed business action always has its audit record. The compliance trail can no
  longer silently lose entries.
- Audit-write failures surface as real errors instead of vanishing.
- The change demonstrates transaction discipline with no new infrastructure.

**Negative / accepted trade-offs**

- Audit availability now gates business availability: if the audit row cannot be
  written, the action fails. This is intentional ("can't record it → don't do it"). In
  practice the risk is negligible — within a single transaction, a connection that can
  write the business row can write the audit row; an isolated audit failure implies a
  bug we would want surfaced anyway.
- Two actions that were bare saves now open a transaction, a marginal cost.

**Neutral**

- `log()` is backward compatible; the read path and any manager-less caller are
  unaffected.

## Alternatives considered

- **Best-effort + observability** — keep audit outside the transaction but `await` it
  and log/alert on failure (optionally retry). Rejected as the primary mechanism: it
  makes loss *visible* but not *impossible*; the action can still commit without its
  audit. (Its observability idea is adopted for notifications, where best-effort is the
  desired stance.)
- **Transactional outbox** — write an audit-intent row inside the transaction and have a
  worker deliver it asynchronously with retries. Durable and decoupled, but it solves a
  problem we do not have: the audit sink is the *same* PostgreSQL database as the
  business data, so there is no slow or unreliable external system to decouple from. The
  added table, worker, scheduling, and idempotency are unjustified complexity for a
  single-database monolith.
- **Retry with backoff on the detached promise** — handles transient blips but still
  loses on persistent failure and provides no atomicity. Rejected.
