import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { courseId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const role = (session.user as any).role
  const { courseId } = params

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const units = await prisma.unit.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
  })

  if (role === 'admin') return NextResponse.json(units)

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

  // Get user's progress
  const progress = await prisma.progress.findMany({
    where: { userId, unit: { courseId } },
  })
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.unitId))

  // Apply release logic
  const now = new Date()
  return NextResponse.json(
    units.map((unit, idx) => {
      let visible = false

      if (course.releaseMode === 'manual') {
        visible = unit.isOpen
      } else if (course.releaseMode === 'date') {
        visible = unit.isOpen || (!!unit.openDate && unit.openDate <= now)
      } else if (course.releaseMode === 'sequential') {
        if (idx === 0) visible = true
        else {
          const prev = units[idx - 1]
          visible = completedIds.has(prev.id)
        }
      }

      if (!visible) {
        return { id: unit.id, title: 'יחידה נעולה', locked: true, orderIndex: unit.orderIndex }
      }
      return { ...unit, locked: false, completed: completedIds.has(unit.id) }
    })
  )
}
