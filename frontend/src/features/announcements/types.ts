export type AnnouncementIconKey = 'megaphone' | 'file' | 'calendar' | 'package' | 'bell'

export interface Announcement {
  id: number
  title: string
  detail: string
  icon: AnnouncementIconKey
  isActive: boolean
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export interface PublicAnnouncement {
  id: number
  title: string
  detail: string
  icon: AnnouncementIconKey
}

export interface AnnouncementPayload {
  title: string
  detail: string
  icon: AnnouncementIconKey
  isActive: boolean
  isPinned: boolean
}
