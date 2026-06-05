import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api'
import type { Role } from '@/shared/types'

export function useUserMutations() {
  const queryClient = useQueryClient()

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      usersApi.updateStatus(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return { updateRoleMutation, updateStatusMutation }
}
