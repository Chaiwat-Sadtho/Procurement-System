import { useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ActionButtons } from '@/shared/components/ActionButtons'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { DateField } from '@/shared/components/DateField'
import { RequiredMark } from '@/shared/components/RequiredMark'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { usePRMutations } from '../hooks/usePRMutations'
import { PRItemsField } from './PRItemsField'
import {
  prFormSchema,
  toCreatePayload,
  toUpdatePayload,
  type PRFormValues,
} from '../lib/prFormSchema'

const PERIOD_OPTIONS: { value: PRFormValues['period']; label: string }[] = [
  { value: 'annual', label: 'ทั้งปี (Annual)' },
  { value: '1', label: 'ไตรมาส 1' },
  { value: '2', label: 'ไตรมาส 2' },
  { value: '3', label: 'ไตรมาส 3' },
  { value: '4', label: 'ไตรมาส 4' },
]

type PRFormProps =
  | { mode: 'create'; defaultValues: PRFormValues }
  | { mode: 'edit'; prId: number; defaultValues: PRFormValues }

export function PRForm(props: PRFormProps) {
  const { mode, defaultValues } = props
  const navigate = useNavigate()
  const isEdit = mode === 'edit'
  const { createMutation, updateMutation, submitMutation } = usePRMutations()
  const inFlight = useRef(false)

  const form = useForm<PRFormValues>({
    resolver: zodResolver(prFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  const isPending = createMutation.isPending || updateMutation.isPending || submitMutation.isPending
  const { isDirty, isValid } = form.formState

  async function onSave(values: PRFormValues, intent: 'draft' | 'submit') {
    // Synchronous guard: isPending only flips after render, so a fast second click would slip through
    if (inFlight.current) return
    inFlight.current = true
    try {
      let savedId: number
      if (props.mode === 'edit') {
        await updateMutation.mutateAsync({ id: props.prId, data: toUpdatePayload(values) })
        savedId = props.prId
      } else {
        const created = await createMutation.mutateAsync(toCreatePayload(values))
        savedId = created.id
      }

      if (intent === 'submit') {
        try {
          await submitMutation.mutateAsync(savedId)
        } catch (e) {
          toast.error(getApiErrorMessage(e, 'บันทึกแล้ว แต่ส่งอนุมัติไม่สำเร็จ'))
          navigate(`/purchase-requests/${savedId}`)
          return
        }
      }

      toast.success(
        intent === 'submit' ? 'ส่งคำขอซื้อแล้ว' : isEdit ? 'บันทึกการแก้ไขแล้ว' : 'บันทึกร่างแล้ว',
      )
      navigate(`/purchase-requests/${savedId}`)
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      inFlight.current = false
    }
  }

  // react-hooks/refs false positive: handleSubmit returns an event handler, so the ref is read on
  // submit, never during render
  // eslint-disable-next-line react-hooks/refs
  const onSubmitForApproval = form.handleSubmit((v) => onSave(v, 'submit'))

  return (
    <Form {...form}>
      <form
        className="mx-auto max-w-4xl space-y-6"
        // eslint-disable-next-line react-hooks/refs
        onSubmit={form.handleSubmit((v) => onSave(v, 'draft'))}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  ชื่อเรื่อง
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input placeholder="เช่น จัดซื้อวัสดุสำนักงาน" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Controller
            control={form.control}
            name="requiredDate"
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <Label htmlFor="requiredDate">
                  วันที่ต้องการ
                  <RequiredMark />
                </Label>
                <DateField
                  id="requiredDate"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              </div>
            )}
          />

          <FormField
            control={form.control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="period">งบประมาณ (ช่วงเวลา)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <FormControl>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isEdit && (
                  <p className="text-sm text-muted-foreground">ช่วงงบประมาณแก้ไขไม่ได้หลังสร้าง</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <PRItemsField form={form} />

        <ActionButtons
          cols={3}
          buttons={[
            {
              key: 'cancel',
              label: 'ยกเลิก',
              type: 'button',
              variant: 'outline',
              disabled: isPending,
              onClick: () => navigate(-1),
            },
            // saving a draft is a no-op on an unchanged form, so gate on isDirty too
            {
              key: 'draft',
              label: 'บันทึกร่าง',
              type: 'submit',
              variant: 'secondary',
              disabled: !isDirty || !isValid || isPending,
            },
            // submitting changes state even on an unchanged draft, so gate on validity only
            {
              key: 'submit',
              label: 'บันทึก + ส่งอนุมัติ',
              type: 'button',
              disabled: !isValid || isPending,
              onClick: onSubmitForApproval,
            },
          ]}
        />
      </form>
    </Form>
  )
}
