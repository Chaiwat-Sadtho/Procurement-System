import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { User } from '@/shared/types'
import { settingsApi } from '@/features/settings/api'
import { ROLE_LABELS } from '@/features/users/lib/roleLabels'
import { useCurrentUser } from '@/shared/hooks/useCurrentUser'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
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
  firstName: z.string().min(1, 'กรุณากรอกชื่อจริง'),
  middleName: z.string(),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
})

type ProfileFormValues = z.infer<typeof schema>

export function ProfilePage() {
  const { data: user } = useCurrentUser()
  const queryClient = useQueryClient()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', middleName: '', lastName: '' },
  })
  const { isDirty } = form.formState

  useEffect(() => {
    // sync from server only when there are no unsaved edits — a background
    // refetch (refetchOnWindowFocus) must not clobber what the user is typing
    if (user && !isDirty) {
      form.reset({
        firstName: user.firstName ?? '',
        middleName: user.middleName ?? '',
        lastName: user.lastName ?? '',
      })
    }
  }, [user, isDirty, form])

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof settingsApi.updateProfile>[0]) =>
      settingsApi.updateProfile(data),
    onSuccess: (updated: User) => {
      queryClient.setQueryData(['currentUser'], updated)
      // re-sync to the saved values so the form is clean again — Save disables
      // itself and a second click cannot fire a duplicate request
      form.reset({
        firstName: updated.firstName ?? '',
        middleName: updated.middleName ?? '',
        lastName: updated.lastName ?? '',
      })
      toast.success('บันทึกโปรไฟล์เรียบร้อย')
    },
    onError: () => {
      toast.error('บันทึกโปรไฟล์ไม่สำเร็จ')
    },
  })

  function onSubmit(values: ProfileFormValues) {
    const middleName = values.middleName.trim()
    mutation.mutate({
      firstName: values.firstName.trim(),
      middleName: middleName === '' ? null : middleName,
      lastName: values.lastName.trim(),
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
            <p className="text-muted-foreground">อีเมล</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">บทบาท</p>
            <p className="font-medium">{user ? ROLE_LABELS[user.role] : ''}</p>
          </div>
          {user?.department && (
            <div>
              <p className="text-muted-foreground">แผนก</p>
              <p className="font-medium">{user.department.name}</p>
            </div>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อจริง</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>นามสกุล</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="middleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อกลาง</FormLabel>
                  <FormControl>
                    <Input placeholder="(ไม่บังคับ)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={mutation.isPending || !isDirty}>
              บันทึก
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
