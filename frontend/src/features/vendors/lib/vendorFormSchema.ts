import { z } from 'zod'
import type { Vendor, VendorPayload } from '../types'

export const vendorFormSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาระบุชื่อผู้ขาย').max(255, 'ไม่เกิน 255 ตัวอักษร'),
  taxId: z.string().trim().max(20, 'ไม่เกิน 20 ตัวอักษร'),
  // email max(255) mirror DB column email varchar(255)
  email: z.union([
    z.literal(''),
    z.string().trim().email('อีเมลไม่ถูกต้อง').max(255, 'ไม่เกิน 255 ตัวอักษร'),
  ]),
  phone: z.string().trim().max(20, 'ไม่เกิน 20 ตัวอักษร'),
  address: z.string().trim(),
  // ห้ามใส่ .default([]) — zod4 + @hookform/resolvers v5: .default ทำให้ INPUT type optional → TS2322 ที่ resolver
  categoryIds: z.array(z.number()),
})

export type VendorFormValues = z.infer<typeof vendorFormSchema>

export function toVendorPayload(values: VendorFormValues): VendorPayload {
  return {
    name: values.name.trim(),
    taxId: values.taxId.trim() || null,
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    address: values.address.trim() || null,
    categoryIds: values.categoryIds,
  }
}

export function vendorToFormValues(vendor: Vendor): VendorFormValues {
  return {
    name: vendor.name,
    taxId: vendor.taxId ?? '',
    email: vendor.email ?? '',
    phone: vendor.phone ?? '',
    address: vendor.address ?? '',
    categoryIds: vendor.categories.map((c) => c.id),
  }
}

export function createDefaultValues(): VendorFormValues {
  return { name: '', taxId: '', email: '', phone: '', address: '', categoryIds: [] }
}
