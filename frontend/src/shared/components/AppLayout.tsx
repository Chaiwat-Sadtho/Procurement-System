import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

export function AppLayout() {
  const { data: user } = useCurrentUser()
  useNotificationSocket()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:ml-60">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-card px-4 lg:px-6">
          <MobileSidebar />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.fullName}</span>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
