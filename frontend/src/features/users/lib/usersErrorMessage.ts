import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'

const LAST_ACTIVE_PO_TH = 'ต้องมีเจ้าหน้าที่จัดซื้อที่ใช้งานอย่างน้อย 1 คน'

/**
 * Map a users-mutation error to a Thai toast message. Only the last-active-PO
 * guard (400) is surfaced to the user as a friendly Thai line; own-row guards
 * (403) are unreachable through the UI (own row is disabled) so they
 * fall through to the backend/generic message.
 */
export function usersErrorMessage(error: unknown): string {
  const raw = getApiErrorMessage(error, 'ทำรายการไม่สำเร็จ')
  if (raw.toLowerCase().includes('last active procurement officer')) {
    return LAST_ACTIVE_PO_TH
  }
  return raw
}
