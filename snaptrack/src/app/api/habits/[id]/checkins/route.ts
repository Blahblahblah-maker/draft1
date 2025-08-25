import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/db'
import { checkinSchema } from '@/lib/validators'
import { toUserDay } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify habit exists and belongs to user
    const habit = await prisma.habit.findFirst({
      where: { id: params.id, userId: user.id },
    })

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = checkinSchema.parse(body)

    // Check if already checked in today
    const existingCheckin = await prisma.checkin.findUnique({
      where: {
        habitId_day: {
          habitId: params.id,
          day: new Date(validatedData.day),
        },
      },
    })

    if (existingCheckin) {
      return NextResponse.json({ error: 'Already checked in today' }, { status: 409 })
    }

    // For MVP, we'll store the image as base64 in the database
    // In production, this would upload to Supabase Storage
    const imagePath = validatedData.imageBase64 || ''
    const thumbPath = validatedData.imageBase64 || '' // Same for MVP

    const checkin = await prisma.checkin.create({
      data: {
        habitId: params.id,
        userId: user.id,
        takenAt: validatedData.takenAt,
        day: new Date(validatedData.day),
        imagePath,
        thumbPath,
        note: validatedData.note,
      },
    })

    return NextResponse.json(checkin, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.message }, { status: 400 })
    }
    
    console.error('Error creating checkin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    if (!month) {
      return NextResponse.json({ error: 'Month parameter required' }, { status: 400 })
    }

    const [year, monthNum] = month.split('-').map(Number)
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0)

    const checkins = await prisma.checkin.findMany({
      where: {
        habitId: params.id,
        userId: user.id,
        day: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { day: 'asc' },
    })

    return NextResponse.json(checkins)
  } catch (error) {
    console.error('Error fetching checkins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}