import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

/**
 * A 401 means "session expired" everywhere except these paths, where it means "wrong credentials" and
 * the form shows the error itself. Redirecting there would flash the error away and log the user out
 * while their session is still valid.
 */
const CREDENTIAL_CHECK_PATHS = ['/auth/login', '/auth/me/password']

export function isUnauthorizedRedirect(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (error.response?.status !== 401) return false
  const url = error.config?.url ?? ''
  return !CREDENTIAL_CHECK_PATHS.some((path) => url.includes(path))
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (isUnauthorizedRedirect(error)) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
