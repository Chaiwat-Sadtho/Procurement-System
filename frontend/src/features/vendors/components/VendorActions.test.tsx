import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@/shared/types'
import type { Vendor } from '../types'
import { VendorActions } from './VendorActions'

const baseVendor: Vendor = {
  id: 1,
  name: 'ACME',
  taxId: '0105551234567',
  email: 'a@x.com',
  phone: '021234567',
  address: 'Bangkok',
  isBlacklisted: false,
  blacklistReason: null,
  ratingAvg: '4.50',
  categories: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const poUser: User = {
  id: 10,
  email: 'po@x.com',
  firstName: 'P',
  middleName: null,
  lastName: 'O',
  fullName: 'PO',
  role: 'procurement_officer',
  isActive: true,
  departmentId: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const noop = () => {}

function renderActions(
  vendor: Partial<Vendor>,
  user: Partial<User>,
  handlers: Partial<{
    onEdit: () => void
    onBlacklist: () => void
    onUnblacklist: () => void
  }> = {},
) {
  return render(
    <VendorActions
      vendor={{ ...baseVendor, ...vendor }}
      user={{ ...poUser, ...user }}
      onEdit={handlers.onEdit ?? noop}
      onBlacklist={handlers.onBlacklist ?? noop}
      onUnblacklist={handlers.onUnblacklist ?? noop}
    />,
  )
}

describe('VendorActions', () => {
  it('manager sees no buttons (read-only)', () => {
    const { container } = renderActions({}, { role: 'manager' })
    expect(container).toBeEmptyDOMElement()
  })

  it('employee sees no buttons (read-only)', () => {
    // gate is negative (role !== procurement_officer) → every non-PO role must render nothing.
    // covering employee too guards against an accidental `=== manager` style regression.
    const { container } = renderActions({}, { role: 'employee' })
    expect(container).toBeEmptyDOMElement()
  })

  it('PO + active vendor → edit + blacklist (destructive)', () => {
    renderActions({ isBlacklisted: false }, { role: 'procurement_officer' })
    expect(screen.getByRole('button', { name: 'แก้ไข' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'แบล็คลิสต์' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ยกเลิกแบล็คลิสต์' })).not.toBeInTheDocument()
  })

  it('PO + blacklisted vendor → edit + unblacklist', () => {
    renderActions({ isBlacklisted: true }, { role: 'procurement_officer' })
    expect(screen.getByRole('button', { name: 'แก้ไข' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ยกเลิกแบล็คลิสต์' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'แบล็คลิสต์' })).not.toBeInTheDocument()
  })

  it('fires onEdit and onBlacklist', async () => {
    const onEdit = vi.fn()
    const onBlacklist = vi.fn()
    renderActions(
      { isBlacklisted: false },
      { role: 'procurement_officer' },
      { onEdit, onBlacklist },
    )
    await userEvent.click(screen.getByRole('button', { name: 'แก้ไข' }))
    await userEvent.click(screen.getByRole('button', { name: 'แบล็คลิสต์' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onBlacklist).toHaveBeenCalledOnce()
  })

  it('fires onUnblacklist for a blacklisted vendor', async () => {
    const onUnblacklist = vi.fn()
    renderActions({ isBlacklisted: true }, { role: 'procurement_officer' }, { onUnblacklist })
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิกแบล็คลิสต์' }))
    expect(onUnblacklist).toHaveBeenCalledOnce()
  })
})
