import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/submissions — student submits
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { assignmentId, textSubmission, fileUrl } = await req.json()

  if (!textSubmission && !fileUrl)
    return NextResponse.json({ error: 'נדרש טקסט או קובץ' }, { status: 400 })

  const submission = await prisma.submission.upsert({
    where: { assignmentId_userId: { assignmentId, userId } },
    update: { textSubmission, fileUrl, status: 'submitted', submittedAt: new Date() },
    create: { assignmentId, userId, textSubmission, fileUrl, status: 'submitted' },
  })

  return NextResponse.json(submission)
}
