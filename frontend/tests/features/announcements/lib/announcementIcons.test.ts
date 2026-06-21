import { describe, expect, it } from 'vitest'
import { Megaphone } from 'lucide-react'
import {
  getAnnouncementIcon,
  ANNOUNCEMENT_ICON_OPTIONS,
} from '@/features/announcements/lib/announcementIcons'

describe('announcementIcons', () => {
  it('resolves a known key to its lucide component', () => {
    expect(getAnnouncementIcon('calendar')).toBeTypeOf('object')
  })

  it('falls back to Megaphone for an unknown key', () => {
    expect(getAnnouncementIcon('definitely-not-an-icon')).toBe(Megaphone)
  })

  it('exposes one option per icon key', () => {
    expect(ANNOUNCEMENT_ICON_OPTIONS.map((o) => o.value)).toEqual([
      'megaphone',
      'file',
      'calendar',
      'package',
      'bell',
    ])
  })
})
