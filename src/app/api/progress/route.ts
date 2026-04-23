import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as any).id
  const { unitId } = await req.json()

  const progress = await prisma.progress.upsert({
    where: { userId_unitId: { userId, unitId } },
    update: { completed: true },
    create: { userId, unitId, completed: true },
  })
  return NextResponse.json(progress)
}
