import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SettingsLayout } from '@/features/settings/layout/SettingsLayout'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile" element={<div>Profile Content</div>} />
          <Route path="security" element={<div>Security Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('SettingsLayout', () => {
  it('renders Profile and Security tab links', () => {
    renderAt('/settings/profile')
    expect(screen.getByRole('link', { name: /โปรไฟล์/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ความปลอดภัย/ })).toBeInTheDocument()
  })

  it('renders the active child route via Outlet', () => {
    renderAt('/settings/profile')
    expect(screen.getByText('Profile Content')).toBeInTheDocument()
  })

  it('redirects /settings to /settings/profile', () => {
    renderAt('/settings')
    expect(screen.getByText('Profile Content')).toBeInTheDocument()
  })

  it('exposes the tab strip as a labelled navigation landmark (finding H)', () => {
    renderAt('/settings/profile')
    expect(screen.getByRole('navigation', { name: /settings sections/i })).toBeInTheDocument()
  })
})
