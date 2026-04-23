import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const role = (session.user as any).role

  if (isAdminRole(role)) {
    const courses = await prisma.course.findMany({
      include: { units: true, _count: { select: { enrollments: true } } },
    })
    return NextResponse.json(courses)
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: { units: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  })

  return NextResponse.json(enrollments.map((e) => e.course))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { title, description, releaseMode } = await req.json()
  const course = await prisma.course.create({
    data: { title, description, releaseMode: releaseMode || 'manual' },
  })
  return NextResponse.json(course)
}
