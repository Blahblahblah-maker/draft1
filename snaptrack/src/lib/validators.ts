import { z } from 'zod'

export const habitSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKDAYS', 'CUSTOM']).default('DAILY'),
  startDate: z.date().default(() => new Date()),
  endDate: z.date().optional(),
  isPublic: z.boolean().default(false),
  reminderHour: z.number().min(0).max(23).optional(),
  timeZone: z.string().default('UTC'),
  coverImageUrl: z.string().optional(),
})

export const checkinSchema = z.object({
  takenAt: z.date(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Day must be in YYYY-MM-DD format'),
  note: z.string().max(200, 'Note must be less than 200 characters').optional(),
  imageBase64: z.string().optional(),
})

export type HabitPayload = z.infer<typeof habitSchema>
export type CheckinPayload = z.infer<typeof checkinSchema>