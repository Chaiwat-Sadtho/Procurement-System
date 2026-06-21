import { z } from 'zod'
import type { AnnouncementPayload } from '../types'

export const ANNOUNCEMENT_ICON_KEYS = ['megaphone', 'file', 'calendar', 'package', 'bell'] as const

export const announcementSchema = z.object({
  title: z.string().trim().min(1, 'กรุณาระบุหัวข้อ').max(100, 'หัวข้อยาวเกิน 100 ตัวอักษร'),
  detail: z.string().trim().min(1, 'กรุณาระบุรายละเอียด').max(200, 'รายละเอียดยาวเกิน 200 ตัวอักษร'),
  icon: z.enum(ANNOUNCEMENT_ICON_KEYS),
  isActive: z.boolean(),
  isPinned: z.boolean(),
})

export type AnnouncementFormValues = z.infer<typeof announcementSchema>

export function createDefaultValues(): AnnouncementFormValues {
  return { title: '', detail: '', icon: 'megaphone', isActive: true, isPinned: false }
}

export function announcementToFormValues(a: AnnouncementPayload): AnnouncementFormValues {
  return { title: a.title, detail: a.detail, icon: a.icon, isActive: a.isActive, isPinned: a.isPinned }
}

export function toPayload(values: AnnouncementFormValues): AnnouncementPayload {
  return {
    title: values.title.trim(),
    detail: values.detail.trim(),
    icon: values.icon,
    isActive: values.isActive,
    isPinned: values.isPinned,
  }
}
