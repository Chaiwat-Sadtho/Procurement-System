import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { Form, FormField, FormItem, FormMessage } from '@/shared/components/ui/form'

function Harness() {
  const form = useForm({ defaultValues: { name: '' } })
  return (
    <Form {...form}>
      <FormField
        name="name"
        control={form.control}
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}

describe('FormMessage', () => {
  it('reserves vertical space even with no error (prevents layout shift when errors appear)', () => {
    const { container } = render(<Harness />)
    const msg = container.querySelector('p')
    expect(msg).toBeInTheDocument()
    expect(msg).toHaveClass('min-h-[1.25rem]')
    expect(msg).toBeEmptyDOMElement()
  })
})
