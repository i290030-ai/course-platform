import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const role = (session.user as any).role

  const unit = await prisma.unit.findUnique({
    where: { id: params.id },
    include: { media: { orderBy: { orderIndex: 'asc' } } },
  })
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!isAdminRole(role)) {
    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: unit.courseId } },
    })
    if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

    // Check accessibility based on the course's release mode
    const course = await prisma.course.findUnique({ where: { id: unit.courseId } })
    const now = new Date()
    let accessible = false

    if (course?.releaseMode === 'sequential') {
      const siblings = await prisma.unit.findMany({
        where: { courseId: unit.courseId },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, orderIndex: true },
      })
      const idx = siblings.findIndex(u => u.id === unit.id)
      if (idx === 0) {
        accessible = true
      } else if (idx > 0) {
        const prevUnit = siblings[idx - 1]
        const prevProgress = await prisma.progress.findUnique({
          where: { userId_unitId: { userId, unitId: prevUnit.id } },
        })
        accessible = prevProgress?.completed === true
      }
    } else if (course?.releaseMode === 'date') {
      accessible = unit.isOpen || (!!unit.openDate && unit.openDate <= now)
    } else {
      // manual
      accessible = unit.isOpen
    }

    if (!accessible) return NextResponse.json({ error: 'Unit locked' }, { status: 403 })
  }

  const progress = await prisma.progress.findUnique({
    where: { userId_unitId: { userId, unitId: params.id } },
  })

  return NextResponse.json({ ...unit, completed: progress?.completed || false })
}
