import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from '@/shared/lib/socket'
import type { AppNotification } from '../types'

// Mounted by the authenticated shell (AppLayout). Connects the singleton socket with the
// stored JWT, shows a toast + invalidates caches on each push, and tears down on unmount.
export function useNotificationSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = connectNotificationSocket(token)
    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })

    const onNew = (n: AppNotification) => {
      toast(n.title, { description: n.message })
      invalidate()
    }
    const onConnectError = (err: Error) => {
      if (err.message === 'Unauthorized') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }

    socket.on('notification:new', onNew)
    socket.on('connect_error', onConnectError)
    socket.io.on('reconnect', invalidate) // resync anything missed while disconnected

    return () => {
      socket.off('notification:new', onNew)
      socket.off('connect_error', onConnectError)
      socket.io.off('reconnect', invalidate)
      disconnectNotificationSocket()
    }
  }, [queryClient])
}
