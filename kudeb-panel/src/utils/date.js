import { format, parseISO, isPast, isWithinInterval, addDays, isValid } from 'date-fns'
import { tr } from 'date-fns/locale'

export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return dateStr
    return format(d, 'dd.MM.yyyy', { locale: tr })
  } catch {
    return dateStr
  }
}

export const getVadeDurumu = (vadeTarihi) => {
  if (!vadeTarihi) return null
  try {
    const d = parseISO(vadeTarihi)
    if (!isValid(d)) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isPast(d) && d < today) return 'gecmis'
    if (isWithinInterval(d, { start: today, end: addDays(today, 7) })) return 'yaklasan'
    return 'normal'
  } catch {
    return null
  }
}

export const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return dateStr
    return format(d, "d MMMM yyyy", { locale: tr })
  } catch {
    return dateStr
  }
}
