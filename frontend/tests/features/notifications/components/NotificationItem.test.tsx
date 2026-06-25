import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { AppNotification } from '@/features/notifications/types'

// --- mocks ---

const mutateSpy = vi.fn()

vi.mock('@/features/notifications/hooks/useNotificationMutations', () => ({
  useNotificationMutations: () => ({
    markReadMutation: { mutate: mutateSpy, isPending: false },
    markAllReadMutation: { mutate: vi.fn(), isPending: false },
  }),
}))

const navigateSpy = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateSpy,
}))

// import component AFTER mocks are declared
import { NotificationItem } from '@/features/notifications/components/NotificationItem'

// --- helpers ---

function wrap(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>
  )
}

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 1,
    title: 'Test notification',
    message: 'Test message',
    type: 'pr_submitted',
    isRead: false,
    referenceType: null,
    referenceId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// --- tests ---

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('(a) unread + resolvable link: marks read, navigates, calls onNavigate', () => {
    const onNavigateSpy = vi.fn()
    const notification = makeNotification({
      id: 12,
      isRead: false,
      referenceType: 'PurchaseRequest',
      referenceId: 12,
    })

    const { getByRole } = render(
      wrap(<NotificationItem notification={notification} onNavigate={onNavigateSpy} />),
    )

    fireEvent.click(getByRole('button'))

    expect(mutateSpy).toHaveBeenCalledWith(12)
    expect(navigateSpy).toHaveBeenCalledWith('/purchase-requests/12')
    expect(onNavigateSpy).toHaveBeenCalled()
  })

  it('(b) unread + NO link: marks read, does NOT navigate or call onNavigate', () => {
    const onNavigateSpy = vi.fn()
    const notification = makeNotification({
      id: 7,
      isRead: false,
      referenceType: null,
      referenceId: null,
    })

    const { getByRole } = render(
      wrap(<NotificationItem notification={notification} onNavigate={onNavigateSpy} />),
    )

    fireEvent.click(getByRole('button'))

    expect(mutateSpy).toHaveBeenCalledWith(7)
    expect(navigateSpy).not.toHaveBeenCalled()
    expect(onNavigateSpy).not.toHaveBeenCalled()
  })

  it('(c) already read + link: does NOT mark read, but navigates', () => {
    const notification = makeNotification({
      id: 5,
      isRead: true,
      referenceType: 'PurchaseOrder',
      referenceId: 5,
    })

    const { getByRole } = render(wrap(<NotificationItem notification={notification} />))

    fireEvent.click(getByRole('button'))

    expect(mutateSpy).not.toHaveBeenCalled()
    expect(navigateSpy).toHaveBeenCalledWith('/purchase-orders/5')
  })
})
