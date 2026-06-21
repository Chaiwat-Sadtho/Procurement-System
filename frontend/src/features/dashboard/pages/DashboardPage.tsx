import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { PageHeader } from '@/shared/components/PageHeader'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { StatCards } from '../components/StatCards'
import { StatusChart } from '../components/StatusChart'
import { PrTrendChart } from '../components/PrTrendChart'
import { SpendByDeptChart } from '../components/SpendByDeptChart'
import { AttentionList } from '../components/AttentionList'
import { ApprovalQueue } from '../components/ApprovalQueue'
import { BudgetSummary } from '../components/BudgetSummary'
import { RecentPRsTable } from '../components/RecentPRsTable'
import { useStats } from '../hooks/useStats'
import { useTrend } from '../hooks/useTrend'
import { useSpendByDept } from '../hooks/useSpendByDept'

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const role = user?.role
  const isManager = role === 'manager'
  const isPO = role === 'procurement_officer'
  const isEmployee = role === 'employee'
  const showAnalytics = isManager || isPO

  const { data: stats, isLoading: statsLoading } = useStats()
  const { data: trend, isLoading: trendLoading } = useTrend()
  const { data: spend, isLoading: spendLoading } = useSpendByDept(isPO)

  return (
    <div className="space-y-8">
      <PageHeader
        title="แดชบอร์ด"
        action={
          isEmployee ? (
            <Button asChild>
              <Link to="/purchase-requests/new">New PR</Link>
            </Button>
          ) : undefined
        }
      />

      {isManager && <ApprovalQueue />}

      <StatCards stats={stats} isLoading={statsLoading} role={role} />

      {isEmployee && <AttentionList />}

      {showAnalytics && <PrTrendChart data={trend} isLoading={trendLoading} />}

      {showAnalytics && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <StatusChart stats={stats} isLoading={statsLoading} />
          {isPO && <SpendByDeptChart data={spend} isLoading={spendLoading} />}
          <BudgetSummary
            scope={isManager ? { departmentId: user?.departmentId ?? undefined } : {}}
          />
        </div>
      )}

      <RecentPRsTable />
    </div>
  )
}
