import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { ThemeToggle } from './ThemeToggle'

function renderToggle() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('shows a control to switch to dark mode when in light mode', async () => {
    renderToggle()
    expect(
      await screen.findByRole('button', { name: /switch to dark mode/i }),
    ).toBeInTheDocument()
  })

  it('switches to dark mode when clicked', async () => {
    const user = userEvent.setup()
    renderToggle()

    const toggle = await screen.findByRole('button', { name: /switch to dark mode/i })
    await user.click(toggle)

    expect(
      await screen.findByRole('button', { name: /switch to light mode/i }),
    ).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
  })
})
