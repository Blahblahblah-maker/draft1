'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { habitSchema, type HabitPayload } from '@/lib/validators'

export default function NewHabitPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<HabitPayload>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: '',
      description: '',
      frequency: 'DAILY',
      isPublic: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const createHabitMutation = useMutation({
    mutationFn: async (data: HabitPayload) => {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create habit')
      return response.json()
    },
    onSuccess: (habit) => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      router.push(`/habits/${habit.id}`)
    },
  })

  const onSubmit = async (data: HabitPayload) => {
    setIsSubmitting(true)
    try {
      await createHabitMutation.mutateAsync(data)
    } catch (error) {
      console.error('Error creating habit:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Habit</CardTitle>
          <CardDescription>
            Set up a new habit you want to track with daily photo check-ins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Habit Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Habit Name *
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Daily Walk, Morning Meditation"
              />
              {errors.name && (
                <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description (optional)
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={3}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What does this habit mean to you?"
              />
            </div>

            {/* Frequency */}
            <div>
              <label htmlFor="frequency" className="block text-sm font-medium mb-2">
                Frequency *
              </label>
              <select
                {...register('frequency')}
                id="frequency"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKDAYS">Weekdays only</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            {/* Reminder Time */}
            <div>
              <label htmlFor="reminderHour" className="block text-sm font-medium mb-2">
                Reminder Time (optional)
              </label>
              <select
                {...register('reminderHour', { valueAsNumber: true })}
                id="reminderHour"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No reminder</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </option>
                ))}
              </select>
            </div>

            {/* Public Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="isPublic" className="block text-sm font-medium">
                  Make Public
                </label>
                <p className="text-sm text-gray-600">
                  Allow others to view your progress
                </p>
              </div>
              <input
                {...register('isPublic')}
                type="checkbox"
                id="isPublic"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || createHabitMutation.isPending}
              className="w-full"
            >
              {isSubmitting || createHabitMutation.isPending ? (
                'Creating...'
              ) : (
                'Create Habit'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}