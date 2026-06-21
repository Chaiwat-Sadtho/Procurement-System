import { ForbiddenException } from '@nestjs/common';
import { requireManagerDepartmentId } from '@app/common/manager-scope';

describe('requireManagerDepartmentId', () => {
  it('returns the departmentId when the manager has one', () => {
    expect(requireManagerDepartmentId({ departmentId: 7 })).toBe(7);
  });

  it('throws ForbiddenException when the manager has no department', () => {
    expect(() => requireManagerDepartmentId({ departmentId: null })).toThrow(ForbiddenException);
  });
});
