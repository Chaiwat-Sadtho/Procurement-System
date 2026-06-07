import { PoStatus } from '../../purchase-orders/entities/purchase-order.entity';

export interface BudgetTransactionDto {
  prId: number;
  prNumber: string;
  prTitle: string;
  requesterName: string; // requester.fullName (firstName+middleName+lastName)
  approvedAt: string | null; // ISO
  poId: number | null;
  poNumber: string | null;
  poStatus: PoStatus | null;
  amount: number; // ยอดที่ขยับงบก้อนนี้
  bucket: 'reserved' | 'used';
}
