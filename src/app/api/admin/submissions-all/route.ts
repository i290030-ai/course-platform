import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submissions = await prisma.submission.findMany({
    orderBy: { submittedAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignment: {
        select: {
          id: true,
          title: true,
          courseId: true,
          maxScore: true,
          unit: { select: { id: true, title: true } },
        },
      },
    },
  })

  // Attach course + department info
  const courseIds = Array.from(new Set(submissions.map(s => s.assignment.courseId)))
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds } },
    select: {
      id: true,
      title: true,
      department: { select: { id: true, name: true, code: true } },
    },
  })
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]))

  return NextResponse.json(
    submissions.map(s => {
      const course = courseMap[s.assignment.courseId]
      return {
        ...s,
        courseTitle: course?.title ?? '—',
        department: course?.department ?? null,
      }
    })
  )
}
