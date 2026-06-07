import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { formatDateTime } from '@/shared/lib/utils'
import { formatRating } from '../lib/vendorFilters'
import { VendorBlacklistBadge } from './VendorBlacklistBadge'
import type { Vendor } from '../types'

interface VendorDetailHeaderProps {
  vendor: Vendor
  actions?: React.ReactNode
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function VendorDetailHeader({ vendor, actions }: VendorDetailHeaderProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Link
          to="/vendors"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการ
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <h1 className="min-w-0 break-words text-2xl font-semibold">{vendor.name}</h1>
            <VendorBlacklistBadge isBlacklisted={vendor.isBlacklisted} />
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <MetaItem
            label="เลขผู้เสียภาษี"
            value={<span className="font-mono">{vendor.taxId ?? '—'}</span>}
          />
          <MetaItem label="อีเมล" value={vendor.email ?? '—'} />
          <MetaItem label="เบอร์โทร" value={vendor.phone ?? '—'} />
          <MetaItem label="ที่อยู่" value={vendor.address ?? '—'} />
          <MetaItem label="คะแนนเฉลี่ย" value={formatRating(vendor.ratingAvg)} />
          <MetaItem
            label="หมวดหมู่"
            value={
              vendor.categories.length === 0 ? (
                '—'
              ) : (
                <div className="flex flex-wrap gap-1">
                  {vendor.categories.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              )
            }
          />
          <MetaItem label="วันที่สร้าง" value={formatDateTime(vendor.createdAt)} />
          <MetaItem label="แก้ไขล่าสุด" value={formatDateTime(vendor.updatedAt)} />
        </dl>

        {vendor.isBlacklisted && vendor.blacklistReason && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>เหตุผลที่แบล็คลิสต์</AlertTitle>
            <AlertDescription>{vendor.blacklistReason}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
