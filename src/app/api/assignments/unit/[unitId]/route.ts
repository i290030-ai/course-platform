import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/assignments/unit/:unitId — get assignment for a unit (+ user's own submission)
export async function GET(
  _: NextRequest,
  { params }: { params: { unitId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id

  const assignment = await prisma.assignment.findUnique({
    where: { unitId: params.unitId },
  })

  if (!assignment) return NextResponse.json(null)

  // Attach user's own submission
  const submission = await prisma.submission.findUnique({
    where: { assignmentId_userId: { assignmentId: assignment.id, userId } },
  })

  return NextResponse.json({ ...assignment, submission: submission ?? null })
}
