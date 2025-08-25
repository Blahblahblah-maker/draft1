'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, Plus } from 'lucide-react'
import Link from 'next/link'

interface Habit {
  id: string
  name: string
  description?: string
  frequency: string
  checkins: Array<{
    id: string
    day: Date
    takenAt: Date
  }>
}

export default function DashboardPage() {
  const { data: habits, isLoading, error } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const response = await fetch('/api/habits')
      if (!response.ok) throw new Error('Failed to fetch habits')
      return response.json()
    },
  })

  const today = new Date().toISOString().split('T')[0]

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error loading habits. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today's Habits</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <Link href="/habits/new">
          <Button size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {habits && habits.length > 0 ? (
        <div className="space-y-4">
          {habits.map((habit) => {
            const todayCheckin = habit.checkins.find(
              checkin => new Date(checkin.day).toISOString().split('T')[0] === today
            )
            const isCheckedIn = !!todayCheckin

            return (
              <Card key={habit.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{habit.name}</CardTitle>
                      {habit.description && (
                        <CardDescription>{habit.description}</CardDescription>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {isCheckedIn ? (
                          <span className="text-green-600">✓ Checked in</span>
                        ) : (
                          <span className="text-orange-600">Pending</span>
                        )}
                      </div>
                      {todayCheckin && (
                        <div className="text-xs text-gray-400">
                          {new Date(todayCheckin.takenAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Frequency: {habit.frequency}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/habits/${habit.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {!isCheckedIn && (
                        <Link href={`/habits/${habit.id}/checkin`}>
                          <Button size="sm">
                            <Camera className="h-4 w-4 mr-2" />
                            Check In
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">📸</div>
              <h3 className="text-xl font-semibold">No habits yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Start with one small promise to yourself.
              </p>
              <Link href="/habits/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Habit
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}