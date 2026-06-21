import api from '@/shared/lib/axios'
import type { Announcement, PublicAnnouncement, AnnouncementPayload } from './types'

export const announcementsApi = {
  listActive: () => api.get<PublicAnnouncement[]>('/announcements/active').then((r) => r.data),
  list: () => api.get<Announcement[]>('/announcements').then((r) => r.data),
  create: (data: AnnouncementPayload) =>
    api.post<Announcement>('/announcements', data).then((r) => r.data),
  update: (id: number, data: Partial<AnnouncementPayload>) =>
    api.patch<Announcement>(`/announcements/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/announcements/${id}`).then(() => undefined),
}
