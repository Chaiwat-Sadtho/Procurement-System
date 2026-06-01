import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { StatCards } from '../components/StatCards'
import { StatusChart } from '../components/StatusChart'
import { AttentionList } from '../components/AttentionList'
import { ApprovalQueue } from '../components/ApprovalQueue'
import { BudgetSummary } from '../components/BudgetSummary'
import { RecentPRsTable } from '../components/RecentPRsTable'
import { useStats } from '../hooks/useStats'

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const role = user?.role
  const { data: stats, isLoading: statsLoading } = useStats()

  const isManager = role === 'manager'
  const isPO = role === 'procurement_officer'
  const isEmployee = role === 'employee'

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        action={
          isEmployee ? (
            <Button asChild><Link to="/purchase-requests/new">New PR</Link></Button>
          ) : undefined
        }
      />

      {isManager && <ApprovalQueue />}

      <StatCards stats={stats} isLoading={statsLoading} role={role} />

      {isEmployee && <AttentionList stats={stats} />}

      {(isPO || isManager) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {isPO && <StatusChart stats={stats} isLoading={statsLoading} />}
          <BudgetSummary scope={isManager ? { departmentId: user?.departmentId ?? undefined } : {}} />
        </div>
      )}

      <RecentPRsTable />
    </div>
  )
}
