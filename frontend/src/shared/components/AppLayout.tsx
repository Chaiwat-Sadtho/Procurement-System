import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'

export function AppLayout() {
  const { data: user } = useCurrentUser()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen">
        <header className="h-14 bg-card border-b flex items-center justify-end px-6 sticky top-0 z-10 shrink-0">
          <span className="text-sm text-muted-foreground">{user?.fullName}</span>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
