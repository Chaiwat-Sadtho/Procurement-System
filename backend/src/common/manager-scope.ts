import { ForbiddenException } from '@nestjs/common';

// คืน departmentId ของ manager จาก auth payload (JwtStrategy.validate re-hydrate user จาก DB ทุก request
// → payload.departmentId สดเสมอ ไม่ต้อง re-load) · manager ต้องสังกัดแผนกเสมอ ไม่งั้น scope งานไม่ได้ → Forbidden.
// ใช้ร่วม row-level data-scoping ของ budgets / purchase-requests / users (กัน logic ซ้ำ 3 จุด)
export function requireManagerDepartmentId(user: { departmentId?: number | null }): number {
  if (user.departmentId == null) {
    throw new ForbiddenException('ผู้ใช้ระดับ manager ต้องสังกัดแผนก');
  }
  return user.departmentId;
}
