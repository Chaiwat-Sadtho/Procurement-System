import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/shared/components/AppLayout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { PRListPage } from '@/features/purchase-requests/pages/PRListPage'
import { PRDetailPage } from '@/features/purchase-requests/pages/PRDetailPage'

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      {title} — Coming Soon
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <ComingSoon title="Dashboard" /> },
      { path: 'purchase-requests', element: <PRListPage /> },
      {
        path: 'purchase-requests/new',
        element: (
          <ProtectedRoute allowedRoles={['employee']}>
            <ComingSoon title="New Purchase Request" />
          </ProtectedRoute>
        ),
      },
      { path: 'purchase-requests/:id', element: <PRDetailPage /> },
      {
        path: 'purchase-requests/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['employee']}>
            <ComingSoon title="Edit Purchase Request" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendors',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Vendors" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendors/new',
        element: (
          <ProtectedRoute allowedRoles={['procurement_officer']}>
            <ComingSoon title="New Vendor" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendors/:id',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Vendor Detail" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'vendors/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['procurement_officer']}>
            <ComingSoon title="Edit Vendor" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'purchase-orders',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Purchase Orders" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'purchase-orders/new',
        element: (
          <ProtectedRoute allowedRoles={['procurement_officer']}>
            <ComingSoon title="New Purchase Order" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'purchase-orders/:id',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Purchase Order Detail" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'purchase-orders/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={['procurement_officer']}>
            <ComingSoon title="Edit Purchase Order" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'goods-receipts',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Goods Receipts" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'goods-receipts/new',
        element: (
          <ProtectedRoute allowedRoles={['procurement_officer']}>
            <ComingSoon title="New Goods Receipt" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'goods-receipts/:id',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Goods Receipt Detail" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'budgets',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Budgets" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'budgets/new',
        element: (
          <ProtectedRoute allowedRoles={['procurement_officer']}>
            <ComingSoon title="New Budget" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'budgets/:id',
        element: (
          <ProtectedRoute allowedRoles={['manager', 'procurement_officer']}>
            <ComingSoon title="Budget Detail" />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['procurement_officer']}>
            <ComingSoon title="Users" />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <h2 className="text-2xl font-semibold">404</h2>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])
