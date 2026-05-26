import { NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/shared/lib/utils'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import type { Role } from '@/shared/types'

interface NavItem {
  label: string
  path: string
  allowedRoles: Role[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', allowedRoles: ['employee', 'manager', 'procurement_officer'] },
  { label: 'Purchase Requests', path: '/purchase-requests', allowedRoles: ['employee', 'manager', 'procurement_officer'] },
  { label: 'Vendors', path: '/vendors', allowedRoles: ['manager', 'procurement_officer'] },
  { label: 'Purchase Orders', path: '/purchase-orders', allowedRoles: ['manager', 'procurement_officer'] },
  { label: 'Goods Receipts', path: '/goods-receipts', allowedRoles: ['manager', 'procurement_officer'] },
  { label: 'Budgets', path: '/budgets', allowedRoles: ['manager', 'procurement_officer'] },
  { label: 'Users', path: '/users', allowedRoles: ['procurement_officer'] },
]

export function Sidebar() {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function handleLogout() {
    localStorage.removeItem('token')
    queryClient.clear()
    navigate('/login')
  }

  const visibleItems = navItems.filter(
    (item) => user && item.allowedRoles.includes(user.role),
  )

  return (
    <aside
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 w-60 bg-slate-900 border-r border-slate-800 flex flex-col z-10"
    >
      <div className="h-14 flex items-center px-6 border-b border-slate-800 shrink-0">
        <span className="font-semibold text-white">Procurement</span>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-800 shrink-0">
        <p className="text-sm font-medium text-slate-100 truncate">{user?.fullName}</p>
        <p className="text-xs text-slate-400 truncate mb-2">{user?.email}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
