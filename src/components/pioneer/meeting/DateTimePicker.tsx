import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Clock } from 'lucide-react'

interface DateTimePickerProps {
  date: string   // YYYY-MM-DD
  time: string   // HH:MM
  onDateChange: (v: string) => void
  onTimeChange: (v: string) => void
  maxDate?: string  // YYYY-MM-DD — ห้ามเกิน milestone due_date
}

const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

function pad(n: number) { return String(n).padStart(2,'0') }

function fmtDisplay(date: string, time: string) {
  if (!date) return 'Pick a date'
  const d = new Date(date + 'T00:00:00')
  const day = d.getDate()
  const month = MONTHS_TH[d.getMonth()]
  const year = d.getFullYear()
  const t = time || '00:00'
  return `${day} ${month} ${year}  ${t}`
}

export default function DateTimePicker({ date, time, onDateChange, onTimeChange, maxDate }: DateTimePickerProps) {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`

  const initYear  = date ? parseInt(date.slice(0,4)) : now.getFullYear()
  const initMonth = date ? parseInt(date.slice(5,7)) - 1 : now.getMonth()

  const [open, setOpen]           = useState(false)
  const [viewYear, setViewYear]   = useState(initYear)
  const [viewMonth, setViewMonth] = useState(initMonth)
  const [showTime, setShowTime]   = useState(false)
  const [localH, setLocalH]       = useState(time ? time.slice(0,2) : pad(now.getHours()))
  const [localM, setLocalM]       = useState(time ? time.slice(3,5) : pad(now.getMinutes()))
  const [timeError, setTimeError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const firstDay    = (y: number, m: number) => new Date(y, m, 1).getDay()

  const isPastDay = (d: number) => {
    const dayStr = `${viewYear}-${pad(viewMonth+1)}-${pad(d)}`
    return dayStr < todayStr
  }
  const isBeyondMax = (d: number) => {
    if (!maxDate) return false
    const dayStr = `${viewYear}-${pad(viewMonth+1)}-${pad(d)}`
    return dayStr > maxDate
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const selectDay = (d: number) => {
    if (isPastDay(d) || isBeyondMax(d)) return
    const newDate = `${viewYear}-${pad(viewMonth+1)}-${pad(d)}`
    onDateChange(newDate)
    // ถ้าเป็นวันนี้และ time ปัจจุบันผ่านไปแล้ว ให้ reset time
    if (newDate === todayStr) {
      const currentNow = new Date()
      const currentH = parseInt(localH)
      const currentM = parseInt(localM)
      if (currentH < currentNow.getHours() || (currentH === currentNow.getHours() && currentM <= currentNow.getMinutes())) {
        const nextMinute = new Date(currentNow.getTime() + 60_000)
        setLocalH(pad(nextMinute.getHours()))
        setLocalM(pad(nextMinute.getMinutes()))
      }
    }
    setTimeError('')
  }

  const validateTime = (h: string, m: string): string => {
    if (!date) return ''
    if (date === todayStr) {
      const currentNow = new Date()
      const selH = parseInt(h)
      const selM = parseInt(m)
      if (selH < currentNow.getHours() || (selH === currentNow.getHours() && selM <= currentNow.getMinutes())) {
        return `เวลาผ่านไปแล้ว กรุณาเลือกหลัง ${pad(currentNow.getHours())}:${pad(currentNow.getMinutes())}`
      }
    }
    return ''
  }

  const changeH = (newH: string) => {
    setLocalH(newH)
    setTimeError(validateTime(newH, localM))
  }
  const changeM = (newM: string) => {
    setLocalM(newM)
    setTimeError(validateTime(localH, newM))
  }

  const handleDone = () => {
    const err = validateTime(localH, localM)
    if (err) { setTimeError(err); return }
    onTimeChange(`${localH}:${localM}`)
    setOpen(false)
  }

  const isSelected = (d: number) => {
    if (!date) return false
    return date === `${viewYear}-${pad(viewMonth+1)}-${pad(d)}`
  }
  const isToday = (d: number) =>
    `${viewYear}-${pad(viewMonth+1)}-${pad(d)}` === todayStr

  const cells = firstDay(viewYear, viewMonth)
  const total = daysInMonth(viewYear, viewMonth)
  const maxYear = maxDate ? parseInt(maxDate.slice(0, 4)) : now.getFullYear() + 1
  const years = Array.from(
    { length: Math.max(1, maxYear - now.getFullYear() + 1) },
    (_, i) => now.getFullYear() + i,
  )

  // ปิดปุ่ม prevMonth ถ้าเดือนปัจจุบัน <= ปัจจุบัน
  const canGoPrev = viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth())

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          if (!open && time) { setLocalH(time.slice(0,2)); setLocalM(time.slice(3,5)) }
          setOpen(o => !o)
        }}
        className={`w-full flex items-center gap-2 border rounded-[8px] px-3 py-2.5 text-[14px] text-left transition-colors cursor-pointer ${open ? 'border-primary' : 'border-border hover:border-primary/50'} ${!date ? 'text-muted-foreground' : 'text-foreground'}`}
      >
        <Calendar size={15} className="text-muted-foreground shrink-0" />
        <span>{fmtDisplay(date, time)}</span>
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1 bg-white rounded-[14px] border border-border shadow-xl w-[320px]">

          {/* Calendar header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-2">
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canGoPrev}
              className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>

            <div className="flex items-center gap-2 flex-1 justify-center">
              <select
                value={viewMonth}
                onChange={e => setViewMonth(Number(e.target.value))}
                className="text-[13px] font-semibold border border-border rounded-[6px] px-2 py-1 outline-none focus:border-primary bg-white cursor-pointer"
              >
                {MONTHS_EN.map((m, i) => (
                  <option key={m} value={i} disabled={viewYear === now.getFullYear() && i < now.getMonth()}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={viewYear}
                onChange={e => setViewYear(Number(e.target.value))}
                className="text-[13px] font-semibold border border-border rounded-[6px] px-2 py-1 outline-none focus:border-primary bg-white cursor-pointer"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <button type="button" onClick={nextMonth} className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer">
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-3 pb-2">
            {Array.from({ length: cells }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: total }, (_, i) => i + 1).map(d => {
              const past = isPastDay(d)
              const beyond = isBeyondMax(d)
              const disabled = past || beyond
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => selectDay(d)}
                  disabled={disabled}
                  title={beyond && maxDate ? `ไม่สามารถเกิน ${maxDate}` : undefined}
                  className={`
                    aspect-square w-full flex items-center justify-center rounded-full text-[13px] transition-colors
                    ${disabled
                      ? 'text-muted-foreground/30 cursor-not-allowed'
                      : isSelected(d)
                      ? 'bg-gray-900 text-white font-semibold cursor-pointer'
                      : isToday(d)
                      ? 'bg-gray-100 text-foreground font-semibold cursor-pointer hover:bg-gray-200'
                      : 'hover:bg-muted text-foreground cursor-pointer'}
                  `}
                >
                  {d}
                </button>
              )
            })}
          </div>

          {/* Time picker */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setShowTime(t => !t)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-[13px] text-foreground">
                <Clock size={14} className="text-muted-foreground" />
                <span>{localH}:{localM}</span>
                {timeError && <span className="text-[11px] text-red-500 ml-1">{timeError}</span>}
              </div>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showTime ? 'rotate-180' : ''}`} />
            </button>

            {showTime && (
              <div className="px-4 pb-3 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-3">
                  {/* Hour */}
                  <div className="flex flex-col items-center">
                    <button type="button" onClick={() => changeH(pad((parseInt(localH)+1)%24))} className="p-1 hover:bg-muted rounded cursor-pointer"><ChevronLeft size={14} className="rotate-90" /></button>
                    <input
                      type="number" min={0} max={23}
                      value={parseInt(localH)}
                      onChange={e => changeH(pad(Math.min(23, Math.max(0, Number(e.target.value)))))}
                      className="w-12 text-center text-[18px] font-semibold border border-border rounded-[6px] py-1 outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => changeH(pad((parseInt(localH)-1+24)%24))} className="p-1 hover:bg-muted rounded cursor-pointer"><ChevronLeft size={14} className="-rotate-90" /></button>
                  </div>
                  <span className="text-[20px] font-bold text-muted-foreground mb-0.5">:</span>
                  {/* Minute */}
                  <div className="flex flex-col items-center">
                    <button type="button" onClick={() => changeM(pad((parseInt(localM)+1)%60))} className="p-1 hover:bg-muted rounded cursor-pointer"><ChevronLeft size={14} className="rotate-90" /></button>
                    <input
                      type="number" min={0} max={59}
                      value={parseInt(localM)}
                      onChange={e => changeM(pad(Math.min(59, Math.max(0, Number(e.target.value)))))}
                      className="w-12 text-center text-[18px] font-semibold border border-border rounded-[6px] py-1 outline-none focus:border-primary"
                    />
                    <button type="button" onClick={() => changeM(pad((parseInt(localM)-1+60)%60))} className="p-1 hover:bg-muted rounded cursor-pointer"><ChevronLeft size={14} className="-rotate-90" /></button>
                  </div>
                </div>
                {timeError && (
                  <p className="text-[11px] text-red-500 text-center">{timeError}</p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-[12px] text-muted-foreground">Timezone: Local</span>
            <button
              type="button"
              onClick={handleDone}
              className="px-4 py-1.5 bg-gray-900 text-white text-[13px] font-semibold rounded-[8px] hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
