import { describe, expect, it } from 'vitest'
import { getNotificationIcon, getNotificationLink } from '@/features/notifications/lib/notificationMeta'

describe('notificationMeta', () => {
  it('maps a known type to an icon component', () => {
    expect(getNotificationIcon('pr_approved')).toBeTypeOf('object')
  })

  it('falls back to a default icon for an unknown type', () => {
    expect(getNotificationIcon('nope' as never)).toBeTypeOf('object')
  })

  it('builds a route for a known referenceType + id', () => {
    expect(getNotificationLink('PurchaseRequest', 12)).toBe('/purchase-requests/12')
    expect(getNotificationLink('PurchaseOrder', 5)).toBe('/purchase-orders/5')
    expect(getNotificationLink('GoodsReceiptNote', 8)).toBe('/goods-receipts/8')
    expect(getNotificationLink('Budget', 3)).toBe('/budgets/3')
  })

  it('returns null when reference is missing or unknown', () => {
    expect(getNotificationLink(null, null)).toBeNull()
    expect(getNotificationLink('PurchaseRequest', null)).toBeNull()
    expect(getNotificationLink('Mystery', 1)).toBeNull()
  })
})
