import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'

/** Toast message for a rating error: the two known business errors are translated, the rest fall through. */
export function ratingErrorMessage(error: unknown): string {
  const raw = getApiErrorMessage(error, 'บันทึกคะแนนไม่สำเร็จ')
  if (raw.includes('already been rated')) return 'ใบสั่งซื้อนี้ให้คะแนนไปแล้ว'
  if (raw.includes('Can only rate completed')) return 'ให้คะแนนได้เฉพาะใบสั่งซื้อที่รับของครบแล้ว'
  return raw
}
