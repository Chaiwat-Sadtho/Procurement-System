const BE_OFFSET = 543

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** ISO 'YYYY-MM-DD' (ค.ศ.) → 'DD/MM/YYYY' (พ.ศ.). ผิดรูปแบบ/ว่าง → '' */
export function isoToBuddhistText(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${Number(m[1]) + BE_OFFSET}`
}

/** เก็บเฉพาะตัวเลข, จำกัด 8 หลัก (DDMMYYYY), ใส่ slash สำหรับแสดงผลขณะพิมพ์ */
export function maskBuddhistDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  const parts = [d.slice(0, 2)]
  if (d.length > 2) parts.push(d.slice(2, 4))
  if (d.length > 4) parts.push(d.slice(4, 8))
  return parts.filter((p) => p.length > 0).join('/')
}

/** 'DD/MM/YYYY' (พ.ศ., ปี 4 หลัก) → ISO 'YYYY-MM-DD' (ค.ศ.). ไม่ครบ/วันที่ผิด → '' */
export function buddhistTextToIso(text: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!m) return ''
  const day = Number(m[1])
  const month = Number(m[2])
  const ceYear = Number(m[3]) - BE_OFFSET
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  // round-trip ผ่าน Date จริงเพื่อตัดวันที่เป็นไปไม่ได้ (31/02 ฯลฯ)
  const probe = new Date(ceYear, month - 1, day)
  if (probe.getFullYear() !== ceYear || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return ''
  }
  // format มือ — ห้าม toISOString() (UTC ลดวันใน +07:00)
  return `${ceYear}-${pad2(month)}-${pad2(day)}`
}

/** local Date → ISO 'YYYY-MM-DD' (ไม่ shift). ใช้ตอนคลิกปฏิทิน */
export function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** ISO 'YYYY-MM-DD' → local Date (เที่ยงคืน). ใช้ set selected/defaultMonth ปฏิทิน. '' → undefined */
export function isoToDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return undefined
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
