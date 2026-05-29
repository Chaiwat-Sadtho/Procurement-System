import { UserRole } from '../users/entities/user.entity';

// ====== Departments ======
// baseline (seedBaseline) สร้าง 3 ตัวแล้ว: Engineering(1) / Finance(2) / Operations(3)
export const EXTRA_DEPARTMENTS = ['IT', 'Marketing', 'HR'] as const; // → ids 4,5,6 หลัง RESTART IDENTITY

// ====== Users (เพิ่มจาก baseline 3) ======
// baseline: employee@(EMPLOYEE,Engineering) / manager@(MANAGER,Engineering) / procurement@(PROCUREMENT_OFFICER,Operations)
// กติกา: ทุก dept ต้องมี MANAGER ≥1 (อนุมัติ PR) + EMPLOYEE ≥1 (เป็น requester)
export interface DemoUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  dept: string; // ชื่อ dept (ตรงกับ EXTRA_DEPARTMENTS หรือ baseline)
}
export const EXTRA_USERS: DemoUser[] = [
  { email: 'finance.manager@company.com', firstName: 'ปรีชา', lastName: 'การเงิน', role: UserRole.MANAGER, dept: 'Finance' },
  { email: 'ops.manager@company.com', firstName: 'สุดา', lastName: 'ปฏิบัติการ', role: UserRole.MANAGER, dept: 'Operations' },
  { email: 'it.manager@company.com', firstName: 'ธนา', lastName: 'เทคโน', role: UserRole.MANAGER, dept: 'IT' },
  { email: 'mkt.manager@company.com', firstName: 'วรรณา', lastName: 'การตลาด', role: UserRole.MANAGER, dept: 'Marketing' },
  { email: 'hr.manager@company.com', firstName: 'นภา', lastName: 'บุคคล', role: UserRole.MANAGER, dept: 'HR' },
  { email: 'finance.staff@company.com', firstName: 'อนุชา', lastName: 'บัญชี', role: UserRole.EMPLOYEE, dept: 'Finance' },
  { email: 'ops.staff@company.com', firstName: 'มานพ', lastName: 'คลังสินค้า', role: UserRole.EMPLOYEE, dept: 'Operations' },
  { email: 'it.staff@company.com', firstName: 'กิตติ', lastName: 'ระบบ', role: UserRole.EMPLOYEE, dept: 'IT' },
  { email: 'it.support@company.com', firstName: 'พรเทพ', lastName: 'สนับสนุน', role: UserRole.EMPLOYEE, dept: 'IT' },
  { email: 'mkt.staff@company.com', firstName: 'ชนิดา', lastName: 'โฆษณา', role: UserRole.EMPLOYEE, dept: 'Marketing' },
  { email: 'hr.staff@company.com', firstName: 'รัตนา', lastName: 'สรรหา', role: UserRole.EMPLOYEE, dept: 'HR' },
  { email: 'procurement2@company.com', firstName: 'สมศักดิ์', lastName: 'จัดหา', role: UserRole.PROCUREMENT_OFFICER, dept: 'Engineering' },
];
// รวม 15: managers 6 (Eng baseline + 5) / employees 7 (Eng baseline + 6) / procurement 2 (Ops baseline + 1)

// ====== Vendor categories (6) ======
export const VENDOR_CATEGORIES = [
  'IT Equipment', 'Office Supplies', 'Furniture', 'Services', 'Raw Materials', 'Logistics',
] as const;

// ====== Vendors (20; index 18,19 = blacklisted) ======
export interface DemoVendor {
  name: string;
  taxId: string;
  email: string;
  phone: string;
  categories: string[];
  isBlacklisted?: boolean;
  blacklistReason?: string;
}
export const VENDORS: DemoVendor[] = [
  { name: 'บริษัท ไอทีซัพพลาย จำกัด', taxId: '0105560000001', email: 'sales@itsupply.co.th', phone: '021000001', categories: ['IT Equipment'] },
  { name: 'บริษัท เมกะคอม จำกัด', taxId: '0105560000002', email: 'info@megacom.co.th', phone: '021000002', categories: ['IT Equipment'] },
  { name: 'บริษัท เน็ตเวิร์คโปร จำกัด', taxId: '0105560000003', email: 'sales@netpro.co.th', phone: '021000003', categories: ['IT Equipment', 'Services'] },
  { name: 'ห้างหุ้นส่วน ออฟฟิศมาร์ท', taxId: '0105560000004', email: 'order@officemart.co.th', phone: '021000004', categories: ['Office Supplies'] },
  { name: 'บริษัท เปเปอร์พลัส จำกัด', taxId: '0105560000005', email: 'sale@paperplus.co.th', phone: '021000005', categories: ['Office Supplies'] },
  { name: 'บริษัท เฟอร์นิเจอร์ดีไซน์ จำกัด', taxId: '0105560000006', email: 'contact@furnidesign.co.th', phone: '021000006', categories: ['Furniture'] },
  { name: 'บริษัท โมเดิร์นเฟอร์นิ จำกัด', taxId: '0105560000007', email: 'sale@modernfurni.co.th', phone: '021000007', categories: ['Furniture'] },
  { name: 'บริษัท คลีนเซอร์วิส จำกัด', taxId: '0105560000008', email: 'hello@cleanservice.co.th', phone: '021000008', categories: ['Services'] },
  { name: 'บริษัท เมนเทนแนนซ์โปร จำกัด', taxId: '0105560000009', email: 'support@maintpro.co.th', phone: '021000009', categories: ['Services'] },
  { name: 'บริษัท วัตถุดิบไทย จำกัด', taxId: '0105560000010', email: 'order@rawthai.co.th', phone: '021000010', categories: ['Raw Materials'] },
  { name: 'บริษัท สตีลแอนด์โค จำกัด', taxId: '0105560000011', email: 'sales@steelco.co.th', phone: '021000011', categories: ['Raw Materials'] },
  { name: 'บริษัท ขนส่งเร็วทันใจ จำกัด', taxId: '0105560000012', email: 'book@fastlogistics.co.th', phone: '021000012', categories: ['Logistics'] },
  { name: 'บริษัท โลจิสติกส์พลัส จำกัด', taxId: '0105560000013', email: 'cs@logisticsplus.co.th', phone: '021000013', categories: ['Logistics'] },
  { name: 'บริษัท ดิจิทัลโซลูชั่น จำกัด', taxId: '0105560000014', email: 'sale@digitalsol.co.th', phone: '021000014', categories: ['IT Equipment', 'Services'] },
  { name: 'บริษัท สมาร์ทออฟฟิศ จำกัด', taxId: '0105560000015', email: 'info@smartoffice.co.th', phone: '021000015', categories: ['Office Supplies', 'Furniture'] },
  { name: 'บริษัท พรีเมียมซัพพลาย จำกัด', taxId: '0105560000016', email: 'sales@premiumsupply.co.th', phone: '021000016', categories: ['Raw Materials', 'Logistics'] },
  { name: 'บริษัท เทคโนเทรด จำกัด', taxId: '0105560000017', email: 'contact@technotrade.co.th', phone: '021000017', categories: ['IT Equipment'] },
  { name: 'บริษัท ออลอินวัน จำกัด', taxId: '0105560000018', email: 'sale@allinone.co.th', phone: '021000018', categories: ['Office Supplies', 'Services'] },
  { name: 'บริษัท เก่าเล่าราคา จำกัด', taxId: '0105560000019', email: 'x@oldprice.co.th', phone: '021000019', categories: ['Raw Materials'], isBlacklisted: true, blacklistReason: 'ส่งของไม่ตรงสเปคซ้ำหลายครั้ง + เอกสารภาษีไม่ถูกต้อง' },
  { name: 'บริษัท ดีเลย์ตลอด จำกัด', taxId: '0105560000020', email: 'x@alwayslate.co.th', phone: '021000020', categories: ['Logistics'], isBlacklisted: true, blacklistReason: 'ส่งของล่าช้าเกินกำหนดต่อเนื่อง กระทบไลน์ผลิต' },
];

// ====== Item catalog (สำหรับ gen line ของ PR/PO; ราคาตั้งให้คูณแล้วลงตัว) ======
export interface CatalogItem { name: string; unit: string; price: number; }
export const CATALOG: CatalogItem[] = [
  { name: 'Laptop Dell Latitude', unit: 'เครื่อง', price: 25000 },   // 0
  { name: 'Monitor 27 inch', unit: 'จอ', price: 15000 },             // 1
  { name: 'Ergonomic Office Chair', unit: 'ตัว', price: 5000 },      // 2
  { name: 'A4 Paper (กล่อง)', unit: 'กล่อง', price: 1200 },          // 3
  { name: 'Laser Printer', unit: 'เครื่อง', price: 8000 },           // 4
  { name: 'Server Rack Unit', unit: 'ชุด', price: 120000 },          // 5
  { name: 'Network Switch 48-port', unit: 'เครื่อง', price: 45000 }, // 6
  { name: 'Steel Office Desk', unit: 'ตัว', price: 7500 },           // 7
  { name: 'Ballpoint Pen (กล่อง)', unit: 'กล่อง', price: 250 },      // 8
  { name: 'Software License (รายปี)', unit: 'สิทธิ์', price: 3500 }, // 9
  { name: 'Whiteboard', unit: 'แผ่น', price: 2200 },                 // 10
  { name: 'UPS 1500VA', unit: 'เครื่อง', price: 6500 },              // 11
];

// ====== Budget total ต่อ (dept|fy|quarter) ======
// default มากพอให้ committed ≤ total เสมอ; override 1 แถวให้เกิด budget warning (committed/total = 85%)
export const BUDGET_PERIODS: Array<{ fy: number; quarter: number }> = [
  { fy: 2025, quarter: 4 }, { fy: 2026, quarter: 1 }, { fy: 2026, quarter: 2 },
  { fy: 2026, quarter: 3 }, { fy: 2026, quarter: 4 },
];
const BUDGET_TOTAL_DEFAULT = 3_000_000;
const BUDGET_TOTAL_OVERRIDES: Record<string, number> = {
  'Engineering|2026|1': 1_000_000, // warning row: committed 850,000 / 1,000,000 = 85%
};
export function budgetTotalFor(deptName: string, fy: number, quarter: number): number {
  return BUDGET_TOTAL_OVERRIDES[`${deptName}|${fy}|${quarter}`] ?? BUDGET_TOTAL_DEFAULT;
}
