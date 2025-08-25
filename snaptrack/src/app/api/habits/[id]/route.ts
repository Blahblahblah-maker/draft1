import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { prisma } from '@/lib/db'
import { habitSchema } from '@/lib/validators'

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

    const habit = await prisma.habit.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        checkins: {
          orderBy: { day: 'desc' },
        },
      },
    })

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    return NextResponse.json(habit)
  } catch (error) {
    console.error('Error fetching habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = habitSchema.partial().parse(body)

    const habit = await prisma.habit.updateMany({
      where: { id: params.id, userId: user.id },
      data: validatedData,
    })

    if (habit.count === 0) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    const updatedHabit = await prisma.habit.findUnique({
      where: { id: params.id },
    })

    return NextResponse.json(updatedHabit)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.message }, { status: 400 })
    }
    
    console.error('Error updating habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const habit = await prisma.habit.deleteMany({
      where: { id: params.id, userId: user.id },
    })

    if (habit.count === 0) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting habit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}