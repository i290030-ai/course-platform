import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

// GET /api/submissions/assignment/:assignmentId — admin: all submissions for assignment
export async function GET(
  _: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submissions = await prisma.submission.findMany({
    where: { assignmentId: params.assignmentId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })

  return NextResponse.json(submissions)
}
