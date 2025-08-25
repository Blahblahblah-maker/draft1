'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Camera, Share2 } from 'lucide-react'
import Link from 'next/link'
import { CheckinDialog } from '@/components/CheckinDialog'
import { calculateStreak } from '@/lib/utils'

interface Checkin {
  id: string
  day: Date
  takenAt: Date
  note?: string
  imagePath: string
}

interface Habit {
  id: string
  name: string
  description?: string
  frequency: string
  isPublic: boolean
  checkins: Checkin[]
}

export default function HabitDetailPage({ params }: { params: { id: string } }) {
  const { data: habit, isLoading, error } = useQuery<Habit>({
    queryKey: ['habit', params.id],
    queryFn: async () => {
      const response = await fetch(`/api/habits/${params.id}`)
      if (!response.ok) throw new Error('Failed to fetch habit')
      return response.json()
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded-2xl"></div>
          <div className="h-32 bg-gray-200 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (error || !habit) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading habit. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const streak = calculateStreak(habit.checkins)
  const today = new Date().toISOString().split('T')[0]
  const todayCheckin = habit.checkins.find(
    checkin => new Date(checkin.day).toISOString().split('T')[0] === today
  )

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex gap-2">
          {habit.isPublic && (
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}
          <Link href={`/habits/${habit.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Habit Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{habit.name}</CardTitle>
              {habit.description && (
                <CardDescription>{habit.description}</CardDescription>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{streak}</div>
              <div className="text-sm text-gray-600">day streak</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Frequency: {habit.frequency}
            </div>
            {!todayCheckin && (
              <CheckinDialog habitId={habit.id} habitName={habit.name}>
                <Button>
                  <Camera className="h-4 w-4 mr-2" />
                  Check In Today
                </Button>
              </CheckinDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs text-gray-500 p-2">
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const date = new Date()
              date.setDate(1)
              date.setDate(date.getDate() - date.getDay() + i)
              
              const checkin = habit.checkins.find(
                c => new Date(c.day).toDateString() === date.toDateString()
              )
              
              return (
                <div
                  key={i}
                  className={`aspect-square p-1 ${
                    checkin
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  } rounded text-xs flex items-center justify-center`}
                >
                  {date.getDate()}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Check-ins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {habit.checkins.length > 0 ? (
            <div className="space-y-4">
              {habit.checkins.slice(0, 5).map((checkin) => (
                <div key={checkin.id} className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                    {checkin.imagePath && (
                      <img
                        src={checkin.imagePath}
                        alt="Check-in"
                        className="w-full h-full object-cover rounded-lg"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {new Date(checkin.day).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(checkin.takenAt).toLocaleTimeString()}
                    </div>
                    {checkin.note && (
                      <div className="text-sm text-gray-600 mt-1">
                        "{checkin.note}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <div className="text-4xl mb-2">📸</div>
              <p>No check-ins yet</p>
              <p className="text-sm">Start your streak today!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}