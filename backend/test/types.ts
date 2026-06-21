// Shared response shapes for e2e tests.
//
// supertest types `res.body` as `any`, which trips the typed-lint rules
// (`no-unsafe-member-access`, `no-unsafe-assignment`, ...). We read each response
// through one typed local (`const body = res.body as XxxResponse`) so field access
// is type-checked and the suite stays lint-clean without relaxing rules.
//
// These mirror the serialized HTTP responses (after ClassSerializerInterceptor),
// not the entities — decimals/dates arrive as ISO strings and password fields are
// stripped. Fields are kept to what the tests actually read.

export interface UserResponse {
  id: number;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  fullName: string;
  role: string;
  departmentId: number | null;
}

export interface AuthResponse {
  access_token: string;
  user: UserResponse;
}

export interface IdResponse {
  id: number;
}

export interface DepartmentResponse {
  id: number;
  name: string;
}

export interface VendorCategoryResponse {
  id: number;
  name: string;
}

export interface VendorResponse {
  id: number;
  name: string;
  taxId: string;
  phone: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  ratingAvg: string | null;
  categories: VendorCategoryResponse[];
}

export interface PurchaseRequestItemResponse {
  id: number;
  itemName: string;
  quantity: number;
  estimatedUnitPrice: string;
}

export interface PurchaseRequestResponse {
  id: number;
  prNumber: string;
  title: string;
  status: string;
  departmentId: number | null;
  totalEstimatedAmount: string;
  items: PurchaseRequestItemResponse[];
  approvedAt: string | null;
  approvedBy: number | null;
  rejectReason: string | null;
}

export interface PurchaseOrderItemResponse {
  id: number;
  prItemId: number | null;
  unitPrice: string;
}

export interface PurchaseOrderResponse {
  id: number;
  poNumber: string;
  status: string;
  totalAmount: string;
  actualDeliveryDate: string | null;
  items: PurchaseOrderItemResponse[];
}

export interface GoodsReceiptNoteResponse {
  id: number;
  grnNumber: string;
  status: string;
}

export interface BudgetSummaryResponse {
  totalAmount: string;
  reservedAmount: string;
  usedAmount: string;
  remaining: number; // computed via Number() in getSummary, not an entity decimal column
}

export interface BudgetResponse {
  id: number;
  fiscalYear: number;
  quarter: number | null;
  reservedAmount: string;
}

export interface VendorRatingResponse {
  id: number;
  poId: number;
  vendorId: number;
  score: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AnnouncementResponse {
  id: number;
  title: string;
  detail: string;
  icon: string;
  isActive: boolean;
  isPinned: boolean;
}

export interface PublicAnnouncementResponse {
  id: number;
  title: string;
  detail: string;
  icon: string;
  isPinned: boolean;
}
