import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

/* ── DELETE /api/admin/courses/[id]/participants/[userId] ─────── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: courseId, userId } = params

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role === 'super_admin')
    return NextResponse.json({ error: 'לא ניתן להסיר מנהל ראשי מקורס' }, { status: 403 })

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })

  await prisma.enrollment.delete({ where: { userId_courseId: { userId, courseId } } })

  return NextResponse.json({ success: true })
}
