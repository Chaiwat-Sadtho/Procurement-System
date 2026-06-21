import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Announcement, AnnouncementPayload } from '@/features/announcements/types'

vi.mock('@/features/announcements/api', () => ({
  announcementsApi: { create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

import { announcementsApi } from '@/features/announcements/api'
import { useAnnouncementMutations } from '@/features/announcements/hooks/useAnnouncementMutations'

const fake = { id: 9 } as Announcement
const payload: AnnouncementPayload = {
  title: 'A',
  detail: 'B',
  icon: 'megaphone',
  isActive: true,
  isPinned: false,
}

function makeQc() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}
function makeWrapper(qc: QueryClient) {
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

describe('useAnnouncementMutations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('create calls api.create and invalidates the announcements prefix', async () => {
    vi.mocked(announcementsApi.create).mockResolvedValue(fake)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useAnnouncementMutations(), { wrapper: makeWrapper(qc) })

    await result.current.createMutation.mutateAsync(payload)

    expect(announcementsApi.create).toHaveBeenCalledWith(payload)
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['announcements'] }))
  })

  it('update calls api.update with id + data and invalidates the prefix', async () => {
    vi.mocked(announcementsApi.update).mockResolvedValue(fake)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useAnnouncementMutations(), { wrapper: makeWrapper(qc) })

    await result.current.updateMutation.mutateAsync({ id: 9, data: { isPinned: true } })

    expect(announcementsApi.update).toHaveBeenCalledWith(9, { isPinned: true })
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['announcements'] }))
  })

  it('delete calls api.remove and invalidates the prefix', async () => {
    vi.mocked(announcementsApi.remove).mockResolvedValue(undefined)
    const qc = makeQc()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useAnnouncementMutations(), { wrapper: makeWrapper(qc) })

    await result.current.deleteMutation.mutateAsync(9)

    expect(announcementsApi.remove).toHaveBeenCalledWith(9)
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['announcements'] }))
  })
})
