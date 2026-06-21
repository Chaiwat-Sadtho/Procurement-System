import { describe, expect, it } from 'vitest'
import {
  announcementSchema,
  createDefaultValues,
  announcementToFormValues,
  toPayload,
} from '@/features/announcements/lib/announcementFormSchema'

const valid = { title: 'หัวข้อ', detail: 'รายละเอียด', icon: 'megaphone', isActive: true, isPinned: false }

describe('announcementFormSchema', () => {
  it('accepts a valid form value', () => {
    expect(announcementSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty title', () => {
    expect(announcementSchema.safeParse({ ...valid, title: '' }).success).toBe(false)
  })

  it('rejects title over 100 chars', () => {
    expect(announcementSchema.safeParse({ ...valid, title: 'ก'.repeat(101) }).success).toBe(false)
  })

  it('rejects detail over 200 chars', () => {
    expect(announcementSchema.safeParse({ ...valid, detail: 'ก'.repeat(201) }).success).toBe(false)
  })

  it('rejects an unknown icon', () => {
    expect(announcementSchema.safeParse({ ...valid, icon: 'rocket' }).success).toBe(false)
  })

  it('createDefaultValues = active, not pinned, megaphone, empty text', () => {
    expect(createDefaultValues()).toEqual({
      title: '',
      detail: '',
      icon: 'megaphone',
      isActive: true,
      isPinned: false,
    })
  })

  it('toPayload trims title and detail', () => {
    expect(toPayload({ ...valid, title: '  hi  ', detail: '  yo  ' })).toMatchObject({
      title: 'hi',
      detail: 'yo',
    })
  })

  it('announcementToFormValues round-trips fields', () => {
    expect(announcementToFormValues(valid)).toEqual(valid)
  })
})
