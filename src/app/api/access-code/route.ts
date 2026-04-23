import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin, isAdminRole } from '@/lib/roles'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const codes = await prisma.accessCode.findMany({
    include: { course: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(codes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const body = await req.json()

  // Admin creating a code
  if (isSuperAdmin((session?.user as any)?.role) && body.courseId) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const accessCode = await prisma.accessCode.create({
      data: { code, courseId: body.courseId },
    })
    return NextResponse.json(accessCode)
  }

  // User using a code
  const { code } = body
  const accessCode = await prisma.accessCode.findUnique({ where: { code } })
  if (!accessCode || accessCode.used) {
    return NextResponse.json({ error: 'קוד גישה לא תקין' }, { status: 400 })
  }

  // For code-based login, we need a user - create guest or require login
  if (!session?.user) {
    return NextResponse.json({ error: 'יש להתחבר תחילה' }, { status: 401 })
  }

  const userId = (session.user as any).id
  await prisma.accessCode.update({ where: { id: accessCode.id }, data: { used: true } })

  try {
    await prisma.enrollment.create({
      data: { userId, courseId: accessCode.courseId },
    })
  } catch {
    // Already enrolled
  }

  return NextResponse.json({ success: true, courseId: accessCode.courseId })
}
