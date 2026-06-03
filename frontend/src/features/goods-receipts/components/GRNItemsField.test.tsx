import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

  it('shows the bound error when good + damaged exceeds remaining', async () => {
    render(<Harness />)
    const good = screen.getByLabelText(/รับสภาพดี/)
    await userEvent.clear(good)
    await userEvent.type(good, '99')
    await waitFor(() => {
      expect(screen.getByText(/รวมต้องไม่เกินคงเหลือ/)).toBeInTheDocument()
    })
  })

  it('shows the negative error when good is below zero', async () => {
    render(<Harness />)
    const good = screen.getByLabelText(/รับสภาพดี/)
    await userEvent.clear(good)
    await userEvent.type(good, '-1')
    await waitFor(() => {
      expect(screen.getByText('ต้องไม่ติดลบ')).toBeInTheDocument()
    })
  })
})
