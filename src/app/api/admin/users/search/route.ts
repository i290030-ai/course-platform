import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

/* ── GET /api/admin/users/search?q=&excludeCourseId= ──────────── */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const excludeCourseId = searchParams.get('excludeCourseId') ?? ''

  if (q.length < 2)
    return NextResponse.json([])

  // Find users matching name or email; exclude super_admins
  const users = await prisma.user.findMany({
    where: {
      role: { not: 'super_admin' },
      isActive: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
    take: 10,
    orderBy: { name: 'asc' },
  })

  // If excludeCourseId provided, filter out already-enrolled users
  if (excludeCourseId) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: excludeCourseId },
      select: { userId: true },
    })
    const enrolledIds = new Set(enrollments.map((e) => e.userId))
    return NextResponse.json(users.filter((u) => !enrolledIds.has(u.id)))
  }

  return NextResponse.json(users)
}
