import { useMemo, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Form, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Combobox } from '@/shared/components/Combobox'
import { DateField } from '@/shared/components/DateField'
import { RequiredMark } from '@/shared/components/RequiredMark'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { useVendors } from '@/features/vendors/hooks/useVendors'
import { usePOMutations } from '../hooks/usePOMutations'
import { useEligiblePRs } from '../hooks/useEligiblePRs'
import { useBudgetForPR, matchBudgetForPR } from '../hooks/useBudgetForPR'
import { POItemsField } from './POItemsField'
import { POBudgetPreview } from './POBudgetPreview'
import type { POPrRef } from '../types'
import {
  poFormSchema,
  toCreatePayload,
  toUpdatePayload,
  safeNum,
  type POFormValues,
} from '../lib/poFormSchema'

type POFormProps =
  | { mode: 'create'; defaultValues: POFormValues }
  | { mode: 'edit'; poId: number; defaultValues: POFormValues; pr?: POPrRef }

export function POForm(props: POFormProps) {
  const { mode, defaultValues } = props
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  // edit mode: the PO's own PR is excluded from the eligible list (it already has an
  // active PO), so resolve the summary card + budget from the PO's purchaseRequest ref
  const editPr = props.mode === 'edit' ? props.pr : undefined
  const { createMutation, updateMutation } = usePOMutations()
  const inFlight = useRef(false)

  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  const { data: eligible, isLoading: prsLoading } = useEligiblePRs()
  // pull a large page of vendors for the dropdown; filter blacklist client-side (§6.3)
  const { data: vendorsPage } = useVendors({ limit: 100 }, { enabled: true })

  const prList = eligible?.data ?? []
  const vendorList = vendorsPage?.data ?? []

  // prId/vendorId are numbers in POFormValues (poFormSchema = z.number); the
  // Combobox works in strings, so bridge with String()/Number() at the seam.
  const selectedPrId = useWatch({ control: form.control, name: 'prId' })
  const selectedPR = useMemo(
    () => prList.find((pr) => pr.id === selectedPrId) ?? editPr,
    [prList, selectedPrId, editPr],
  )

  const prOptions = [
    ...prList.map((pr) => ({
      value: String(pr.id),
      label: `${pr.prNumber} — ${pr.title}`,
    })),
    // edit mode: PO's PR is absent from the eligible list — add it so the disabled
    // picker shows the PR number instead of falling back to the placeholder
    ...(editPr && !prList.some((pr) => pr.id === editPr.id)
      ? [{ value: String(editPr.id), label: editPr.prNumber }]
      : []),
  ]
  const vendorOptions = vendorList
    .filter((v) => !v.isBlacklisted)
    .map((v) => ({ value: String(v.id), label: v.name }))

  // budget preview (§4A): the form resolves the matching budget row itself
  // (useBudgetForPR + matchBudgetForPR, exact-quarter no-fallback) and feeds the
  // presentational POBudgetPreview the budget + the two figures it compares.
  const watchedItems = useWatch({ control: form.control, name: 'items' })
  const poTotal = (watchedItems ?? []).reduce(
    (sum, it) => sum + safeNum(it?.quantity) * safeNum(it?.unitPrice),
    0,
  )
  const prEstimate = selectedPR ? Number(selectedPR.totalEstimatedAmount) : 0
  const { data: budgets } = useBudgetForPR(
    selectedPR ? { departmentId: selectedPR.departmentId, quarter: selectedPR.quarter } : null,
  )
  const budget = selectedPR
    ? (matchBudgetForPR(budgets ?? [], { quarter: selectedPR.quarter }) ?? null)
    : null

  const isPending = createMutation.isPending || updateMutation.isPending
  const { isDirty, isValid } = form.formState

  function handlePickPR(prIdStr: string) {
    const prId = Number(prIdStr)
    form.setValue('prId', prId, { shouldDirty: true, shouldValidate: true })
    const pr = prList.find((p) => p.id === prId)
    if (!pr) return
    form.setValue(
      'items',
      pr.items.map((it) => ({
        prItemId: it.id,
        itemName: it.itemName,
        quantity: String(it.quantity),
        unit: it.unit,
        unitPrice: String(it.estimatedUnitPrice),
      })),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  async function onSubmit(values: POFormValues) {
    // synchronous in-flight guard: react-query's isPending flips after render,
    // so a fast second click can slip through; this ref locks synchronously
    if (inFlight.current) return
    inFlight.current = true
    try {
      let savedId: number
      if (props.mode === 'edit') {
        await updateMutation.mutateAsync({ id: props.poId, data: toUpdatePayload(values) })
        savedId = props.poId
        toast.success('บันทึกการแก้ไขแล้ว')
      } else {
        const created = await createMutation.mutateAsync(toCreatePayload(values))
        savedId = created.id
        toast.success('สร้างใบสั่งซื้อแล้ว')
      }
      navigate(`/purchase-orders/${savedId}`)
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="prId"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="po-pr">ใบขอซื้อ (PR)<RequiredMark /></Label>
                <div data-testid="po-pr-field">
                  <Combobox
                    id="po-pr"
                    value={field.value ? String(field.value) : ''}
                    onChange={isEdit ? () => {} : handlePickPR}
                    options={prOptions}
                    placeholder={prsLoading ? 'กำลังโหลด...' : 'เลือกใบขอซื้อที่อนุมัติแล้ว'}
                    disabled={isEdit}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="po-vendor">ผู้ขาย<RequiredMark /></Label>
                <div data-testid="po-vendor-field">
                  <Combobox
                    id="po-vendor"
                    value={field.value ? String(field.value) : ''}
                    onChange={(v) => field.onChange(Number(v))}
                    options={vendorOptions}
                    placeholder="เลือกผู้ขาย"
                    disabled={isEdit}
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedPR && (
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">เลขที่ PR</p>
                <p className="font-mono font-medium">{selectedPR.prNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">แผนก</p>
                <p className="font-medium">{selectedPR.department?.name ?? '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ไตรมาส</p>
                <p className="font-medium">{selectedPR.quarter ?? 'รายปี'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ยอดประเมิน</p>
                <p className="font-mono tabular-nums font-medium">
                  {Number(selectedPR.totalEstimatedAmount).toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Controller
          control={form.control}
          name="expectedDeliveryDate"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <Label htmlFor="expectedDeliveryDate">กำหนดส่งมอบ<RequiredMark /></Label>
              <DateField
                id="expectedDeliveryDate"
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
              <Label htmlFor="po-notes">หมายเหตุ</Label>
              <Textarea id="po-notes" rows={2} {...field} />
              <FormMessage />
            </FormItem>
          )}
        />

        <POItemsField form={form} />

        <div data-testid="po-budget-preview">
          <POBudgetPreview budget={budget} prEstimate={prEstimate} poTotal={poTotal} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => navigate(-1)}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={!isDirty || !isValid || isPending}>
            บันทึก
          </Button>
        </div>
      </form>
    </Form>
  )
}
