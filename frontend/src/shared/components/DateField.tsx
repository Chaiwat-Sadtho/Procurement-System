import { useEffect, useState } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Calendar } from '@/shared/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
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
}

const captionFormatter = (date: Date) =>
  new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(date)

export function DateField({ id, value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(() => (value ? isoToBuddhistText(value) : ''))

  // sync ข้อความที่แสดงเมื่อ value เปลี่ยนจากภายนอก (reset/default) — ไม่ทับตอนกำลังพิมพ์
  useEffect(() => {
    if (value !== buddhistTextToIso(text)) {
      setText(value ? isoToBuddhistText(value) : '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

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

  return (
    <div className="relative">
      <Input
        id={id}
        inputMode="numeric"
        placeholder="วว/ดด/ปปปป"
        value={text}
        onChange={(e) => handleInput(e.target.value)}
        className="pr-10"
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
  )
}
