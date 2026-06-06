import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/shared/components/PageHeader'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Button } from '@/shared/components/ui/button'
import { useVendor } from '../hooks/useVendor'
import { VendorForm } from '../components/VendorForm'
import { createDefaultValues, vendorToFormValues } from '../lib/vendorFormSchema'

function Notice({ message, to }: { message: string; to?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
      <p>{message}</p>
      {to && (
        <Button asChild variant="outline">
          <Link to={to}>กลับ</Link>
        </Button>
      )}
    </div>
  )
}

export function VendorFormPage() {
  const { id } = useParams()
  const isEdit = id != null
  const vendorId = Number(id)
  const { data: vendor, isLoading, isError } = useVendor(isEdit ? vendorId : 0)

  if (!isEdit) {
    return (
      <div>
        <PageHeader title="เพิ่มผู้ขาย" description="กรอกข้อมูลผู้ขายรายใหม่" />
        <VendorForm mode="create" defaultValues={createDefaultValues()} />
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError || !vendor) {
    return <Notice message="ไม่พบผู้ขาย" to="/vendors" />
  }

  return (
    <div>
      <PageHeader title="แก้ไขผู้ขาย" description="แก้ไขข้อมูลผู้ขาย" />
      {/* key={vendor.id} forces a remount when navigating edit -> edit between two ids,
          so react-hook-form re-seeds from the new vendor's defaultValues instead of keeping stale prefill */}
      <VendorForm
        key={vendor.id}
        mode="edit"
        vendorId={vendor.id}
        defaultValues={vendorToFormValues(vendor)}
      />
    </div>
  )
}
