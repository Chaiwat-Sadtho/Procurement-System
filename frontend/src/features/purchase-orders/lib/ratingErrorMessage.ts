import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'

/**
 * Map a rating-mutation error to a Thai toast message. Backend returns English
 * messages (purchase-orders.service rateVendor); the two known business errors
 * are translated, everything else falls through to the generic extractor.
 */
export function ratingErrorMessage(error: unknown): string {
  const raw = getApiErrorMessage(error, 'บันทึกคะแนนไม่สำเร็จ')
  if (raw.includes('already been rated')) return 'ใบสั่งซื้อนี้ให้คะแนนไปแล้ว'
  if (raw.includes('Can only rate completed')) return 'ให้คะแนนได้เฉพาะใบสั่งซื้อที่รับของครบแล้ว'
  return raw
}
