import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, courseId } = await req.json()
  const adminRole = (session.user as any).role
  const sessionUserId = (session.user as any).id

  // Admin can enroll anyone, users can only enroll themselves
  const targetUserId = adminRole === 'admin' ? userId : sessionUserId

  try {
    const enrollment = await prisma.enrollment.create({
      data: { userId: targetUserId, courseId },
    })
    return NextResponse.json(enrollment)
  } catch {
    return NextResponse.json({ error: 'Already enrolled' }, { status: 400 })
  }
}
