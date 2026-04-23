import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { courseId, title, content, zoomLink, orderIndex, openDate } = await req.json()
  const unit = await prisma.unit.create({
    data: {
      courseId,
      title,
      content,
      zoomLink,
      orderIndex: orderIndex || 0,
      openDate: openDate ? new Date(openDate) : null,
    },
  })
  return NextResponse.json(unit)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, ...data } = await req.json()
  if (data.openDate) data.openDate = new Date(data.openDate)
  const unit = await prisma.unit.update({ where: { id }, data })
  return NextResponse.json(unit)
}
