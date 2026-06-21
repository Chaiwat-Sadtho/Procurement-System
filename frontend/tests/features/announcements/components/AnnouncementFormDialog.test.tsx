import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnnouncementFormDialog } from '@/features/announcements/components/AnnouncementFormDialog'
import type { Announcement } from '@/features/announcements/types'

const existing: Announcement = {
  id: 1,
  title: 'หัวข้อเดิม',
  detail: 'รายละเอียดเดิม',
  icon: 'file',
  isActive: true,
  isPinned: false,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
}

describe('AnnouncementFormDialog', () => {
  it('prefills fields when editing', () => {
    render(
      <AnnouncementFormDialog
        open
        onOpenChange={() => {}}
        announcement={existing}
        onSubmit={() => {}}
      />,
    )
    expect(screen.getByLabelText('หัวข้อ')).toHaveValue('หัวข้อเดิม')
    expect(screen.getByLabelText('รายละเอียด')).toHaveValue('รายละเอียดเดิม')
  })

  it('submits trimmed values', async () => {
    const onSubmit = vi.fn()
    render(
      <AnnouncementFormDialog open onOpenChange={() => {}} announcement={null} onSubmit={onSubmit} />,
    )
    await userEvent.type(screen.getByLabelText('หัวข้อ'), 'ใหม่')
    await userEvent.type(screen.getByLabelText('รายละเอียด'), 'เนื้อหา')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'ใหม่', detail: 'เนื้อหา', icon: 'megaphone' }),
      ),
    )
  })
})
