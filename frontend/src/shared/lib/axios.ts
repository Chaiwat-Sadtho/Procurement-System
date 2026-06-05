import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

/**
 * 401 redirect ใช้กับ session ที่หมดอายุ (request ที่ต้อง auth) เท่านั้น —
 * ไม่ใช่กับ 401 ที่แปลว่า "credential ที่กรอกผิด" ไม่ใช่ "session หมด":
 * - `/auth/login` (รหัสผ่าน login ผิด) → ให้หน้า login แสดง error inline
 * - `/auth/me/password` (รหัสผ่านปัจจุบันผิดตอนเปลี่ยนรหัส) → ให้ฟอร์มแสดง toast เอง
 * มิฉะนั้นจะ reload/redirect แล้ว error วูบหาย + ผู้ใช้โดน logout ทั้งที่ session ยังดี.
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
