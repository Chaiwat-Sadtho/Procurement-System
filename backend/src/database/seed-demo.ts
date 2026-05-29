import { DataSource } from 'typeorm';
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
  BUDGET_PERIODS, budgetTotalFor,
} from './seed-demo-data';
import * as bcrypt from 'bcrypt';

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
}

// ====== CLI: `npm run seed:demo` ======
// guard → migrate → truncate → seedDemo → (Task 5 จะเพิ่ม verifyDemoSeed) → destroy
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
    console.log('✓ Demo seed (master data) complete');
    await AppDataSource.destroy();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
