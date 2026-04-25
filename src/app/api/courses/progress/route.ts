import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/courses/progress
 * Returns enrolled courses with per-user progress in one round-trip.
 * Used by the student dashboard to show progress bars and smart CTAs.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id

  const [enrollments, completedProgress] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: { units: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    }),
    prisma.progress.findMany({
      where: { userId, completed: true },
      select: { unitId: true },
    }),
  ])

  const completedIds = new Set(completedProgress.map(p => p.unitId))
  const now = new Date()

  const courses = enrollments.map(({ course }) => {
    const units = course.units
    const totalUnits = units.length
    const completedUnits = units.filter(u => completedIds.has(u.id)).length
    const pct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0

    // Find the current unit: first accessible, non-completed unit.
    // Returns null if all remaining units are locked (e.g. manual mode, nothing open yet).
    let currentUnit: { id: string; title: string; orderIndex: number } | null = null
    for (let i = 0; i < units.length; i++) {
      const unit = units[i]
      if (completedIds.has(unit.id)) continue  // skip already-completed units

      let accessible = false
      if (course.releaseMode === 'sequential') {
        // First unit always open; subsequent units open when the previous is done
        accessible = i === 0 || completedIds.has(units[i - 1].id)
      } else if (course.releaseMode === 'date') {
        accessible = unit.isOpen || (!!unit.openDate && unit.openDate <= now)
      } else {
        // manual: admin must explicitly open the unit
        accessible = unit.isOpen
      }

      if (accessible) {
        currentUnit = { id: unit.id, title: unit.title, orderIndex: unit.orderIndex }
        break
      }
    }
    // Note: currentUnit === null is valid — it means no units are currently accessible.
    // The dashboard CTA handles this by linking to the course overview instead.

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      releaseMode: course.releaseMode,
      totalUnits,
      completedUnits,
      pct,
      currentUnit,
    }
  })

  return NextResponse.json(courses)
}
