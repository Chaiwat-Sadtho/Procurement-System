import { DataSource, Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { seedBaseline } from './seed';
import { truncateAllTables } from '../common/truncate';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { VendorCategory } from '../vendors/entities/vendor-category.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { Budget } from '../budgets/entities/budget.entity';
import {
  EXTRA_DEPARTMENTS, EXTRA_USERS, VENDOR_CATEGORIES, VENDORS,
  BUDGET_PERIODS, budgetTotalFor, CATALOG, PR_SCENARIOS, PrScenario,
} from './seed-demo-data';
import * as bcrypt from 'bcrypt';
import { itemTotal, sumMoney } from '../common/money';
import { applyReserve, applyAdjust, applyConsume, applyRelease, round2 } from '../common/budget-math';
import { formatRunningNumber } from '../common/running-number';
import { VendorRating } from '../vendors/entities/vendor-rating.entity';
import { PurchaseRequest, PrStatus } from '../purchase-requests/entities/purchase-request.entity';
import { PurchaseRequestItem } from '../purchase-requests/entities/purchase-request-item.entity';
import { PurchaseOrder, PoStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../purchase-orders/entities/purchase-order-item.entity';
import { GoodsReceiptNote, GrnStatus } from '../goods-receipts/entities/goods-receipt-note.entity';
import { GoodsReceiptItem, ItemCondition } from '../goods-receipts/entities/goods-receipt-item.entity';
import { UserRole } from '../users/entities/user.entity';

// วันที่กลางไตรมาส (fy=ปีปฏิทิน, quarter 1-4) — deterministic, คืน 'YYYY-MM-DD'
function quarterDate(fy: number, quarter: number, dayOffset = 0): string {
  const month = (quarter - 1) * 3 + 1; // Q1→Feb(index1) เป็นกลางไตรมาส
  const d = new Date(Date.UTC(fy, month, 15 + dayOffset));
  return d.toISOString().slice(0, 10);
}

// backdate created_at (+ updated_at ถ้ามี) ให้ time-series กราฟมีเรื่องราวข้ามปีงบ
// (@CreateDateColumn ถูก ORM เซ็ตเป็น now ตอน insert — ต้อง UPDATE ตรงหลังบันทึก)
async function backdate(ds: DataSource, table: string, id: number, date: string, hasUpdated = true): Promise<void> {
  const cols = hasUpdated ? `created_at = $1, updated_at = $1` : `created_at = $1`;
  await ds.query(`UPDATE ${table} SET ${cols} WHERE id = $2`, [`${date}T03:00:00.000Z`, id]);
}

export async function seedDemo(ds: DataSource): Promise<void> {
  // 1) baseline ก่อน (3 dept + 3 บัญชี login เดิม employee@/manager@/procurement@ pw Password123)
  await seedBaseline(ds);

  // 2) เพิ่ม department ให้ครบ 6
  const deptRepo = ds.getRepository(Department);
  await deptRepo.save(EXTRA_DEPARTMENTS.map((name) => ({ name })));
  const allDepts = await deptRepo.find();
  const deptId = new Map(allDepts.map((d) => [d.name, d.id]));

  // 3) เพิ่ม users ให้ครบ 15
  const userRepo = ds.getRepository(User);
  const password = await bcrypt.hash('Password123', 10);
  await userRepo.save(
    EXTRA_USERS.map((u) => ({
      email: u.email, passwordHash: password, firstName: u.firstName, lastName: u.lastName,
      role: u.role, departmentId: deptId.get(u.dept)!,
    })),
  );

  // 4) vendor categories (6)
  const catRepo = ds.getRepository(VendorCategory);
  await catRepo.save(VENDOR_CATEGORIES.map((name) => ({ name })));
  const allCats = await catRepo.find();
  const catByName = new Map(allCats.map((c) => [c.name, c]));

  // 5) vendors (20) + category mapping (M2M ผ่าน owning side) — ratingAvg เติมใน Task 4
  const vendorRepo = ds.getRepository(Vendor);
  await vendorRepo.save(
    VENDORS.map((v) => ({
      name: v.name, taxId: v.taxId, email: v.email, phone: v.phone,
      isBlacklisted: v.isBlacklisted ?? false, blacklistReason: v.blacklistReason ?? null,
      ratingAvg: null,
      categories: v.categories.map((c) => catByName.get(c)!),
    })),
  );

  // 6) budgets (6 dept × 5 period = 30) — reserved/used เติมใน Task 4
  const budgetRepo = ds.getRepository(Budget);
  const budgetRows: Array<Partial<Budget>> = [];
  for (const d of allDepts) {
    for (const p of BUDGET_PERIODS) {
      budgetRows.push({
        departmentId: d.id, fiscalYear: p.fy, quarter: p.quarter,
        totalAmount: budgetTotalFor(d.name, p.fy, p.quarter),
        reservedAmount: 0, usedAmount: 0,
      });
    }
  }
  await budgetRepo.save(budgetRows);

  // 7) เตรียม lookup users (requester=EMPLOYEE ใน dept, approver=MANAGER ใน dept, creator=PROCUREMENT_OFFICER)
  const allUsers = await userRepo.find();
  const empByDept = new Map<number, number>();      // deptId → userId (EMPLOYEE คนแรก)
  const mgrByDept = new Map<number, number>();      // deptId → userId (MANAGER คนแรก)
  let procurementId = 0;
  for (const u of allUsers) {
    if (u.departmentId == null) continue;
    if (u.role === UserRole.EMPLOYEE && !empByDept.has(u.departmentId)) empByDept.set(u.departmentId, u.id);
    if (u.role === UserRole.MANAGER && !mgrByDept.has(u.departmentId)) mgrByDept.set(u.departmentId, u.id);
    if (u.role === UserRole.PROCUREMENT_OFFICER && !procurementId) procurementId = u.id;
  }

  const vendors = await vendorRepo.find({ order: { id: 'ASC' } }); // index ตรงกับ VENDORS
  const prRepo = ds.getRepository(PurchaseRequest);
  const poRepo = ds.getRepository(PurchaseOrder);
  const grnRepo = ds.getRepository(GoodsReceiptNote);
  const poItemRepo = ds.getRepository(PurchaseOrderItem);
  const ratingRepo = ds.getRepository(VendorRating);

  // running-number counters ต่อ (prefix, year)
  const seq: Record<string, number> = {};
  const nextNo = (prefix: string, year: number): string => {
    const key = `${prefix}-${year}`;
    seq[key] = (seq[key] ?? 0) + 1;
    return formatRunningNumber(prefix as 'PR' | 'PO' | 'GRN', year, seq[key]);
  };

  // เก็บ contribution ต่อ budget row เพื่อ simulate ทีหลัง: key `deptId|fy|quarter`
  type Contribution = { kind: 'reserve' | 'active' | 'completed' | 'cancelled'; est: number; poTotal: number };
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
    const pr = (await prRepo.save(
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
        approvedAt: isApproved ? new Date(`${quarterDate(sc.fy, sc.quarter, 3)}T03:00:00.000Z`) : undefined,
        fiscalYear: isApproved ? sc.fy : undefined,
        rejectReason: sc.status === PrStatus.REJECTED ? sc.rejectReason! : undefined,
        items: prItems,
      }),
    )) as PurchaseRequest;
    await backdate(ds, 'purchase_requests', pr.id, createdAt);

    if (!sc.po) {
      if (isApproved) {
        // approved ไม่มี PO → reserved += est
        pushContrib(contribByBudget, dId, sc.fy, sc.quarter, { kind: 'reserve', est, poTotal: 0 });
      }
      continue;
    }

    // ----- build PO (total = est; priceFactor 1) -----
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
    const po = (await poRepo.save(
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
    )) as PurchaseOrder;
    await backdate(ds, 'purchase_orders', po.id, quarterDate(sc.fy, sc.quarter, 5));
    const savedPoItems = await poItemRepo.find({ where: { poId: po.id }, order: { id: 'ASC' } });

    // budget contribution ตามสถานะ PO
    if (sc.po.status === PoStatus.COMPLETED) {
      pushContrib(contribByBudget, dId, sc.fy, sc.quarter, { kind: 'completed', est, poTotal });
    } else if (sc.po.status === PoStatus.CANCELLED) {
      pushContrib(contribByBudget, dId, sc.fy, sc.quarter, { kind: 'cancelled', est, poTotal });
    } else {
      pushContrib(contribByBudget, dId, sc.fy, sc.quarter, { kind: 'active', est, poTotal });
    }

    // ----- GRN -----
    await seedReceipts(ds, grnRepo, poItemRepo, savedPoItems, po, sc, nextNo);

    // ----- rating (completed เท่านั้น + มี rating) -----
    if (sc.po.status === PoStatus.COMPLETED && sc.po.rating != null) {
      await ratingRepo.save(
        ratingRepo.create({
          vendorId: po.vendorId, poId: po.id, score: sc.po.rating,
          comment: `ประเมินจาก ${po.poNumber}`, ratedBy: procurementId,
        }),
      );
      const arr = ratingsToAvg.get(po.vendorId) ?? [];
      arr.push(sc.po.rating);
      ratingsToAvg.set(po.vendorId, arr);
    }
  }

  // 8) budget reconcile — simulate lifecycle ต่อ budget row ด้วย budget-math (ค่าตรงกับ app)
  const allBudgets = await budgetRepo.find();
  const budgetByKey = new Map(allBudgets.map((b) => [`${b.departmentId}|${b.fiscalYear}|${b.quarter}`, b]));
  for (const [key, contribs] of contribByBudget) {
    let reserved = 0;
    let used = 0;
    for (const c of contribs) {
      if (c.kind === 'reserve') {
        reserved = applyReserve(reserved, c.est);
      } else if (c.kind === 'active') {
        reserved = applyReserve(reserved, c.est);
        reserved = applyAdjust(reserved, round2(c.poTotal - c.est)); // delta (0 เมื่อ total=est)
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
    if (b) await budgetRepo.update(b.id, { reservedAmount: reserved, usedAmount: used });
  }

  // 9) vendor.ratingAvg = round2(avg(scores))
  for (const [vendorId, scores] of ratingsToAvg) {
    const avg = round2(scores.reduce((s, n) => s + n, 0) / scores.length);
    await vendorRepo.update(vendorId, { ratingAvg: avg });
  }
}

// push contribution helper (top-level, นอก seedDemo)
function pushContrib(
  map: Map<string, Array<{ kind: 'reserve' | 'active' | 'completed' | 'cancelled'; est: number; poTotal: number }>>,
  deptId: number, fy: number, quarter: number,
  c: { kind: 'reserve' | 'active' | 'completed' | 'cancelled'; est: number; poTotal: number },
): void {
  const key = `${deptId}|${fy}|${quarter}`;
  const arr = map.get(key) ?? [];
  arr.push(c);
  map.set(key, arr);
}

// สร้าง GRN ตามแผนรับของ (completed=รับครบ, partially_received=รับ 60%, splitGrn=2 ใบ, damaged=+1 item ชำรุด)
async function seedReceipts(
  ds: DataSource,
  grnRepo: Repository<any>,
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
        poItemId: pi.id, receivedQuantity: Math.floor(Number(pi.quantity) / 2), condition: ItemCondition.GOOD,
      }));
      await saveGrn(GrnStatus.PARTIAL, firstHalf);
      const secondHalf = poItems.map((pi) => ({
        poItemId: pi.id, receivedQuantity: Number(pi.quantity) - Math.floor(Number(pi.quantity) / 2), condition: ItemCondition.GOOD,
      }));
      await saveGrn(GrnStatus.COMPLETE, secondHalf);
    } else {
      await saveGrn(
        GrnStatus.COMPLETE,
        poItems.map((pi) => ({ poItemId: pi.id, receivedQuantity: Number(pi.quantity), condition: ItemCondition.GOOD })),
      );
    }
    for (const pi of poItems) {
      await poItemRepo.update(pi.id, { receivedQuantity: Number(pi.quantity) });
    }
  } else if (po.status === PoStatus.PARTIALLY_RECEIVED) {
    const items: Array<Partial<GoodsReceiptItem>> = [];
    for (const pi of poItems) {
      const good = Math.max(1, Math.round(Number(pi.quantity) * 0.6));
      items.push({ poItemId: pi.id, receivedQuantity: good, condition: ItemCondition.GOOD });
      await poItemRepo.update(pi.id, { receivedQuantity: good });
    }
    if (sc.po!.damaged) {
      items.push({ poItemId: poItems[0].id, receivedQuantity: 5, condition: ItemCondition.DAMAGED });
    }
    await saveGrn(GrnStatus.PARTIAL, items);
  }
}

// re-derive budget/rating/invariant แบบ aggregate อิสระ (คนละ path กับ simulation ใน seedDemo) แล้ว assert
// mismatch ใดๆ → throw (fail-fast: npm run seed:demo จะ exit 1)
export async function verifyDemoSeed(ds: DataSource): Promise<void> {
  const fail = (msg: string): never => { throw new Error(`verifyDemoSeed FAILED: ${msg}`); };

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
  const ACTIVE = new Set<PoStatus>([PoStatus.DRAFT, PoStatus.SENT, PoStatus.ACKNOWLEDGED, PoStatus.PARTIALLY_RECEIVED]);

  // 1) structural invariants — ตรวจ topology ก่อน reconcile งบ เพราะข้อ 2 ใช้ find() ที่สมมติว่า
  //    PR มี non-cancelled PO ได้ ≤1 ใบ (DB บังคับด้วย UQ_active_po_per_pr — ตรวจซ้ำชั้นสองที่นี่)
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

  // 2) budget reserved/used จากการ classify PR/PO (aggregate)
  // precondition: ทุกยอดเงินเป็นจำนวนเต็ม (CATALOG ราคา×จำนวน) → round2 เป็น no-op และ path นี้
  // (classify) บวกได้ค่าตรงกับ path replay ใน seedDemo เป๊ะ; ถ้าเพิ่มราคาทศนิยมต้องเทียบแบบ tolerance
  const reservedBy = new Map<string, number>();
  const usedBy = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, round2((m.get(k) ?? 0) + v));
  for (const pr of prs) {
    if (pr.status !== PrStatus.APPROVED) continue;
    const key = `${pr.departmentId}|${pr.fiscalYear}|${pr.quarter}`;
    const prPos = posByPr.get(pr.id) ?? [];
    const completed = prPos.find((p) => p.status === PoStatus.COMPLETED);
    const active = prPos.find((p) => ACTIVE.has(p.status));
    if (completed) add(usedBy, key, Number(completed.totalAmount));
    else if (active) add(reservedBy, key, Number(active.totalAmount));
    else if (prPos.length === 0) add(reservedBy, key, Number(pr.totalEstimatedAmount));
    // เหลือ: มีแต่ cancelled → 0
  }
  // ทุก key ที่มี contribution ต้องมี budget row จริง — กัน APPROVED PR ใน period ที่ไม่มีงบ
  // (seedDemo drop เงียบที่ `if (b)` แล้ว verify จะไม่มีอะไรไปเทียบ = false-negative)
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
      fail(`budget ${key} committed > total (${b.reservedAmount}+${b.usedAmount} > ${b.totalAmount})`);
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

  console.log(
    `✓ verify ok — budgets:${budgets.length} vendors-rated:${scoresByVendor.size} ` +
      `PR:${prs.length} PO:${pos.length} GRN:${grns.length} ratings:${ratings.length}`,
  );
}

// ====== CLI: `npm run seed:demo` ======
// guard → migrate → truncate → seedDemo → verifyDemoSeed → destroy
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
