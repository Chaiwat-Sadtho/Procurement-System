import { Trash2, Plus } from 'lucide-react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Button } from '@/shared/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Separator } from '@/shared/components/ui/separator'
import { RequiredMark } from '@/shared/components/RequiredMark'
import { formatCurrency } from '@/shared/lib/utils'
import { emptyItem, safeNum, type PRFormValues } from '../lib/prFormSchema'

interface PRItemsFieldProps {
  form: UseFormReturn<PRFormValues>
}

export function PRItemsField({ form }: PRItemsFieldProps) {
  const { control } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watched = form.watch('items')

  const grandTotal = (watched ?? []).reduce(
    (sum, it) => sum + safeNum(it?.quantity) * safeNum(it?.estimatedUnitPrice),
    0,
  )

  const arrayError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">รายการ<RequiredMark /></h2>
        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyItem())}>
          <Plus className="mr-1 h-4 w-4" />
          เพิ่มรายการ
        </Button>
      </div>

      {typeof arrayError === 'string' && (
        <p className="min-h-[1.25rem] text-sm text-destructive">{arrayError}</p>
      )}

      {fields.map((field, index) => {
        const rowTotal = safeNum(watched?.[index]?.quantity) * safeNum(watched?.[index]?.estimatedUnitPrice)
        return (
          <div key={field.id} className="space-y-3 rounded-md border p-4">
            <FormField
              control={control}
              name={`items.${index}.itemName`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อรายการ<RequiredMark /></FormLabel>
                  <FormControl>
                    <Input placeholder="เช่น กระดาษ A4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name={`items.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายละเอียด</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField
                control={control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวน<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" min="0" className="font-mono tabular-nums" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`items.${index}.unit`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หน่วย<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input placeholder="เช่น รีม" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`items.${index}.estimatedUnitPrice`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาต่อหน่วย<RequiredMark /></FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="decimal" step="0.01" min="0" className="font-mono tabular-nums" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                รวม: <span className="font-mono tabular-nums">{formatCurrency(rowTotal)}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="ลบรายการ"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}

      <Separator />
      <div className="flex justify-end text-base font-semibold">
        รวมทั้งหมด:&nbsp;<span className="font-mono tabular-nums">{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  )
}
