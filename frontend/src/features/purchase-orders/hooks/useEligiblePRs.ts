import { useQuery } from '@tanstack/react-query'
import type { QueryEnabledOptions } from '@/shared/types'
import { purchaseRequestsApi } from '@/features/purchase-requests/api'

// Pre-filtered PR list for the PO create picker (approved + has department +
// no active PO). The flag is resolved server-side (slice A); limit is bumped so
// the Combobox shows every eligible PR without paging.
const ELIGIBLE_PRS_PARAMS = { eligibleForPo: true, limit: 100 } as const

export function useEligiblePRs({ enabled = true }: QueryEnabledOptions = {}) {
  return useQuery({
    queryKey: ['purchase-requests', { eligibleForPo: true }],
    queryFn: () => purchaseRequestsApi.list(ELIGIBLE_PRS_PARAMS),
    enabled,
  })
}
