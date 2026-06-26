import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionButtons } from '@/shared/components/ActionButtons'
import { Form, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Combobox } from '@/shared/components/Combobox'
import { RequiredMark } from '@/shared/components/RequiredMark'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import type { DashboardDepartment } from '@/features/dashboard/api'
import { useBudgetMutations } from '../hooks/useBudgetMutations'
import {
  createBudgetSchema,
  makeEditBudgetSchema,
  toCreatePayload,
  toUpdatePayload,
  QUARTER_ANNUAL,
  type BudgetFormValues,
} from '../lib/budgetFormSchema'

type BudgetFormProps =
  | { mode: 'create'; departments: DashboardDepartment[]; defaultValues: BudgetFormValues }
  | {
      mode: 'edit'
      budgetId: number
      committed: number
      departments: DashboardDepartment[]
      defaultValues: BudgetFormValues
    }

const QUARTER_OPTIONS = [
  { value: QUARTER_ANNUAL, label: 'รายปี' },
  { value: '1', label: 'Q1' },
  { value: '2', label: 'Q2' },
  { value: '3', label: 'Q3' },
  { value: '4', label: 'Q4' },
]

function quarterLabel(quarter: string): string {
  return QUARTER_OPTIONS.find((q) => q.value === quarter)?.label ?? quarter
}

export function BudgetForm(props: BudgetFormProps) {
  const { mode, departments, defaultValues } = props
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const { createMutation, updateMutation } = useBudgetMutations()
  const inFlight = useRef(false)

  // resolver rebuilt each render (cheap) — mirror POForm/PRForm/VendorForm; an edit
  // resolver always reflects the current committed floor via makeEditBudgetSchema.
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(isEdit ? makeEditBudgetSchema(props.committed) : createBudgetSchema),
    defaultValues,
    mode: 'onChange',
  })

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }))
  const selectedDept = useWatch({ control: form.control, name: 'departmentId' })
  const selectedQuarter = useWatch({ control: form.control, name: 'quarter' })
  const deptName = departments.find((d) => d.id === selectedDept)?.name ?? '—'

  const isPending = createMutation.isPending || updateMutation.isPending
  const { isDirty, isValid } = form.formState

  async function onSubmit(values: BudgetFormValues) {
    if (inFlight.current) return
    inFlight.current = true
    try {
      let savedId: number
      if (props.mode === 'edit') {
        await updateMutation.mutateAsync({ id: props.budgetId, data: toUpdatePayload(values) })
        savedId = props.budgetId
        toast.success('บันทึกการแก้ไขแล้ว')
      } else {
        const created = await createMutation.mutateAsync(toCreatePayload(values))
        savedId = created.id
        toast.success('สร้างงบประมาณแล้ว')
      }
      navigate(`/budgets/${savedId}`)
    } catch (e) {
      // 409 = งวดนี้มีงบอยู่แล้ว (unique key ซ้ำ)
      const status = (e as { response?: { status?: number } }).response?.status
      toast.error(status === 409 ? 'มีงบประมาณงวดนี้อยู่แล้ว' : getApiErrorMessage(e))
    } finally {
      inFlight.current = false
    }
  }

  return (
    <Form {...form}>
      {/* eslint-disable-next-line react-hooks/refs */}
      <form className="mx-auto max-w-2xl space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="budget-dept">
                แผนก
                <RequiredMark />
              </Label>
              {isEdit ? (
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{deptName}</p>
              ) : (
                <Combobox
                  id="budget-dept"
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => field.onChange(Number(v))}
                  options={deptOptions}
                  placeholder="เลือกแผนก"
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fiscalYear"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="budget-year">
                  ปีงบประมาณ
                  <RequiredMark />
                </Label>
                {isEdit ? (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">{field.value}</p>
                ) : (
                  <Input
                    id="budget-year"
                    type="number"
                    min={2020}
                    max={2100}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quarter"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="budget-quarter">งวด</Label>
                {isEdit ? (
                  <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {quarterLabel(selectedQuarter ?? QUARTER_ANNUAL)}
                  </p>
                ) : (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="budget-quarter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="budget-amount">
                งบทั้งหมด
                <RequiredMark />
              </Label>
              <Input
                id="budget-amount"
                type="number"
                min={1}
                step="0.01"
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />

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
