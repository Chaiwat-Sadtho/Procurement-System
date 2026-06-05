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
  department?: Department | null
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

/** Query params shared by every paginated list endpoint. */
export interface PaginationParams {
  page?: number
  limit?: number
}

/** Options for list-query hooks that can be conditionally disabled. */
export interface QueryEnabledOptions {
  enabled?: boolean
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}
