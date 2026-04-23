import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

// GET /api/assignments — admin: all assignments; user: not used directly
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const assignments = await prisma.assignment.findMany({
    include: {
      unit: { select: { title: true, courseId: true } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(assignments)
}

// POST /api/assignments — admin creates assignment for a unit
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courseId, unitId, title, description, dueDate, maxScore } = await req.json()

  const assignment = await prisma.assignment.create({
    data: {
      courseId,
      unitId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      maxScore: maxScore ?? 100,
    },
  })
  return NextResponse.json(assignment)
}
