import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { navItems, SIDEBAR_GROUP_STORAGE_PREFIX } from './sidebar-nav'
import type { NavLinkItem, NavGroupItem } from './sidebar-nav'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  )
}

function NavLeaf({ item, onNavigate }: { item: NavLinkItem; onNavigate?: () => void }) {
  return (
    <li>
      <NavLink to={item.path} onClick={onNavigate} className={navLinkClass}>
        {item.label}
      </NavLink>
    </li>
  )
}

export function NavGroupSection({
  group,
  onNavigate,
}: {
  group: NavGroupItem
  onNavigate?: () => void
}) {
  const { data: user } = useCurrentUser()
  const location = useLocation()

  const children = group.children.filter(
    (child) => user && child.allowedRoles.includes(user.role),
  )

  const storageKey = `${SIDEBAR_GROUP_STORAGE_PREFIX}${group.label}`
  // Persisted preference is read once at mount. An explicit in-session toggle
  // (userToggled) always takes precedence so the header is never a dead control
  // — even on an active-child route the button stays operable (a11y).
  const [persistedCollapsed] = useState(
    () => localStorage.getItem(storageKey) === 'collapsed',
  )
  const [userToggled, setUserToggled] = useState<boolean | null>(null)

  // Role emptied every child → render nothing (no orphan header).
  if (children.length === 0) return null

  const contentId = `nav-group-${group.label}`
  const hasActiveChild = children.some(
    (child) =>
      location.pathname === child.path ||
      location.pathname.startsWith(`${child.path}/`),
  )
  // Default (no explicit click yet): expanded unless persisted-collapsed, but an
  // active child route forces it open, overriding the persisted collapsed state
  // (spec §8). An explicit user toggle overrides both so the control always works.
  const expanded = userToggled ?? (hasActiveChild || !persistedCollapsed)

  function toggle() {
    const next = !expanded
    setUserToggled(next)
    localStorage.setItem(storageKey, next ? 'expanded' : 'collapsed')
  }

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={expanded ? contentId : undefined}
        className="flex w-full items-center justify-between px-3 py-2 text-sm rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <span>{group.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', expanded ? '' : '-rotate-90')}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <ul id={contentId} className="mt-1 space-y-1 pl-3">
          {children.map((child) => (
            <NavLeaf key={child.path} item={child} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  )
}

// Shared nav body used by both the desktop Sidebar and the mobile drawer.
// onNavigate lets the mobile drawer close itself when a link is tapped.
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useCurrentUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function handleLogout() {
    localStorage.removeItem('token')
    queryClient.clear()
    onNavigate?.()
    navigate('/login')
  }

  return (
    <>
      <div className="h-14 flex items-center px-6 border-b border-slate-800 shrink-0">
        <span className="font-semibold text-white">Procurement</span>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((entry) => {
            if (entry.kind === 'group') {
              return <NavGroupSection key={entry.label} group={entry} onNavigate={onNavigate} />
            }
            if (!user || !entry.allowedRoles.includes(user.role)) return null
            return <NavLeaf key={entry.path} item={entry} onNavigate={onNavigate} />
          })}
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
    </>
  )
}

export function Sidebar() {
  return (
    <aside
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 lg:flex"
    >
      <SidebarContent />
    </aside>
  )
}
