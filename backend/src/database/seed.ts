import { DeepPartial } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Department } from '../departments/entities/department.entity';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  const departmentRepo = AppDataSource.getRepository(Department);
  const userRepo = AppDataSource.getRepository(User);

  const departments = await departmentRepo.save([
    { name: 'Engineering' },
    { name: 'Finance' },
    { name: 'Operations' },
  ]);

  console.log('✓ Departments seeded');

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

  console.log('✓ Users seeded');
  console.log('\nTest accounts (password: Password123):');
  console.log('  employee@company.com    → role: employee');
  console.log('  manager@company.com     → role: manager');
  console.log('  procurement@company.com → role: procurement_officer');

  await AppDataSource.destroy();
}

seed().catch(console.error);
