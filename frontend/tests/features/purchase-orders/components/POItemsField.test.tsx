import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/shared/components/ui/form'
import { poFormSchema, createDefaultValues, type POFormValues } from '@/features/purchase-orders/lib/poFormSchema'
import { POItemsField } from '@/features/purchase-orders/components/POItemsField'

function Harness() {
  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: createDefaultValues(),
  })
  return (
    <Form {...form}>
      <POItemsField form={form} />
    </Form>
  )
}

describe('POItemsField', () => {
  it('starts with one item row; remove is disabled with a single row', () => {
    render(<Harness />)
    expect(screen.getAllByLabelText(/ชื่อรายการ/)).toHaveLength(1)
    expect(screen.getByRole('button', { name: /ลบรายการ/ })).toBeDisabled()
  })

  it('adds a row when clicking เพิ่มรายการ and enables remove', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายการ' }))
    expect(screen.getAllByLabelText(/ชื่อรายการ/)).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /ลบรายการ/ })[0]).toBeEnabled()
  })

  it('removes a row', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายการ' }))
    await userEvent.click(screen.getAllByRole('button', { name: /ลบรายการ/ })[1])
    expect(screen.getAllByLabelText(/ชื่อรายการ/)).toHaveLength(1)
  })

  it('shows per-row and grand total from quantity x unit price', async () => {
    render(<Harness />)
    const qty = screen.getByLabelText(/จำนวน/)
    const price = screen.getByLabelText(/ราคาต่อหน่วย/)
    await userEvent.clear(qty)
    await userEvent.type(qty, '10')
    await userEvent.clear(price)
    await userEvent.type(price, '5')
    expect(screen.getAllByText(/50\.00/).length).toBeGreaterThanOrEqual(1)
  })
})
