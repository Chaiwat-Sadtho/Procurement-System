import type * as React from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import type { GrnFormValues } from '../lib/grnFormSchema'

interface GRNItemsFieldProps {
  form: UseFormReturn<GrnFormValues>
}

function MetaCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono tabular-nums text-sm">{value}</div>
    </div>
  )
}

export function GRNItemsField({ form }: GRNItemsFieldProps) {
  const { control } = form
  const { fields } = useFieldArray({ control, name: 'items' })
  const watched = form.watch('items')

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">รายการรับของ</h2>

      {fields.map((field, index) => {
        const line = watched?.[index]
        const disabled = (line?.remaining ?? 0) <= 0
        return (
          <div key={field.id} className="space-y-3 rounded-md border p-4">
            <div className="font-medium">{line?.itemName}</div>

            <div className="grid grid-cols-3 gap-3">
              <MetaCell label="สั่ง" value={line?.ordered ?? 0} />
              <MetaCell label="รับแล้ว" value={line?.alreadyReceived ?? 0} />
              <MetaCell label="คงเหลือ" value={line?.remaining ?? 0} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                control={control}
                name={`items.${index}.good`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รับสภาพดี</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        disabled={disabled}
                        className="font-mono tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`items.${index}.damaged`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชำรุด</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        disabled={disabled}
                        className="font-mono tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
