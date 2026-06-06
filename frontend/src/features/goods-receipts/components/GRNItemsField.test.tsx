import { describe, it, expect } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form } from '@/shared/components/ui/form'
import { grnFormSchema, type GrnFormValues } from '../lib/grnFormSchema'
import { GRNItemsField } from './GRNItemsField'

const defaultValues: GrnFormValues = {
  poId: 1,
  receivedDate: '',
  notes: '',
  items: [
    {
      poItemId: 11,
      itemName: 'A4 Paper',
      ordered: 10,
      alreadyReceived: 4,
      remaining: 6,
      good: '6',
      damaged: '0',
    },
  ],
}

function Harness() {
  const form = useForm<GrnFormValues>({
    resolver: zodResolver(grnFormSchema),
    defaultValues,
    mode: 'onChange',
  })
  return (
    <Form {...form}>
      <GRNItemsField form={form} />
    </Form>
  )
}

// two-line harness: line 0 still receivable (remaining 6), line 1 fully received (remaining 0 -> disabled)
const multiValues: GrnFormValues = {
  poId: 1,
  receivedDate: '',
  notes: '',
  items: [
    {
      poItemId: 11,
      itemName: 'A4 Paper',
      ordered: 10,
      alreadyReceived: 4,
      remaining: 6,
      good: '6',
      damaged: '0',
    },
    {
      poItemId: 12,
      itemName: 'Ink',
      ordered: 4,
      alreadyReceived: 4,
      remaining: 0,
      good: '0',
      damaged: '0',
    },
  ],
}

function MultiHarness() {
  const form = useForm<GrnFormValues>({
    resolver: zodResolver(grnFormSchema),
    defaultValues: multiValues,
    mode: 'onChange',
  })
  return (
    <Form {...form}>
      <GRNItemsField form={form} />
    </Form>
  )
}

describe('GRNItemsField', () => {
  it('renders the read-only line meta: name, ordered, already received, remaining', () => {
    render(<Harness />)
    expect(screen.getByText('A4 Paper')).toBeInTheDocument()
    // ordered 10, already received 4, remaining 6 visible somewhere in the row
    expect(screen.getByText('สั่ง')).toBeInTheDocument()
    expect(screen.getByText('รับแล้ว')).toBeInTheDocument()
    expect(screen.getByText('คงเหลือ')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('exposes good and damaged number inputs per line', () => {
    render(<Harness />)
    expect(screen.getByLabelText(/รับสภาพดี/)).toBeInTheDocument()
    expect(screen.getByLabelText(/ชำรุด/)).toBeInTheDocument()
  })

  it('surfaces the bound error UNDER the good field when good + damaged exceeds remaining', async () => {
    render(<Harness />)
    const good = screen.getByLabelText(/รับสภาพดี/)
    const goodField = good.closest('div')! // shadcn FormItem wraps label + input + FormMessage
    await userEvent.clear(good)
    await userEvent.type(good, '99')
    await waitFor(() => {
      // scoped to the good field's FormItem: proves schema path ['good'] surfaces under THIS field, not globally
      expect(within(goodField).getByText(/รวมต้องไม่เกินคงเหลือ/)).toBeInTheDocument()
    })
  })

  it('surfaces the negative error UNDER the good field when good is below zero', async () => {
    render(<Harness />)
    const good = screen.getByLabelText(/รับสภาพดี/)
    const goodField = good.closest('div')!
    await userEvent.clear(good)
    await userEvent.type(good, '-1')
    await waitFor(() => {
      expect(within(goodField).getByText('ต้องไม่ติดลบ')).toBeInTheDocument()
    })
  })

  it('surfaces the negative error UNDER the damaged field when damaged is below zero', async () => {
    render(<Harness />)
    const damaged = screen.getByLabelText(/ชำรุด/)
    const damagedField = damaged.closest('div')!
    await userEvent.clear(damaged)
    await userEvent.type(damaged, '-1')
    await waitFor(() => {
      // damaged path ['damaged'] must surface under the damaged field (good stays valid at 6)
      expect(within(damagedField).getByText('ต้องไม่ติดลบ')).toBeInTheDocument()
    })
  })

  it('renders one row per line and disables inputs of a fully-received line (remaining 0)', () => {
    render(<MultiHarness />)
    const goodInputs = screen.getAllByLabelText(/รับสภาพดี/)
    const damagedInputs = screen.getAllByLabelText(/ชำรุด/)
    expect(goodInputs).toHaveLength(2)
    expect(damagedInputs).toHaveLength(2)
    // line 0 (remaining 6) editable
    expect(goodInputs[0]).toBeEnabled()
    expect(damagedInputs[0]).toBeEnabled()
    // line 1 (remaining 0) disabled independently
    expect(goodInputs[1]).toBeDisabled()
    expect(damagedInputs[1]).toBeDisabled()
  })
})
