export type Role = 'employee' | 'manager' | 'procurement_officer'

export interface Department {
  id: number
  name: string
  createdAt: string
}

export interface User {
  id: number
  email: string
  firstName: string
  middleName: string | null
  lastName: string
  fullName: string
  role: Role
  isActive: boolean
  departmentId: number | null
  department?: Department
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}
