import { UserRole } from '../users/entities/user.entity';
import { PrStatus } from '../purchase-requests/entities/purchase-request.entity';
import { PoStatus } from '../purchase-orders/entities/purchase-order.entity';
import { AnnouncementIcon } from '../announcements/entities/announcement.entity';

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
  {
    email: 'finance.manager@company.com',
    firstName: 'ปรีชา',
    lastName: 'การเงิน',
    role: UserRole.MANAGER,
    dept: 'Finance',
  },
  {
    email: 'ops.manager@company.com',
    firstName: 'สุดา',
    lastName: 'ปฏิบัติการ',
    role: UserRole.MANAGER,
    dept: 'Operations',
  },
  {
    email: 'it.manager@company.com',
    firstName: 'ธนา',
    lastName: 'เทคโน',
    role: UserRole.MANAGER,
    dept: 'IT',
  },
  {
    email: 'mkt.manager@company.com',
    firstName: 'วรรณา',
    lastName: 'การตลาด',
    role: UserRole.MANAGER,
    dept: 'Marketing',
  },
  {
    email: 'hr.manager@company.com',
    firstName: 'นภา',
    lastName: 'บุคคล',
    role: UserRole.MANAGER,
    dept: 'HR',
  },
  {
    email: 'finance.staff@company.com',
    firstName: 'อนุชา',
    lastName: 'บัญชี',
    role: UserRole.EMPLOYEE,
    dept: 'Finance',
  },
  {
    email: 'ops.staff@company.com',
    firstName: 'มานพ',
    lastName: 'คลังสินค้า',
    role: UserRole.EMPLOYEE,
    dept: 'Operations',
  },
  {
    email: 'it.staff@company.com',
    firstName: 'กิตติ',
    lastName: 'ระบบ',
    role: UserRole.EMPLOYEE,
    dept: 'IT',
  },
  {
    email: 'it.support@company.com',
    firstName: 'พรเทพ',
    lastName: 'สนับสนุน',
    role: UserRole.EMPLOYEE,
    dept: 'IT',
  },
  {
    email: 'mkt.staff@company.com',
    firstName: 'ชนิดา',
    lastName: 'โฆษณา',
    role: UserRole.EMPLOYEE,
    dept: 'Marketing',
  },
  {
    email: 'hr.staff@company.com',
    firstName: 'รัตนา',
    lastName: 'สรรหา',
    role: UserRole.EMPLOYEE,
    dept: 'HR',
  },
  {
    email: 'procurement2@company.com',
    firstName: 'สมศักดิ์',
    lastName: 'จัดหา',
    role: UserRole.PROCUREMENT_OFFICER,
    dept: 'Engineering',
  },
];
// รวม 15: managers 6 (Eng baseline + 5) / employees 7 (Eng baseline + 6) / procurement 2 (Ops baseline + 1)

// ====== Vendor categories (6) ======
export const VENDOR_CATEGORIES = [
  'IT Equipment',
  'Office Supplies',
  'Furniture',
  'Services',
  'Raw Materials',
  'Logistics',
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
  {
    name: 'บริษัท ไอทีซัพพลาย จำกัด',
    taxId: '0105560000001',
    email: 'sales@itsupply.co.th',
    phone: '021000001',
    categories: ['IT Equipment'],
  },
  {
    name: 'บริษัท เมกะคอม จำกัด',
    taxId: '0105560000002',
    email: 'info@megacom.co.th',
    phone: '021000002',
    categories: ['IT Equipment'],
  },
  {
    name: 'บริษัท เน็ตเวิร์คโปร จำกัด',
    taxId: '0105560000003',
    email: 'sales@netpro.co.th',
    phone: '021000003',
    categories: ['IT Equipment', 'Services'],
  },
  {
    name: 'ห้างหุ้นส่วน ออฟฟิศมาร์ท',
    taxId: '0105560000004',
    email: 'order@officemart.co.th',
    phone: '021000004',
    categories: ['Office Supplies'],
  },
  {
    name: 'บริษัท เปเปอร์พลัส จำกัด',
    taxId: '0105560000005',
    email: 'sale@paperplus.co.th',
    phone: '021000005',
    categories: ['Office Supplies'],
  },
  {
    name: 'บริษัท เฟอร์นิเจอร์ดีไซน์ จำกัด',
    taxId: '0105560000006',
    email: 'contact@furnidesign.co.th',
    phone: '021000006',
    categories: ['Furniture'],
  },
  {
    name: 'บริษัท โมเดิร์นเฟอร์นิ จำกัด',
    taxId: '0105560000007',
    email: 'sale@modernfurni.co.th',
    phone: '021000007',
    categories: ['Furniture'],
  },
  {
    name: 'บริษัท คลีนเซอร์วิส จำกัด',
    taxId: '0105560000008',
    email: 'hello@cleanservice.co.th',
    phone: '021000008',
    categories: ['Services'],
  },
  {
    name: 'บริษัท เมนเทนแนนซ์โปร จำกัด',
    taxId: '0105560000009',
    email: 'support@maintpro.co.th',
    phone: '021000009',
    categories: ['Services'],
  },
  {
    name: 'บริษัท วัตถุดิบไทย จำกัด',
    taxId: '0105560000010',
    email: 'order@rawthai.co.th',
    phone: '021000010',
    categories: ['Raw Materials'],
  },
  {
    name: 'บริษัท สตีลแอนด์โค จำกัด',
    taxId: '0105560000011',
    email: 'sales@steelco.co.th',
    phone: '021000011',
    categories: ['Raw Materials'],
  },
  {
    name: 'บริษัท ขนส่งเร็วทันใจ จำกัด',
    taxId: '0105560000012',
    email: 'book@fastlogistics.co.th',
    phone: '021000012',
    categories: ['Logistics'],
  },
  {
    name: 'บริษัท โลจิสติกส์พลัส จำกัด',
    taxId: '0105560000013',
    email: 'cs@logisticsplus.co.th',
    phone: '021000013',
    categories: ['Logistics'],
  },
  {
    name: 'บริษัท ดิจิทัลโซลูชั่น จำกัด',
    taxId: '0105560000014',
    email: 'sale@digitalsol.co.th',
    phone: '021000014',
    categories: ['IT Equipment', 'Services'],
  },
  {
    name: 'บริษัท สมาร์ทออฟฟิศ จำกัด',
    taxId: '0105560000015',
    email: 'info@smartoffice.co.th',
    phone: '021000015',
    categories: ['Office Supplies', 'Furniture'],
  },
  {
    name: 'บริษัท พรีเมียมซัพพลาย จำกัด',
    taxId: '0105560000016',
    email: 'sales@premiumsupply.co.th',
    phone: '021000016',
    categories: ['Raw Materials', 'Logistics'],
  },
  {
    name: 'บริษัท เทคโนเทรด จำกัด',
    taxId: '0105560000017',
    email: 'contact@technotrade.co.th',
    phone: '021000017',
    categories: ['IT Equipment'],
  },
  {
    name: 'บริษัท ออลอินวัน จำกัด',
    taxId: '0105560000018',
    email: 'sale@allinone.co.th',
    phone: '021000018',
    categories: ['Office Supplies', 'Services'],
  },
  {
    name: 'บริษัท เก่าเล่าราคา จำกัด',
    taxId: '0105560000019',
    email: 'x@oldprice.co.th',
    phone: '021000019',
    categories: ['Raw Materials'],
    isBlacklisted: true,
    blacklistReason: 'ส่งของไม่ตรงสเปคซ้ำหลายครั้ง + เอกสารภาษีไม่ถูกต้อง',
  },
  {
    name: 'บริษัท ดีเลย์ตลอด จำกัด',
    taxId: '0105560000020',
    email: 'x@alwayslate.co.th',
    phone: '021000020',
    categories: ['Logistics'],
    isBlacklisted: true,
    blacklistReason: 'ส่งของล่าช้าเกินกำหนดต่อเนื่อง กระทบไลน์ผลิต',
  },
];

// ====== Item catalog (สำหรับ gen line ของ PR/PO; ราคาตั้งให้คูณแล้วลงตัว) ======
export interface CatalogItem {
  name: string;
  unit: string;
  price: number;
}
export const CATALOG: CatalogItem[] = [
  { name: 'Laptop Dell Latitude', unit: 'เครื่อง', price: 25000 }, // 0
  { name: 'Monitor 27 inch', unit: 'จอ', price: 15000 }, // 1
  { name: 'Ergonomic Office Chair', unit: 'ตัว', price: 5000 }, // 2
  { name: 'A4 Paper (กล่อง)', unit: 'กล่อง', price: 1200 }, // 3
  { name: 'Laser Printer', unit: 'เครื่อง', price: 8000 }, // 4
  { name: 'Server Rack Unit', unit: 'ชุด', price: 120000 }, // 5
  { name: 'Network Switch 48-port', unit: 'เครื่อง', price: 45000 }, // 6
  { name: 'Steel Office Desk', unit: 'ตัว', price: 7500 }, // 7
  { name: 'Ballpoint Pen (กล่อง)', unit: 'กล่อง', price: 250 }, // 8
  { name: 'Software License (รายปี)', unit: 'สิทธิ์', price: 3500 }, // 9
  { name: 'Whiteboard', unit: 'แผ่น', price: 2200 }, // 10
  { name: 'UPS 1500VA', unit: 'เครื่อง', price: 6500 }, // 11
];

// ====== Budget total ต่อ (dept|fy|quarter) ======
// default มากพอให้ committed ≤ total เสมอ; override 1 แถวให้เกิด budget warning (committed/total = 85%)
export const BUDGET_PERIODS: Array<{ fy: number; quarter: number }> = [
  { fy: 2025, quarter: 4 },
  { fy: 2026, quarter: 1 },
  { fy: 2026, quarter: 2 },
  { fy: 2026, quarter: 3 },
  { fy: 2026, quarter: 4 },
];
const BUDGET_TOTAL_DEFAULT = 3_000_000;
const BUDGET_TOTAL_OVERRIDES: Record<string, number> = {
  'Engineering|2026|1': 1_000_000, // warning row: committed 850,000 / 1,000,000 = 85%
};
export function budgetTotalFor(deptName: string, fy: number, quarter: number): number {
  return BUDGET_TOTAL_OVERRIDES[`${deptName}|${fy}|${quarter}`] ?? BUDGET_TOTAL_DEFAULT;
}

export interface PoPlan {
  vendor: number; // index ใน VENDORS
  status: PoStatus; // DRAFT|SENT|ACKNOWLEDGED|PARTIALLY_RECEIVED|COMPLETED|CANCELLED
  splitGrn?: boolean; // completed: true = 2 GRN (partial→complete), false/undefined = 1 GRN complete
  damaged?: boolean; // partially_received: true = มี GRN item condition=damaged เพิ่ม
  rating?: number; // completed เท่านั้น: คะแนน 1-5 (ไม่ใส่ = ยังไม่ rate)
}
export interface PrScenario {
  dept: string;
  title: string;
  fy: number; // ปีของ running number + วันที่ (และ fiscalYear column เมื่อ approved)
  quarter: number; // 1-4 (PR.quarter เสมอ; PO/GRN ใช้ตามนี้)
  status: PrStatus; // DRAFT|SUBMITTED|REJECTED|APPROVED (เว้น UNDER_REVIEW — service ไม่มี transition เข้า)
  rejectReason?: string;
  lines: Array<{ item: number; qty: number }>; // index ใน CATALOG
  po?: PoPlan; // เฉพาะ status APPROVED
}

// 40 PR: draft 6 / submitted 7 / rejected 4 / approved 23
// approved 23 = no-PO 4 + active-PO 10 (draft2/sent3/ack2/partial3) + completed 7 + cancelled 2  → PO รวม 19
// PO.total = PR.est ทุกใบ (priceFactor 1 → reconciliation ตรงไปตรงมา)
export const PR_SCENARIOS: PrScenario[] = [
  // --- warning row: Engineering 2026 Q1, approved + active PO รวม 850,000 / total 1,000,000 = 85% ---
  {
    dept: 'Engineering',
    title: 'จัดซื้อโน้ตบุ๊กทีมพัฒนา',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 0, qty: 12 }],
    po: { vendor: 0, status: PoStatus.ACKNOWLEDGED },
  }, // 300,000
  {
    dept: 'Engineering',
    title: 'จัดซื้อจอมอนิเตอร์ 27 นิ้ว',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 1, qty: 20 }],
    po: { vendor: 1, status: PoStatus.SENT },
  }, // 300,000
  {
    dept: 'Engineering',
    title: 'จัดซื้อเก้าอี้สำนักงาน',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 2, qty: 50 }],
    po: { vendor: 2, status: PoStatus.PARTIALLY_RECEIVED },
  }, // 250,000

  // --- active PO ที่เหลือ (draft2/sent2/ack1/partial2) ---
  {
    dept: 'Finance',
    title: 'จัดซื้อเครื่องพิมพ์เลเซอร์',
    fy: 2025,
    quarter: 4,
    status: PrStatus.APPROVED,
    lines: [{ item: 4, qty: 5 }],
    po: { vendor: 3, status: PoStatus.DRAFT },
  }, // 40,000
  {
    dept: 'IT',
    title: 'จัดซื้อ Network Switch',
    fy: 2026,
    quarter: 2,
    status: PrStatus.APPROVED,
    lines: [{ item: 6, qty: 2 }],
    po: { vendor: 4, status: PoStatus.DRAFT },
  }, // 90,000
  {
    dept: 'Operations',
    title: 'จัดซื้อกระดาษ A4 สต๊อกไตรมาส',
    fy: 2025,
    quarter: 4,
    status: PrStatus.APPROVED,
    lines: [{ item: 3, qty: 30 }],
    po: { vendor: 5, status: PoStatus.SENT },
  }, // 36,000
  {
    dept: 'Marketing',
    title: 'ต่ออายุ Software License',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 9, qty: 40 }],
    po: { vendor: 6, status: PoStatus.SENT },
  }, // 140,000
  {
    dept: 'IT',
    title: 'จัดซื้อ UPS สำรองไฟห้อง server',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 11, qty: 20 }],
    po: { vendor: 7, status: PoStatus.ACKNOWLEDGED },
  }, // 130,000
  {
    dept: 'HR',
    title: 'จัดซื้อโต๊ะทำงานเหล็ก',
    fy: 2026,
    quarter: 2,
    status: PrStatus.APPROVED,
    lines: [{ item: 7, qty: 10 }],
    po: { vendor: 8, status: PoStatus.PARTIALLY_RECEIVED },
  }, // 75,000
  {
    dept: 'Operations',
    title: 'จัดซื้อเก้าอี้คลังสินค้า',
    fy: 2026,
    quarter: 2,
    status: PrStatus.APPROVED,
    lines: [{ item: 2, qty: 40 }],
    po: { vendor: 9, status: PoStatus.PARTIALLY_RECEIVED, damaged: true },
  }, // 200,000

  // --- completed PO (7) → used; rating 6 ใบ (เว้นใบ 17 ไม่ rate) ---
  {
    dept: 'Finance',
    title: 'จัดซื้อโน้ตบุ๊กฝ่ายบัญชี',
    fy: 2025,
    quarter: 4,
    status: PrStatus.APPROVED,
    lines: [{ item: 0, qty: 4 }],
    po: { vendor: 0, status: PoStatus.COMPLETED, rating: 5 },
  }, // 100,000
  {
    dept: 'Engineering',
    title: 'จัดซื้อ Server Rack',
    fy: 2025,
    quarter: 4,
    status: PrStatus.APPROVED,
    lines: [{ item: 5, qty: 1 }],
    po: { vendor: 1, status: PoStatus.COMPLETED, rating: 4 },
  }, // 120,000
  {
    dept: 'IT',
    title: 'จัดซื้อ Network Switch สำรอง',
    fy: 2025,
    quarter: 4,
    status: PrStatus.APPROVED,
    lines: [{ item: 6, qty: 3 }],
    po: { vendor: 2, status: PoStatus.COMPLETED, rating: 3 },
  }, // 135,000
  {
    dept: 'Operations',
    title: 'จัดซื้อกระดาษ A4 ปลายปี',
    fy: 2025,
    quarter: 4,
    status: PrStatus.APPROVED,
    lines: [{ item: 3, qty: 50 }],
    po: { vendor: 18, status: PoStatus.COMPLETED, rating: 5 },
  }, // 60,000 (vendor blacklisted ภายหลัง)
  {
    dept: 'Marketing',
    title: 'ต่ออายุ License ปลายปีงบ',
    fy: 2025,
    quarter: 4,
    status: PrStatus.APPROVED,
    lines: [{ item: 9, qty: 30 }],
    po: { vendor: 3, status: PoStatus.COMPLETED, rating: 2 },
  }, // 105,000
  {
    dept: 'HR',
    title: 'จัดซื้อโต๊ะทำงานพนักงานใหม่',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 7, qty: 8 }],
    po: { vendor: 0, status: PoStatus.COMPLETED, splitGrn: true, rating: 4 },
  }, // 60,000
  {
    dept: 'Finance',
    title: 'จัดซื้อเครื่องพิมพ์เพิ่ม',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 4, qty: 10 }],
    po: { vendor: 10, status: PoStatus.COMPLETED, splitGrn: true },
  }, // 80,000 (ยังไม่ rate)

  // --- cancelled PO (2) → reserved คืน 0 ---
  {
    dept: 'IT',
    title: 'จัดซื้อโน้ตบุ๊ก (ยกเลิกภายหลัง)',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 0, qty: 4 }],
    po: { vendor: 11, status: PoStatus.CANCELLED },
  }, // 100,000 → 0
  {
    dept: 'Marketing',
    title: 'จัดซื้อจอ (ยกเลิกเปลี่ยนสเปค)',
    fy: 2026,
    quarter: 2,
    status: PrStatus.APPROVED,
    lines: [{ item: 1, qty: 6 }],
    po: { vendor: 19, status: PoStatus.CANCELLED },
  }, // 90,000 → 0 (vendor blacklisted)

  // --- approved ไม่มี PO (4) → reserved += PR.est ---
  {
    dept: 'Engineering',
    title: 'จัดซื้อไวท์บอร์ดห้องประชุม',
    fy: 2026,
    quarter: 2,
    status: PrStatus.APPROVED,
    lines: [{ item: 10, qty: 10 }],
  }, // 22,000
  {
    dept: 'Finance',
    title: 'จัดซื้อปากกาสต๊อก',
    fy: 2026,
    quarter: 2,
    status: PrStatus.APPROVED,
    lines: [{ item: 8, qty: 20 }],
  }, // 5,000
  {
    dept: 'HR',
    title: 'จัดซื้อกระดาษ A4',
    fy: 2026,
    quarter: 1,
    status: PrStatus.APPROVED,
    lines: [{ item: 3, qty: 15 }],
  }, // 18,000
  {
    dept: 'IT',
    title: 'จัดซื้อ UPS เพิ่ม',
    fy: 2026,
    quarter: 2,
    status: PrStatus.APPROVED,
    lines: [{ item: 11, qty: 8 }],
  }, // 52,000

  // --- rejected (4) ---
  {
    dept: 'Operations',
    title: 'จัดซื้อ Server Rack เพิ่ม',
    fy: 2026,
    quarter: 1,
    status: PrStatus.REJECTED,
    rejectReason: 'เกินงบไตรมาส ให้ชะลอไปไตรมาสหน้า',
    lines: [{ item: 5, qty: 2 }],
  },
  {
    dept: 'Marketing',
    title: 'จัดซื้อโน้ตบุ๊กทีมครีเอทีฟ',
    fy: 2026,
    quarter: 1,
    status: PrStatus.REJECTED,
    rejectReason: 'เอกสารไม่ครบ ขาดใบเสนอราคาเปรียบเทียบ',
    lines: [{ item: 0, qty: 5 }],
  },
  {
    dept: 'HR',
    title: 'จัดซื้อโต๊ะเพิ่ม',
    fy: 2026,
    quarter: 2,
    status: PrStatus.REJECTED,
    rejectReason: 'ยังไม่จำเป็นเร่งด่วน เลื่อนไตรมาสหน้า',
    lines: [{ item: 7, qty: 4 }],
  },
  {
    dept: 'IT',
    title: 'จัดซื้อ Server Rack ทดแทน',
    fy: 2026,
    quarter: 2,
    status: PrStatus.REJECTED,
    rejectReason: 'ให้ใช้อุปกรณ์เดิมไปก่อน',
    lines: [{ item: 5, qty: 1 }],
  },

  // --- submitted (7) ---
  {
    dept: 'Engineering',
    title: 'จัดซื้อจอเพิ่มทีม QA',
    fy: 2026,
    quarter: 2,
    status: PrStatus.SUBMITTED,
    lines: [{ item: 1, qty: 10 }],
  },
  {
    dept: 'Finance',
    title: 'จัดซื้อกระดาษไตรมาสหน้า',
    fy: 2026,
    quarter: 2,
    status: PrStatus.SUBMITTED,
    lines: [{ item: 3, qty: 20 }],
  },
  {
    dept: 'Operations',
    title: 'จัดซื้อเครื่องพิมพ์คลัง',
    fy: 2026,
    quarter: 2,
    status: PrStatus.SUBMITTED,
    lines: [{ item: 4, qty: 6 }],
  },
  {
    dept: 'IT',
    title: 'จัดซื้อ Network Switch ชั้น 3',
    fy: 2026,
    quarter: 2,
    status: PrStatus.SUBMITTED,
    lines: [{ item: 6, qty: 1 }],
  },
  {
    dept: 'Marketing',
    title: 'ต่ออายุ License ทีมดีไซน์',
    fy: 2026,
    quarter: 2,
    status: PrStatus.SUBMITTED,
    lines: [{ item: 9, qty: 15 }],
  },
  {
    dept: 'HR',
    title: 'จัดซื้อเก้าอี้ห้องสัมภาษณ์',
    fy: 2026,
    quarter: 2,
    status: PrStatus.SUBMITTED,
    lines: [{ item: 2, qty: 8 }],
  },
  {
    dept: 'Engineering',
    title: 'จัดซื้อ UPS ห้อง Lab',
    fy: 2026,
    quarter: 2,
    status: PrStatus.SUBMITTED,
    lines: [{ item: 11, qty: 12 }],
  },

  // --- draft (6) ---
  {
    dept: 'Engineering',
    title: 'ร่าง: ปากกาทีม',
    fy: 2026,
    quarter: 2,
    status: PrStatus.DRAFT,
    lines: [{ item: 8, qty: 30 }],
  },
  {
    dept: 'Finance',
    title: 'ร่าง: ไวท์บอร์ดห้องบัญชี',
    fy: 2026,
    quarter: 2,
    status: PrStatus.DRAFT,
    lines: [{ item: 10, qty: 5 }],
  },
  {
    dept: 'IT',
    title: 'ร่าง: โน้ตบุ๊กสำรอง',
    fy: 2026,
    quarter: 2,
    status: PrStatus.DRAFT,
    lines: [{ item: 0, qty: 2 }],
  },
  {
    dept: 'Marketing',
    title: 'ร่าง: กระดาษงานอีเวนต์',
    fy: 2026,
    quarter: 2,
    status: PrStatus.DRAFT,
    lines: [{ item: 3, qty: 10 }],
  },
  {
    dept: 'Operations',
    title: 'ร่าง: โต๊ะคลังเพิ่ม',
    fy: 2026,
    quarter: 2,
    status: PrStatus.DRAFT,
    lines: [{ item: 7, qty: 3 }],
  },
  {
    dept: 'HR',
    title: 'ร่าง: เก้าอี้สำรอง',
    fy: 2026,
    quarter: 2,
    status: PrStatus.DRAFT,
    lines: [{ item: 2, qty: 4 }],
  },
];

// announcements หน้า login — 5 รายการ (1 ปักหมุด). icon ใช้ enum member (type-safe, ตรง EXTRA_USERS)
export const ANNOUNCEMENTS: Array<{
  title: string;
  detail: string;
  icon: AnnouncementIcon;
  isActive: boolean;
  isPinned: boolean;
}> = [
  {
    title: 'ปิดปรับปรุงระบบ',
    detail: 'เสาร์ที่ 30 พ.ค. 22:00-24:00 น.',
    icon: AnnouncementIcon.MEGAPHONE,
    isActive: true,
    isPinned: true,
  },
  {
    title: 'นโยบายจัดซื้อใหม่ ปีงบประมาณ 2569',
    detail: 'มีผล 1 มิ.ย. - โปรดศึกษาก่อนสร้างคำขอซื้อ',
    icon: AnnouncementIcon.FILE,
    isActive: true,
    isPinned: false,
  },
  {
    title: 'อบรมการใช้งานระบบ e-GP รุ่นที่ 1',
    detail: 'รับสมัครถึง 28 พ.ค. ที่ฝ่ายพัสดุ',
    icon: AnnouncementIcon.CALENDAR,
    isActive: true,
    isPinned: false,
  },
  {
    title: 'อบรมการใช้งานระบบ e-GP รุ่นที่ 2',
    detail: 'รับสมัครถึง 28 พ.ค. ที่ฝ่ายพัสดุ',
    icon: AnnouncementIcon.CALENDAR,
    isActive: true,
    isPinned: false,
  },
  {
    title: 'รับพัสดุครุภัณฑ์สำนักงานรอบใหม่',
    detail: 'ติดต่อรับที่คลังพัสดุ ชั้น 1',
    icon: AnnouncementIcon.PACKAGE,
    isActive: true,
    isPinned: false,
  },
];
