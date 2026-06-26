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
import { Textarea } from '@/shared/components/ui/textarea'
import { Label } from '@/shared/components/ui/label'
import { RequiredMark } from '@/shared/components/RequiredMark'
import { MultiSelectCombobox } from '@/shared/components/MultiSelectCombobox'
import { getApiErrorMessage } from '@/shared/lib/getApiErrorMessage'
import { useVendorMutations } from '../hooks/useVendorMutations'
import { useVendorCategories } from '../hooks/useVendorCategories'
import { toVendorPayload, vendorFormSchema, type VendorFormValues } from '../lib/vendorFormSchema'

type VendorFormProps =
  | { mode: 'create'; defaultValues: VendorFormValues }
  | { mode: 'edit'; vendorId: number; defaultValues: VendorFormValues }

export function VendorForm(props: VendorFormProps) {
  const { defaultValues } = props
  const navigate = useNavigate()
  const { createMutation, updateMutation } = useVendorMutations()
  const { data: categories } = useVendorCategories()
  const inFlight = useRef(false)

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues,
    mode: 'onChange',
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const { isDirty, isValid } = form.formState

  async function onSubmit(values: VendorFormValues) {
    // synchronous in-flight guard: react-query's isPending flips after render,
    // so a fast second click can slip through; this ref locks synchronously
    if (inFlight.current) return
    inFlight.current = true
    try {
      const payload = toVendorPayload(values)
      if (props.mode === 'edit') {
        await updateMutation.mutateAsync({ id: props.vendorId, data: payload })
        toast.success('บันทึกแล้ว')
        navigate(`/vendors/${props.vendorId}`)
      } else {
        const created = await createMutation.mutateAsync(payload)
        toast.success('สร้างผู้ขายแล้ว')
        navigate(`/vendors/${created.id}`)
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'บันทึกไม่สำเร็จ'))
    } finally {
      inFlight.current = false
    }
  }

  return (
    <Form {...form}>
      {/* react-hooks/refs false positive: handleSubmit returns an event handler — the
          inFlight ref inside onSubmit is read on submit, never during render. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      <form className="mx-auto max-w-2xl space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                ชื่อผู้ขาย
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input placeholder="เช่น บริษัท ไอทีซัพพลาย จำกัด" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>เลขผู้เสียภาษี</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>เบอร์โทร</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>อีเมล</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ที่อยู่</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Controller
          control={form.control}
          name="categoryIds"
          render={({ field }) => (
            <div className="space-y-1">
              <Label htmlFor="vendor-categories">หมวดหมู่</Label>
              <MultiSelectCombobox
                id="vendor-categories"
                value={field.value.map(String)}
                onChange={(vals) => field.onChange(vals.map(Number))}
                options={(categories ?? []).map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="เลือกหมวดหมู่"
              />
            </div>
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
              onClick: () => navigate('/vendors'),
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
