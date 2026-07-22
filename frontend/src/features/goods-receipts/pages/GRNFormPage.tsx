import { useState } from 'react'
import { PageHeader } from '@/shared/components/PageHeader'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { Label } from '@/shared/components/ui/label'
import { Combobox } from '@/shared/components/Combobox'
import { usePurchaseOrder } from '@/features/purchase-orders/hooks/usePurchaseOrder'
import { useReceivablePOs } from '../hooks/useReceivablePOs'
import { GRNForm } from './GRNForm'
import { createDefaultValues } from '../lib/grnFormSchema'

// Host for the GRN create flow. A GRN must first pick a receivable PO and load it in full before the
// form can be seeded, so the picker lives here rather than inside GRNForm. GRNs are immutable, so
// there is no edit branch.
export function GRNFormPage() {
  const [selectedPoId, setSelectedPoId] = useState(0)

  const { data: pos, isLoading: posLoading } = useReceivablePOs()
  const poList = pos ?? []

  const { data: po, isLoading: poLoading, isError: poError } = usePurchaseOrder(selectedPoId)

  const poOptions = poList.map((p) => ({
    value: String(p.id),
    label: p.vendor ? `${p.poNumber} — ${p.vendor.name}` : p.poNumber,
  }))

  return (
    <div>
      <PageHeader
        title="บันทึกการรับของ"
        description="เลือกใบสั่งซื้อที่รอรับของและกรอกจำนวนที่รับ"
      />

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-1">
          <Label htmlFor="grn-po">ใบสั่งซื้อ (PO)</Label>
          <div data-testid="grn-po-field">
            <Combobox
              id="grn-po"
              value={selectedPoId ? String(selectedPoId) : ''}
              onChange={(v) => setSelectedPoId(Number(v))}
              options={poOptions}
              placeholder={posLoading ? 'กำลังโหลด...' : 'เลือกใบสั่งซื้อที่รอรับของ'}
            />
          </div>
        </div>

        {selectedPoId > 0 && poLoading && <LoadingSpinner testId="grn-po-loading" />}

        {selectedPoId > 0 && poError && (
          <p role="alert" className="py-4 text-sm text-destructive dark:text-red-400">
            โหลดใบสั่งซื้อไม่สำเร็จ กรุณาเลือกใบสั่งซื้ออีกครั้ง
          </p>
        )}

        {po && (
          // the key forces a remount on PO change, so the form re-seeds instead of keeping stale prefill
          <GRNForm key={po.id} po={po} defaultValues={createDefaultValues(po)} />
        )}
      </div>
    </div>
  )
}
