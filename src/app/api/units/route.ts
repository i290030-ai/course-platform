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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { courseId, title, content, zoomLink, orderIndex, openDate } = body as {
    courseId?: string
    title?: string
    content?: string
    zoomLink?: string
    orderIndex?: number
    openDate?: string
  }

  if (!courseId?.trim()) {
    console.error('[units POST] missing courseId')
    return NextResponse.json({ error: 'courseId נדרש' }, { status: 400 })
  }
  if (!title?.trim()) {
    console.error('[units POST] missing title')
    return NextResponse.json({ error: 'title נדרש' }, { status: 400 })
  }

  // Validate the course exists to prevent orphan units
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) {
    console.error('[units POST] courseId not found:', courseId)
    return NextResponse.json({ error: `הקורס לא נמצא (id: ${courseId})` }, { status: 404 })
  }

  try {
    const unit = await prisma.unit.create({
      data: {
        courseId,
        title: title.trim(),
        content: (content ?? '').trim(),
        zoomLink: zoomLink?.trim() || null,
        orderIndex: typeof orderIndex === 'number' ? orderIndex : 0,
        openDate: openDate ? new Date(openDate) : null,
      },
    })
    return NextResponse.json(unit)
  } catch (err) {
    console.error('[units POST] prisma error:', err)
    return NextResponse.json({ error: 'שגיאת שרת ביצירת היחידה' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, ...data } = await req.json()
  if (data.openDate !== undefined) data.openDate = data.openDate ? new Date(data.openDate) : null
  const unit = await prisma.unit.update({ where: { id }, data })
  return NextResponse.json(unit)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await req.json()
  await prisma.unit.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
