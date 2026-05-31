import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

/**
 * 401 redirect ใช้กับ session ที่หมดอายุ (request ที่ต้อง auth) เท่านั้น —
 * ไม่ใช่กับ `/auth/login` ที่ 401 = รหัสผ่านผิด (ให้หน้า login แสดง error inline เอง
 * ไม่ reload หน้า มิฉะนั้น error วูบหาย).
 */
export function isUnauthorizedRedirect(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (error.response?.status !== 401) return false
  const url = error.config?.url ?? ''
  return !url.includes('/auth/login')
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
