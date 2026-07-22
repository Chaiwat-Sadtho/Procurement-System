import { DataSource, Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedBaseline } from './seed';
import { truncateAllTables } from '../common/truncate';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { VendorCategory } from '../vendors/entities/vendor-category.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Budget } from '../budgets/entities/budget.entity';
import { Announcement } from '../announcements/entities/announcement.entity';
import {
  EXTRA_DEPARTMENTS,
  EXTRA_USERS,
  VENDOR_CATEGORIES,
  VENDORS,
  BUDGET_PERIODS,
  budgetTotalFor,
  CATALOG,
  PR_SCENARIOS,
  PrScenario,
  ANNOUNCEMENTS,
} from './seed-demo-data';
import * as bcrypt from 'bcrypt';
import { itemTotal, sumMoney } from '../common/money';
import {
  applyReserve,
  applyAdjust,
  applyConsume,
  applyRelease,
  round2,
} from '../common/budget-math';
import { formatRunningNumber } from '../common/running-number';
import { VendorRating } from '../vendors/entities/vendor-rating.entity';
import { PurchaseRequest, PrStatus } from '../purchase-requests/entities/purchase-request.entity';
import { PurchaseRequestItem } from '../purchase-requests/entities/purchase-request-item.entity';
import { PurchaseOrder, PoStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../purchase-orders/entities/purchase-order-item.entity';
import { GoodsReceiptNote, GrnStatus } from '../goods-receipts/entities/goods-receipt-note.entity';
import {
  GoodsReceiptItem,
  ItemCondition,
} from '../goods-receipts/entities/goods-receipt-item.entity';
import { UserRole } from '../users/entities/user.entity';

// Deterministic 'YYYY-MM-DD' in the middle of a quarter
function quarterDate(fy: number, quarter: number, dayOffset = 0): string {
  const month = (quarter - 1) * 3 + 1; // mid-quarter month, e.g. Q1 → February
  const d = new Date(Date.UTC(fy, month, 15 + dayOffset));
  return d.toISOString().slice(0, 10);
}

// Backdate the timestamps so the charts span several fiscal years; @CreateDateColumn always writes
// "now" on insert, so this has to run right after each save.
async function backdate(
  ds: DataSource,
  table: string,
  id: number,
  date: string,
  hasUpdated = true,
): Promise<void> {
  const cols = hasUpdated ? `created_at = $1, updated_at = $1` : `created_at = $1`;
  await ds.query(`UPDATE ${table} SET ${cols} WHERE id = $2`, [`${date}T03:00:00.000Z`, id]);
}

export async function seedDemo(ds: DataSource): Promise<void> {
  // Baseline first: 3 departments and the 3 login accounts (password Password123)
  await seedBaseline(ds);

  // Departments, up to 6
  const deptRepo = ds.getRepository(Department);
  await deptRepo.save(EXTRA_DEPARTMENTS.map((name) => ({ name })));
  const allDepts = await deptRepo.find();
  const deptId = new Map(allDepts.map((d) => [d.name, d.id]));

  // Users, up to 15
  const userRepo = ds.getRepository(User);
  const password = await bcrypt.hash('Password123', 10);
  await userRepo.save(
    EXTRA_USERS.map((u) => ({
      email: u.email,
      passwordHash: password,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      departmentId: deptId.get(u.dept)!,
    })),
  );

  // Vendor categories
  const catRepo = ds.getRepository(VendorCategory);
  await catRepo.save(VENDOR_CATEGORIES.map((name) => ({ name })));
  const allCats = await catRepo.find();
  const catByName = new Map(allCats.map((c) => [c.name, c]));

  // Vendors + category mapping; ratingAvg is filled in once the ratings are seeded
  const vendorRepo = ds.getRepository(Vendor);
  await vendorRepo.save(
    VENDORS.map((v) => ({
      name: v.name,
      taxId: v.taxId,
      email: v.email,
      phone: v.phone,
      isBlacklisted: v.isBlacklisted ?? false,
      blacklistReason: v.blacklistReason ?? null,
      ratingAvg: null,
      categories: v.categories.map((c) => catByName.get(c)!),
    })),
  );

  // Budgets (6 departments x 5 periods); reserved/used are reconciled at the end
  const budgetRepo = ds.getRepository(Budget);
  const budgetRows: Array<Partial<Budget>> = [];
  for (const d of allDepts) {
    for (const p of BUDGET_PERIODS) {
      budgetRows.push({
        departmentId: d.id,
        fiscalYear: p.fy,
        quarter: p.quarter,
        totalAmount: budgetTotalFor(d.name, p.fy, p.quarter),
        reservedAmount: 0,
        usedAmount: 0,
      });
    }
  }
  await budgetRepo.save(budgetRows);

  // Lookups: requester = first EMPLOYEE of the dept, approver = first MANAGER, creator = procurement
  const allUsers = await userRepo.find();
  const empByDept = new Map<number, number>();
  const mgrByDept = new Map<number, number>();
  let procurementId = 0;
  for (const u of allUsers) {
    if (u.departmentId == null) continue;
    if (u.role === UserRole.EMPLOYEE && !empByDept.has(u.departmentId))
      empByDept.set(u.departmentId, u.id);
    if (u.role === UserRole.MANAGER && !mgrByDept.has(u.departmentId))
      mgrByDept.set(u.departmentId, u.id);
    if (u.role === UserRole.PROCUREMENT_OFFICER && !procurementId) procurementId = u.id;
  }

  const vendors = await vendorRepo.find({ order: { id: 'ASC' } }); // index ตรงกับ VENDORS
  const prRepo = ds.getRepository(PurchaseRequest);
  const poRepo = ds.getRepository(PurchaseOrder);
  const grnRepo = ds.getRepository(GoodsReceiptNote);
  const poItemRepo = ds.getRepository(PurchaseOrderItem);
  const ratingRepo = ds.getRepository(VendorRating);

  // Running-number counters, keyed by prefix and year
  const seq: Record<string, number> = {};
  const nextNo = (prefix: string, year: number): string => {
    const key = `${prefix}-${year}`;
    seq[key] = (seq[key] ?? 0) + 1;
    return formatRunningNumber(prefix as 'PR' | 'PO' | 'GRN', year, seq[key]);
  };

  // Contributions per budget row (key: deptId|fy|quarter), replayed after all scenarios are built
  type Contribution = {
    kind: 'reserve' | 'active' | 'completed' | 'cancelled';
    est: number;
    poTotal: number;
  };
  const contribByBudget = new Map<string, Contribution[]>();
  const ratingsToAvg = new Map<number, number[]>(); // vendorId → scores

  for (const sc of PR_SCENARIOS) {
    const dId = deptId.get(sc.dept)!;
    const requesterId = empByDept.get(dId) ?? mgrByDept.get(dId)!;
    const createdAt = quarterDate(sc.fy, sc.quarter, 0);

    // ----- build PR -----
    const prItems = sc.lines.map((l) =>
      prRepo.manager.create(PurchaseRequestItem, {
        itemName: CATALOG[l.item].name,
        description: undefined,
        quantity: l.qty,
        unit: CATALOG[l.item].unit,
        estimatedUnitPrice: CATALOG[l.item].price,
        estimatedTotalPrice: itemTotal(l.qty, CATALOG[l.item].price),
      }),
    );
    const est = sumMoney(prItems.map((i) => i.estimatedTotalPrice));
    const isApproved = sc.status === PrStatus.APPROVED;
    const pr = await prRepo.save(
      prRepo.create({
        prNumber: nextNo('PR', sc.fy),
        requesterId,
        departmentId: dId,
        title: sc.title,
        status: sc.status,
        requiredDate: quarterDate(sc.fy, sc.quarter, 30),
        quarter: sc.quarter,
        totalEstimatedAmount: est,
        approvedBy: isApproved ? mgrByDept.get(dId)! : undefined,
        approvedAt: isApproved
          ? new Date(`${quarterDate(sc.fy, sc.quarter, 3)}T03:00:00.000Z`)
          : undefined,
        fiscalYear: isApproved ? sc.fy : undefined,
        rejectReason: sc.status === PrStatus.REJECTED ? sc.rejectReason! : undefined,
        items: prItems,
      }),
    );
    await backdate(ds, 'purchase_requests', pr.id, createdAt);

    if (!sc.po) {
      if (isApproved) {
        // Approved without a PO → the estimate stays reserved
        pushContrib(contribByBudget, dId, sc.fy, sc.quarter, {
          kind: 'reserve',
          est,
          poTotal: 0,
        });
      }
      continue;
    }

    // PO totals equal the PR estimate, which keeps the budget reconciliation straightforward
    const poItems = sc.lines.map((l) =>
      poRepo.manager.create(PurchaseOrderItem, {
        prItemId: undefined,
        itemName: CATALOG[l.item].name,
        quantity: l.qty,
        unit: CATALOG[l.item].unit,
        unitPrice: CATALOG[l.item].price,
        totalPrice: itemTotal(l.qty, CATALOG[l.item].price),
        receivedQuantity: 0,
      }),
    );
    const poTotal = sumMoney(poItems.map((i) => i.totalPrice));
    const po = await poRepo.save(
      poRepo.create({
        poNumber: nextNo('PO', sc.fy),
        prId: pr.id,
        vendorId: vendors[sc.po.vendor].id,
        createdBy: procurementId,
        status: sc.po.status,
        totalAmount: poTotal,
        expectedDeliveryDate: quarterDate(sc.fy, sc.quarter, 45),
        notes: undefined,
        items: poItems,
      }),
    );
    await backdate(ds, 'purchase_orders', po.id, quarterDate(sc.fy, sc.quarter, 5));
    const savedPoItems = await poItemRepo.find({
      where: { poId: po.id },
      order: { id: 'ASC' },
    });

    // Budget contribution depends on the PO status
    if (sc.po.status === PoStatus.COMPLETED) {
      pushContrib(contribByBudget, dId, sc.fy, sc.quarter, {
        kind: 'completed',
        est,
        poTotal,
      });
    } else if (sc.po.status === PoStatus.CANCELLED) {
      pushContrib(contribByBudget, dId, sc.fy, sc.quarter, {
        kind: 'cancelled',
        est,
        poTotal,
      });
    } else {
      pushContrib(contribByBudget, dId, sc.fy, sc.quarter, {
        kind: 'active',
        est,
        poTotal,
      });
    }

    await seedReceipts(ds, grnRepo, poItemRepo, savedPoItems, po, sc, nextNo);

    // Only completed POs can be rated
    if (sc.po.status === PoStatus.COMPLETED && sc.po.rating != null) {
      await ratingRepo.save(
        ratingRepo.create({
          vendorId: po.vendorId,
          poId: po.id,
          score: sc.po.rating,
          comment: `ประเมินจาก ${po.poNumber}`,
          ratedBy: procurementId,
        }),
      );
      const arr = ratingsToAvg.get(po.vendorId) ?? [];
      arr.push(sc.po.rating);
      ratingsToAvg.set(po.vendorId, arr);
    }
  }

  // Replay each budget row's lifecycle through budget-math so the seed matches what the app would store
  const allBudgets = await budgetRepo.find();
  const budgetByKey = new Map(
    allBudgets.map((b) => [`${b.departmentId}|${b.fiscalYear}|${b.quarter}`, b]),
  );
  for (const [key, contribs] of contribByBudget) {
    let reserved = 0;
    let used = 0;
    for (const c of contribs) {
      if (c.kind === 'reserve') {
        reserved = applyReserve(reserved, c.est);
      } else if (c.kind === 'active') {
        reserved = applyReserve(reserved, c.est);
        reserved = applyAdjust(reserved, round2(c.poTotal - c.est));
      } else if (c.kind === 'completed') {
        reserved = applyReserve(reserved, c.est);
        reserved = applyAdjust(reserved, round2(c.poTotal - c.est));
        ({ reserved, used } = applyConsume(reserved, used, c.poTotal, c.poTotal));
      } else if (c.kind === 'cancelled') {
        reserved = applyReserve(reserved, c.est);
        reserved = applyAdjust(reserved, round2(c.poTotal - c.est));
        reserved = applyRelease(reserved, c.poTotal);
      }
    }
    const b = budgetByKey.get(key);
    if (b)
      await budgetRepo.update(b.id, {
        reservedAmount: reserved,
        usedAmount: used,
      });
  }

  for (const [vendorId, scores] of ratingsToAvg) {
    const avg = round2(scores.reduce((s, n) => s + n, 0) / scores.length);
    await vendorRepo.update(vendorId, { ratingAvg: avg });
  }

  await ds.getRepository(Announcement).save(ANNOUNCEMENTS);
}

function pushContrib(
  map: Map<
    string,
    Array<{
      kind: 'reserve' | 'active' | 'completed' | 'cancelled';
      est: number;
      poTotal: number;
    }>
  >,
  deptId: number,
  fy: number,
  quarter: number,
  c: {
    kind: 'reserve' | 'active' | 'completed' | 'cancelled';
    est: number;
    poTotal: number;
  },
): void {
  const key = `${deptId}|${fy}|${quarter}`;
  const arr = map.get(key) ?? [];
  arr.push(c);
  map.set(key, arr);
}

// Build the GRNs a scenario asks for: full receipt, 60% partial, split across two notes, or a damaged line
async function seedReceipts(
  ds: DataSource,
  grnRepo: Repository<GoodsReceiptNote>,
  poItemRepo: Repository<any>,
  poItems: PurchaseOrderItem[],
  po: PurchaseOrder,
  sc: PrScenario,
  nextNo: (prefix: string, year: number) => string,
): Promise<void> {
  const receivedDate = quarterDate(sc.fy, sc.quarter, 20);
  const saveGrn = async (status: GrnStatus, items: Array<Partial<GoodsReceiptItem>>) => {
    const grn = await grnRepo.save(
      grnRepo.create({
        grnNumber: nextNo('GRN', sc.fy),
        poId: po.id,
        receivedBy: po.createdBy,
        receivedDate,
        status,
        notes: null,
        items: items.map((i) => grnRepo.manager.create(GoodsReceiptItem, i)),
      }),
    );
    await backdate(ds, 'goods_receipt_notes', grn.id, quarterDate(sc.fy, sc.quarter, 22), false);
  };

  if (po.status === PoStatus.COMPLETED) {
    if (sc.po!.splitGrn) {
      const firstHalf = poItems.map((pi) => ({
        poItemId: pi.id,
        receivedQuantity: Math.floor(Number(pi.quantity) / 2),
        condition: ItemCondition.GOOD,
      }));
      await saveGrn(GrnStatus.PARTIAL, firstHalf);
      const secondHalf = poItems.map((pi) => ({
        poItemId: pi.id,
        receivedQuantity: Number(pi.quantity) - Math.floor(Number(pi.quantity) / 2),
        condition: ItemCondition.GOOD,
      }));
      await saveGrn(GrnStatus.COMPLETE, secondHalf);
    } else {
      await saveGrn(
        GrnStatus.COMPLETE,
        poItems.map((pi) => ({
          poItemId: pi.id,
          receivedQuantity: Number(pi.quantity),
          condition: ItemCondition.GOOD,
        })),
      );
    }
    for (const pi of poItems) {
      await poItemRepo.update(pi.id, { receivedQuantity: Number(pi.quantity) });
    }
  } else if (po.status === PoStatus.PARTIALLY_RECEIVED) {
    const items: Array<Partial<GoodsReceiptItem>> = [];
    for (const pi of poItems) {
      const good = Math.max(1, Math.round(Number(pi.quantity) * 0.6));
      items.push({
        poItemId: pi.id,
        receivedQuantity: good,
        condition: ItemCondition.GOOD,
      });
      await poItemRepo.update(pi.id, { receivedQuantity: good });
    }
    if (sc.po!.damaged) {
      items.push({
        poItemId: poItems[0].id,
        receivedQuantity: 5,
        condition: ItemCondition.DAMAGED,
      });
    }
    await saveGrn(GrnStatus.PARTIAL, items);
  }
}

// Re-derive budgets, ratings and invariants by aggregation — a different path from the replay in
// seedDemo — and throw on any mismatch, so `npm run seed:demo` exits 1.
export async function verifyDemoSeed(ds: DataSource): Promise<void> {
  const fail = (msg: string): never => {
    throw new Error(`verifyDemoSeed FAILED: ${msg}`);
  };

  const prs = await ds.getRepository(PurchaseRequest).find();
  const pos = await ds.getRepository(PurchaseOrder).find();
  const budgets = await ds.getRepository(Budget).find();
  const vendors = await ds.getRepository(Vendor).find();
  const ratings = await ds.getRepository(VendorRating).find();
  const grns = await ds.getRepository(GoodsReceiptNote).find();

  const posByPr = new Map<number, PurchaseOrder[]>();
  for (const po of pos) {
    const arr = posByPr.get(po.prId) ?? [];
    arr.push(po);
    posByPr.set(po.prId, arr);
  }
  const ACTIVE = new Set<PoStatus>([
    PoStatus.DRAFT,
    PoStatus.SENT,
    PoStatus.ACKNOWLEDGED,
    PoStatus.PARTIALLY_RECEIVED,
  ]);

  // Topology first: the budget check below uses find(), which assumes a PR has at most one
  // non-cancelled PO (guaranteed by UQ_active_po_per_pr, re-checked here)
  for (const [prId, prPos] of posByPr) {
    if (prPos.filter((p) => p.status !== PoStatus.CANCELLED).length > 1) {
      fail(`PR ${prId} has >1 non-cancelled PO`);
    }
  }
  const grnPoIds = new Set(grns.filter((g) => g.status === GrnStatus.COMPLETE).map((g) => g.poId));
  for (const po of pos) {
    if (po.status === PoStatus.COMPLETED && !grnPoIds.has(po.id)) {
      fail(`completed PO ${po.id} has no COMPLETE GRN`);
    }
  }
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  for (const po of pos) {
    if (ACTIVE.has(po.status) && vendorById.get(po.vendorId)?.isBlacklisted) {
      fail(`blacklisted vendor ${po.vendorId} has active PO ${po.id}`);
    }
  }

  // Reserved/used derived by classifying each PR/PO. Every catalog amount is a whole number, so this
  // sum matches the replay exactly; fractional prices would need a tolerance-based comparison.
  const reservedBy = new Map<string, number>();
  const usedBy = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) =>
    m.set(k, round2((m.get(k) ?? 0) + v));
  for (const pr of prs) {
    if (pr.status !== PrStatus.APPROVED) continue;
    const key = `${pr.departmentId}|${pr.fiscalYear}|${pr.quarter}`;
    const prPos = posByPr.get(pr.id) ?? [];
    const completed = prPos.find((p) => p.status === PoStatus.COMPLETED);
    const active = prPos.find((p) => ACTIVE.has(p.status));
    if (completed) add(usedBy, key, Number(completed.totalAmount));
    else if (active) add(reservedBy, key, Number(active.totalAmount));
    else if (prPos.length === 0) add(reservedBy, key, Number(pr.totalEstimatedAmount));
    // anything left has only cancelled POs → contributes 0
  }
  // Every contributing key must have a real budget row: seedDemo drops unmatched keys silently, which
  // would leave nothing to compare here (a false negative).
  const budgetKeys = new Set(budgets.map((b) => `${b.departmentId}|${b.fiscalYear}|${b.quarter}`));
  for (const key of reservedBy.keys()) {
    if (!budgetKeys.has(key)) fail(`approved PR reserves budget ${key} but no budget row exists`);
  }
  for (const key of usedBy.keys()) {
    if (!budgetKeys.has(key)) fail(`approved PR uses budget ${key} but no budget row exists`);
  }
  for (const b of budgets) {
    const key = `${b.departmentId}|${b.fiscalYear}|${b.quarter}`;
    const expReserved = round2(reservedBy.get(key) ?? 0);
    const expUsed = round2(usedBy.get(key) ?? 0);
    if (round2(Number(b.reservedAmount)) !== expReserved) {
      fail(`budget ${key} reserved=${b.reservedAmount} expected ${expReserved}`);
    }
    if (round2(Number(b.usedAmount)) !== expUsed) {
      fail(`budget ${key} used=${b.usedAmount} expected ${expUsed}`);
    }
    if (Number(b.reservedAmount) + Number(b.usedAmount) > Number(b.totalAmount)) {
      fail(
        `budget ${key} committed > total (${b.reservedAmount}+${b.usedAmount} > ${b.totalAmount})`,
      );
    }
  }

  // 3) vendor.ratingAvg
  const scoresByVendor = new Map<number, number[]>();
  for (const r of ratings) {
    const arr = scoresByVendor.get(r.vendorId) ?? [];
    arr.push(r.score);
    scoresByVendor.set(r.vendorId, arr);
  }
  for (const v of vendors) {
    const scores = scoresByVendor.get(v.id);
    const exp = scores ? round2(scores.reduce((s, n) => s + n, 0) / scores.length) : null;
    const actual = v.ratingAvg == null ? null : round2(Number(v.ratingAvg));
    if (exp !== actual) fail(`vendor ${v.id} ratingAvg=${actual} expected ${exp}`);
  }

  const announcements = await ds.getRepository(Announcement).find();
  if (announcements.length !== 5) fail(`announcements=${announcements.length} expected 5`);

  console.log(
    `✓ verify ok — budgets:${budgets.length} vendors-rated:${scoresByVendor.size} ` +
      `PR:${prs.length} PO:${pos.length} GRN:${grns.length} ratings:${ratings.length} ` +
      `announcements:${announcements.length}`,
  );
}

// CLI for `npm run seed:demo`: guard → migrate → truncate → seed → verify → destroy
if (require.main === module) {
  void (async () => {
    if (process.env.DB_NAME === 'procurement_test_db') {
      throw new Error(
        `seed:demo refused: DB_NAME='${process.env.DB_NAME}' is the e2e test DB. ` +
          `Aborting to protect e2e isolation.`,
      );
    }
    await AppDataSource.initialize();
    await AppDataSource.runMigrations(); // idempotent — กันกรณี schema ยังไม่ migrate
    await truncateAllTables(AppDataSource);
    await seedDemo(AppDataSource);
    await verifyDemoSeed(AppDataSource); // ← เพิ่ม
    console.log('✓ Demo seed complete + verified');
    await AppDataSource.destroy();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
