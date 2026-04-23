import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    activeCourses,
    totalAssignments,
    pendingSubmissions,
    reviewedSubmissions,
    activeParticipants,
    totalUnits,
    recentSubmissions,
    pendingList,
  ] = await Promise.all([
    prisma.course.count(),
    prisma.assignment.count(),
    prisma.submission.count({ where: { status: 'submitted' } }),
    prisma.submission.count({ where: { status: 'reviewed' } }),
    prisma.enrollment.groupBy({ by: ['userId'] }).then(r => r.length),
    prisma.unit.count(),
    prisma.submission.findMany({
      take: 6,
      orderBy: { submittedAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        assignment: {
          select: {
            title: true,
            courseId: true,
            unit: { select: { title: true } },
          },
        },
      },
    }),
    prisma.submission.findMany({
      where: { status: 'submitted' },
      take: 5,
      orderBy: { submittedAt: 'asc' },
      include: {
        user: { select: { name: true } },
        assignment: { select: { title: true, courseId: true } },
      },
    }),
  ])

  return NextResponse.json({
    activeCourses,
    totalAssignments,
    pendingSubmissions,
    reviewedSubmissions,
    activeParticipants,
    totalUnits,
    recentSubmissions,
    pendingList,
  })
}
