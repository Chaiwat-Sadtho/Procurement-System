import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'

const LAST_ACTIVE_PO_TH = 'ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน'

/**
 * Toast message for a users-mutation error. Only the last-active-officer guard gets a friendly line;
 * the own-row guards are unreachable through the UI, so they fall through to the generic message.
 */
export function usersErrorMessage(error: unknown): string {
  const raw = getApiErrorMessage(error, 'ทำรายการไม่สำเร็จ')
  if (raw.toLowerCase().includes('last active procurement officer')) {
    return LAST_ACTIVE_PO_TH
  }
  return raw
}
