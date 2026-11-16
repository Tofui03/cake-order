const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function todayIso(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) throw new Error(`Invalid date: ${isoDate}`)
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  date.setDate(date.getDate() + days)
  return todayIso(date)
}

export function tomorrowIso(now = new Date()): string {
  return addDays(todayIso(now), 1)
}

export function quickPickupOptions(now = new Date()): { label: string; iso: string }[] {
  const tomorrow = tomorrowIso(now)
  const dayAfter = addDays(todayIso(now), 2)
  const day = now.getDay()
  const daysToSat = (6 - day + 7) % 7 || 7
  const sat = addDays(todayIso(now), daysToSat)
  const options = [
    { label: 'Tomorrow', iso: tomorrow },
    { label: 'In 2 days', iso: dayAfter },
  ]
  if (sat !== tomorrow && sat !== dayAfter) {
    options.push({ label: daysToSat <= 7 - day ? 'This Sat' : 'Next Sat', iso: sat })
  }
  return options
}

export function isOnOrAfter(isoDate: string, minIso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) && isoDate >= minIso
}

/** 11月16日 周一 — calendar date, not UTC midnight. */
export function formatPickupDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) throw new Error(`Invalid date: ${isoDate}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid date: ${isoDate}`)
  }
  return `${WEEKDAYS[date.getDay()]}, ${day} ${MONTHS[month - 1]}`
}
