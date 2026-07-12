import { useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionButtons } from '@/shared/components/ActionButtons'
import { Form, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Card, CardContent } from '@/shared/components/ui/card'
import { DateField } from '@/shared/components/DateField'
import { RequiredMark } from '@/shared/components/RequiredMark'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import type { PurchaseOrder } from '@/features/purchase-orders/types'
import { useGRNMutations } from '../hooks/useGRNMutations'
import { GRNItemsField } from '../components/GRNItemsField'
import { GRNReceivePreview } from '../components/GRNReceivePreview'
import { grnFormSchema, toCreatePayload, safeNum, type GrnFormValues } from '../lib/grnFormSchema'

interface GRNFormProps {
  po: PurchaseOrder
  defaultValues: GrnFormValues
}

// PO analog POForm (create path only). GRN is immutable: no mode union,
// no toUpdatePayload/updateMutation, no budget hooks/preview, no owner check, no PR/vendor
// Combobox — the host (GRNFormPage) has already chosen the PO.
export function GRNForm({ po, defaultValues }: GRNFormProps) {
  const navigate = useNavigate()
  const { createMutation } = useGRNMutations()
  const inFlight = useRef(false)

  const form = useForm<GrnFormValues>({
    resolver: zodResolver(grnFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  const isPending = createMutation.isPending
  const { isDirty, isValid } = form.formState

  // feed the presentational preview the two figures it compares per line
  const watchedItems = useWatch({ control: form.control, name: 'items' })
  const previewItems = (watchedItems ?? []).map((line) => ({
    remaining: line.remaining,
    good: safeNum(line.good),
  }))

  async function onSubmit(values: GrnFormValues) {
    // synchronous in-flight guard: react-query's isPending flips after render,
    // so a fast second click can slip through; this ref locks synchronously
    if (inFlight.current) return
    inFlight.current = true
    try {
      const created = await createMutation.mutateAsync(toCreatePayload(values))
      toast.success('บันทึกการรับของแล้ว')
      navigate(`/goods-receipts/${created.id}`)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      inFlight.current = false
    }
  }

  return (
    <Form {...form}>
      {/* react-hooks/refs false positive: handleSubmit returns an event handler — the
          inFlight ref inside onSubmit is read on submit, never during render. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <form className="mx-auto max-w-4xl space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 pt-6 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">เลขที่ PO</p>
              <p className="font-mono font-medium">{po.poNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ผู้ขาย</p>
              <p className="font-medium">{po.vendor?.name ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">กำหนดส่งมอบ</p>
              <p className="font-medium">{po.expectedDeliveryDate}</p>
            </div>
          </CardContent>
        </Card>

        <GRNItemsField form={form} />

        <Controller
          control={form.control}
          name="receivedDate"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Label htmlFor="receivedDate">
                วันที่รับ
                <RequiredMark />
              </Label>
              <DateField
                id="receivedDate"
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            </div>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="grn-notes">หมายเหตุ</Label>
              <Textarea id="grn-notes" rows={2} {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <div data-testid="grn-receive-preview">
          <GRNReceivePreview items={previewItems} />
        </div>

        <ActionButtons
          buttons={[
            {
              key: 'cancel',
              label: 'ยกเลิก',
              type: 'button',
              variant: 'outline',
              disabled: isPending,
              onClick: () => navigate(-1),
            },
            {
              key: 'submit',
              label: 'บันทึก',
              type: 'submit',
              disabled: !isDirty || !isValid || isPending,
            },
          ]}
        />
      </form>
    </Form>
  )
}
