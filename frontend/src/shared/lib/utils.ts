import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Short money for tight spaces such as chart axes and dashboard cards: ฿0 / ฿850K / ฿1.2M.
// Use formatCurrency where the exact amount matters.
export function formatBahtShort(amount: number): string {
  if (amount >= 1_000_000)
    return `฿${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
  if (amount >= 1_000) return `฿${Math.round(amount / 1_000)}K`
  return `฿${amount}`
}

export function getRowIndex(page: number, limit: number, i: number): number {
  return (page - 1) * limit + i + 1
}
