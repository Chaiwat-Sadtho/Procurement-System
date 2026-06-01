import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { User } from '@/shared/types'
import { settingsApi } from '@/features/settings/api'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string(),
  lastName: z.string().min(1, 'Last name is required'),
})

type ProfileFormValues = z.infer<typeof schema>

export function ProfilePage() {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', middleName: '', lastName: '' },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        middleName: user.middleName ?? '',
        lastName: user.lastName,
      })
    }
  }, [user, form])

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof settingsApi.updateProfile>[0]) =>
      settingsApi.updateProfile(data),
    onSuccess: (updated: User) => {
      queryClient.setQueryData(['currentUser'], updated)
      toast.success('บันทึกโปรไฟล์เรียบร้อย')
    },
    onError: () => {
      toast.error('บันทึกโปรไฟล์ไม่สำเร็จ')
    },
  })

  function onSubmit(values: ProfileFormValues) {
    mutation.mutate({
      firstName: values.firstName,
      middleName: values.middleName.trim() === '' ? null : values.middleName,
      lastName: values.lastName,
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>ข้อมูลส่วนตัว</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Role</p>
            <p className="font-medium">{user?.role}</p>
          </div>
          {user?.department && (
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium">{user.department.name}</p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Middle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="(ไม่บังคับ)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
