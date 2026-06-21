import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Vendor } from '@/features/vendors/types'
import { VendorDetailHeader } from '@/features/vendors/components/VendorDetailHeader'

const vendor: Vendor = {
  id: 1,
  name: 'ACME Corp',
  taxId: '0105551234567',
  email: 'sales@acme.test',
  phone: '021234567',
  address: '123 Bangkok',
  isBlacklisted: false,
  blacklistReason: null,
  ratingAvg: '4.50',
  categories: [
    { id: 1, name: 'Hardware' },
    { id: 2, name: 'Software' },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z',
}

function renderHeader(v: Partial<Vendor> = {}, actions?: React.ReactNode) {
  return render(
    <MemoryRouter>
      <VendorDetailHeader vendor={{ ...vendor, ...v }} actions={actions} />
    </MemoryRouter>,
  )
}

describe('VendorDetailHeader', () => {
  it('renders the name, a back link, and meta fields', () => {
    renderHeader()
    expect(screen.getByRole('heading', { name: 'ACME Corp' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /กลับไปรายการ/ })).toHaveAttribute('href', '/vendors')
    expect(screen.getByText('0105551234567')).toBeInTheDocument()
    expect(screen.getByText('sales@acme.test')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('Hardware')).toBeInTheDocument()
    expect(screen.getByText('Software')).toBeInTheDocument()
    // blacklist badge wired with isBlacklisted={false} → active state badge
    expect(screen.getByText('ปกติ')).toBeInTheDocument()
  })

  it('renders an em dash for null taxId / email / phone / address and empty categories', () => {
    renderHeader({ taxId: null, email: null, phone: null, address: null, categories: [] })
    // taxId, email, phone, address, categories → at least 5 dashes
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(5)
  })

  it('shows the blacklist alert with the reason when blacklisted', () => {
    renderHeader({ isBlacklisted: true, blacklistReason: 'ส่งของไม่ตรงสเปค 3 ครั้ง' })
    // blacklist badge wired with isBlacklisted={true} → blacklisted state badge (distinct from the alert title)
    expect(screen.getByText('แบล็คลิสต์')).toBeInTheDocument()
    expect(screen.getByText('เหตุผลที่แบล็คลิสต์')).toBeInTheDocument()
    expect(screen.getByText('ส่งของไม่ตรงสเปค 3 ครั้ง')).toBeInTheDocument()
  })

  it('shows the blacklist badge but no reason alert when blacklisted without a reason', () => {
    // guards the `&& vendor.blacklistReason` clause: a blacklisted vendor with a null reason
    // must still flag the badge yet render no (empty) reason alert
    renderHeader({ isBlacklisted: true, blacklistReason: null })
    expect(screen.getByText('แบล็คลิสต์')).toBeInTheDocument()
    expect(screen.queryByText('เหตุผลที่แบล็คลิสต์')).not.toBeInTheDocument()
  })

  it('renders the actions slot', () => {
    renderHeader({}, <button>ACTION</button>)
    expect(screen.getByRole('button', { name: 'ACTION' })).toBeInTheDocument()
  })
})
