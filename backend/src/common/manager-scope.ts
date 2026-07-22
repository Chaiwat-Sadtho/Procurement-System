import { ForbiddenException } from '@nestjs/common';

// The manager's departmentId, taken from the auth payload (JwtStrategy re-hydrates it every request).
// A manager without a department cannot be scoped at all → Forbidden. Shared by budgets, PRs and users.
export function requireManagerDepartmentId(user: { departmentId?: number | null }): number {
  if (user.departmentId == null) {
    throw new ForbiddenException('ผู้ใช้ระดับ manager ต้องสังกัดแผนก');
  }
  return user.departmentId;
}
