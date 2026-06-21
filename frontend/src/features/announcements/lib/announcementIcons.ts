import { Megaphone, FileText, Calendar, Package, Bell, type LucideIcon } from 'lucide-react'
import type { AnnouncementIconKey } from '../types'

export const ANNOUNCEMENT_ICONS: Record<AnnouncementIconKey, LucideIcon> = {
  megaphone: Megaphone,
  file: FileText,
  calendar: Calendar,
  package: Package,
  bell: Bell,
}

export const ANNOUNCEMENT_ICON_OPTIONS: { value: AnnouncementIconKey; label: string }[] = [
  { value: 'megaphone', label: 'โทรโข่ง (ประกาศ)' },
  { value: 'file', label: 'เอกสาร/นโยบาย' },
  { value: 'calendar', label: 'ปฏิทิน/อบรม' },
  { value: 'package', label: 'พัสดุ' },
  { value: 'bell', label: 'แจ้งเตือน' },
]

export function getAnnouncementIcon(key: string): LucideIcon {
  return ANNOUNCEMENT_ICONS[key as AnnouncementIconKey] ?? Megaphone
}
