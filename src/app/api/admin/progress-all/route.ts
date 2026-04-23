import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [users, courses, allProgress, allSubmissions] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true, name: true, email: true,
        enrollments: { select: { courseId: true } },
      },
    }),
    prisma.course.findMany({
      select: {
        id: true, title: true,
        department: { select: { id: true, name: true, code: true } },
        units: { select: { id: true, title: true, orderIndex: true, isOpen: true } },
      },
    }),
    prisma.progress.findMany({
      where: { completed: true },
      select: { userId: true, unitId: true },
    }),
    prisma.submission.findMany({
      select: { userId: true, status: true, grade: true, assignment: { select: { maxScore: true, courseId: true } } },
    }),
  ])

  const progressByUser: Record<string, Set<string>> = {}
  for (const p of allProgress) {
    if (!progressByUser[p.userId]) progressByUser[p.userId] = new Set()
    progressByUser[p.userId].add(p.unitId)
  }

  const courseUnitMap: Record<string, string[]> = {}
  for (const c of courses) courseUnitMap[c.id] = c.units.map(u => u.id)

  const result = users.map(user => {
    const enrolledCourseIds = user.enrollments.map(e => e.courseId)
    const completedUnits = progressByUser[user.id] ?? new Set<string>()
    const userSubs = allSubmissions.filter(s => s.userId === user.id)
    const reviewed = userSubs.filter(s => s.status === 'reviewed' && s.grade != null)
    const avgGrade =
      reviewed.length > 0
        ? Math.round(
            reviewed.reduce((sum, s) => sum + ((s.grade ?? 0) / s.assignment.maxScore) * 100, 0) /
              reviewed.length
          )
        : null

    const courseProgress = enrolledCourseIds.map(courseId => {
      const course = courses.find(c => c.id === courseId)
      const units = courseUnitMap[courseId] ?? []
      const done = units.filter(uid => completedUnits.has(uid)).length
      return {
        courseId,
        courseTitle: course?.title ?? '—',
        department: course?.department ?? null,
        totalUnits: units.length,
        completedUnits: done,
        pct: units.length ? Math.round((done / units.length) * 100) : 0,
      }
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      enrolledCount: enrolledCourseIds.length,
      submissionsCount: userSubs.length,
      reviewedCount: reviewed.length,
      avgGrade,
      courseProgress,
    }
  })

  return NextResponse.json({ users: result, courses })
}
