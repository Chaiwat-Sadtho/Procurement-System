import { DataSource, DeepPartial } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Department } from '../departments/entities/department.entity';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

// The caller owns initialize/destroy (the e2e globalSetup reuses this)
export async function seedBaseline(ds: DataSource) {
  const departmentRepo = ds.getRepository(Department);
  const userRepo = ds.getRepository(User);

  const departments = await departmentRepo.save([
    { name: 'Engineering' },
    { name: 'Finance' },
    { name: 'Operations' },
  ]);

  const password = await bcrypt.hash('Password123', 10);
  const users: DeepPartial<User>[] = [
    {
      email: 'employee@company.com',
      passwordHash: password,
      firstName: 'สมชาย',
      middleName: 'กลาง',
      lastName: 'ใจดี',
      role: UserRole.EMPLOYEE,
      departmentId: departments[0].id,
    },
    {
      email: 'manager@company.com',
      passwordHash: password,
      firstName: 'สมหญิง',
      lastName: 'รักงาน',
      role: UserRole.MANAGER,
      departmentId: departments[0].id,
    },
    {
      email: 'procurement@company.com',
      passwordHash: password,
      firstName: 'วิชัย',
      lastName: 'จัดซื้อ',
      role: UserRole.PROCUREMENT_OFFICER,
      departmentId: departments[2].id,
    },
  ];
  await userRepo.save(users);
}

// CLI wrapper for `npm run seed`
if (require.main === module) {
  void (async () => {
    await AppDataSource.initialize();
    await seedBaseline(AppDataSource);
    console.log('✓ Seeded baseline (3 departments + 3 users)');
    console.log(
      'Test accounts (password: Password123): employee@ / manager@ / procurement@company.com',
    );
    await AppDataSource.destroy();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
