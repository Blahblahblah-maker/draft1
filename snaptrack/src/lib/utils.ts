import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function compressImage(
  file: File,
  options: { maxWidth: number; quality: number }
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      const { maxWidth, quality } = options
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob((blob) => {
        resolve(blob!)
      }, 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}

export function toUserDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function calculateStreak(checkins: Array<{ day: Date }>): number {
  if (checkins.length === 0) return 0

  const sortedDays = checkins
    .map(c => new Date(c.day))
    .sort((a, b) => b.getTime() - a.getTime())

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < sortedDays.length; i++) {
    const checkinDay = new Date(sortedDays[i])
    checkinDay.setHours(0, 0, 0, 0)

    const expectedDay = new Date(today)
    expectedDay.setDate(today.getDate() - i)

    if (checkinDay.getTime() === expectedDay.getTime()) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export function generateSignedUrl(path: string, expiresIn: number = 3600): string {
  // This would be implemented with Supabase Storage signed URLs
  // For now, return a placeholder
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checkins/${path}`
}