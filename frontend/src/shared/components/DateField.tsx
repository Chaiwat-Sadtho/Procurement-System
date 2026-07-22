import { useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Calendar } from '@/shared/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import {
  buddhistTextToIso,
  dateToIso,
  isoToBuddhistText,
  isoToDate,
  maskBuddhistDate,
} from '@/shared/lib/buddhistDate'

interface DateFieldProps {
  id?: string
  value: string // ISO 'YYYY-MM-DD' หรือ ''
  onChange: (iso: string) => void
  error?: string // ข้อความ error จาก form (required/ช่วงวันที่) — แสดงในบรรทัดเดียวกับ invalid-format
}

const captionFormatter = (date: Date) =>
  new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(date)

export function DateField({ id, value, onChange, error }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => (value ? isoToBuddhistText(value) : ''))

  // Re-sync the displayed text when value changes from outside (reset/default) without overwriting
  // what the user is typing. Adjusting state during render avoids a second cascading render.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== buddhistTextToIso(text)) {
      setText(value ? isoToBuddhistText(value) : '')
    }
  }

  function handleInput(raw: string) {
    const masked = maskBuddhistDate(raw)
    setText(masked)
    onChange(buddhistTextToIso(masked))
  }

  function handleSelect(date: Date | undefined) {
    if (!date) return
    const iso = dateToIso(date)
    setText(isoToBuddhistText(iso))
    onChange(iso)
    setOpen(false)
  }

  // Only complain once DD/MM/YYYY is fully typed but impossible — no nagging mid-entry
  const isComplete = /^\d{2}\/\d{2}\/\d{4}$/.test(text)
  const showInvalid = isComplete && buddhistTextToIso(text) === ''
  // the format error wins over the form's (e.g. "required") — it matches what was just typed
  const message = showInvalid ? 'กรุณากรอกวันที่ให้ถูกต้อง' : (error ?? '')

  return (
    <div>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          placeholder="วว/ดด/ปปปป"
          value={text}
          onChange={(e) => handleInput(e.target.value)}
          className="pr-10"
          aria-invalid={showInvalid || Boolean(error) || undefined}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="เปิดปฏิทิน"
              className="absolute right-0 top-0 h-10 w-10 text-muted-foreground"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={isoToDate(value)}
              defaultMonth={isoToDate(value)}
              onSelect={handleSelect}
              formatters={{ formatCaption: captionFormatter }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <p className="mt-1 min-h-[1.25rem] text-sm text-destructive">{message}</p>
    </div>
  )
}
