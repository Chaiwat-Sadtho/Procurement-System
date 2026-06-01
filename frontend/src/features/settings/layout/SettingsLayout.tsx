import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/components/PageHeader'

const tabs = [
  { label: 'Profile', path: '/settings/profile' },
  { label: 'Security', path: '/settings/security' },
]

export function SettingsLayout() {
  return (
    <div>
      <PageHeader title="Settings" description="จัดการโปรไฟล์และความปลอดภัยของบัญชี" />
      <div className="flex gap-2 border-b mb-6">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
