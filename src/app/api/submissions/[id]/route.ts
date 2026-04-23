import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

// PUT /api/submissions/:id — admin grades a submission
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { grade, feedback } = await req.json()

  const submission = await prisma.submission.update({
    where: { id: params.id },
    data: { grade, feedback, status: 'reviewed' },
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json(submission)
}
