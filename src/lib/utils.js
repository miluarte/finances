import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value ?? 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr + 'T00:00:00'))
}

export function getMonthYear(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(monthYear) {
  const [year, month] = monthYear.split('-')
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(+year, +month - 1))
}
