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

  const unit = await prisma.unit.findUnique({ where: { id: params.id } })
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!isAdminRole(role)) {
    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: unit.courseId } },
    })
    if (!enrollment) return NextResponse.json({ error: 'Not enrolled' }, { status: 403 })

    if (!unit.isOpen) return NextResponse.json({ error: 'Unit locked' }, { status: 403 })
  }

  const progress = await prisma.progress.findUnique({
    where: { userId_unitId: { userId, unitId: params.id } },
  })

  return NextResponse.json({ ...unit, completed: progress?.completed || false })
}
