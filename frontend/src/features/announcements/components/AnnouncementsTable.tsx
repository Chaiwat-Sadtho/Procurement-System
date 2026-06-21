import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { getAnnouncementIcon } from '../lib/announcementIcons'
import type { Announcement } from '../types'

interface Props {
  announcements: Announcement[]
  onEdit: (a: Announcement) => void
  onToggleActive: (a: Announcement, value: boolean) => void
  onTogglePin: (a: Announcement, value: boolean) => void
  onDelete: (a: Announcement) => void
}

export function AnnouncementsTable({
  announcements,
  onEdit,
  onToggleActive,
  onTogglePin,
  onDelete,
}: Props) {
  return (
    <div className="rounded-md border">
      <Table className="table-fixed min-w-[760px]">
        <TableHeader className="bg-table-header text-table-header-foreground">
          <TableRow>
            <TableHead className="w-12 text-center">ไอคอน</TableHead>
            <TableHead className="min-w-[200px]">หัวข้อ</TableHead>
            <TableHead className="min-w-[220px]">รายละเอียด</TableHead>
            <TableHead className="w-[110px] text-center">เปิดใช้งาน</TableHead>
            <TableHead className="w-[100px] text-center">ปักหมุด</TableHead>
            <TableHead className="w-[120px] text-center">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((a) => {
            const Icon = getAnnouncementIcon(a.icon)
            return (
              <TableRow key={a.id}>
                <TableCell className="text-center">
                  <Icon className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
                </TableCell>
                <TableCell className="font-medium truncate">{a.title}</TableCell>
                <TableCell className="truncate text-muted-foreground">{a.detail}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={a.isActive}
                    onCheckedChange={(v) => onToggleActive(a, v)}
                    aria-label={`เปิดใช้งาน ${a.title}`}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={a.isPinned}
                    onCheckedChange={(v) => onTogglePin(a, v)}
                    aria-label={`ปักหมุด ${a.title}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(a)}
                      aria-label={`แก้ไข ${a.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(a)}
                      aria-label={`ลบ ${a.title}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
