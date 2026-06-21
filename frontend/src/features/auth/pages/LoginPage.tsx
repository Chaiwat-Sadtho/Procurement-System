import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Package, Pin } from 'lucide-react'
import { authApi } from '@/features/auth/api'
import { usePublicAnnouncements } from '@/features/announcements/hooks/usePublicAnnouncements'
import { getAnnouncementIcon } from '@/features/announcements/lib/announcementIcons'
import { Button } from '@/shared/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof schema>

const MAX_VISIBLE = 10

export function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: announcements } = usePublicAnnouncements()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: LoginFormValues) => authApi.login(data),
    onSuccess: (data) => {
      localStorage.setItem('token', data.access_token)
      queryClient.clear()
      navigate('/dashboard')
    },
  })

  const visible = (announcements ?? []).slice(0, MAX_VISIBLE)

  return (
    <div className="grid min-h-screen lg:grid-cols-12">
      <aside
        aria-label="ประกาศและข่าวสาร"
        className="hidden bg-slate-900 p-12 text-slate-100 lg:col-span-8 lg:flex lg:flex-col"
      >
        <div className="flex items-center gap-2 text-white">
          <Package className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Procurement System</span>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-white">ประกาศ / ข่าวสาร</h2>
          {visible.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">ยังไม่มีประกาศ</p>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-4">
              {visible.map((item) => {
                const Icon = getAnnouncementIcon(item.icon)
                return (
                  <li
                    key={item.id}
                    className={cn(
                      'rounded-lg border p-4',
                      item.isPinned
                        ? 'border-l-4 border-primary/60 bg-primary/10'
                        : 'border-slate-700/60 bg-white/5',
                    )}
                  >
                    {item.isPinned && (
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>ปักหมุด</span>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-0.5 text-sm text-slate-300">{item.detail}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="mt-auto pt-8 text-xs text-slate-400">© 2026 Procurement System</p>
      </aside>

      <main className="col-span-12 flex items-center justify-center bg-background p-6 lg:col-span-4">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">เข้าสู่ระบบเพื่อจัดการงานจัดซื้อ</p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p data-testid="login-error" className="min-h-[1.25rem] text-sm text-destructive">
                {mutation.isError ? 'Invalid email or password' : ''}
              </p>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>
        </div>
      </main>
    </div>
  )
}
