import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

/* ── PUT /api/admin/units/[id]/media/[mediaId] ───────────────── */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.unitMedia.findUnique({ where: { id: params.mediaId } })
  if (!existing || existing.unitId !== params.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.title       !== undefined) data.title       = body.title?.trim()       || null
  if (body.description !== undefined) data.description = body.description?.trim() || null
  if (body.caption     !== undefined) data.caption     = body.caption?.trim()     || null
  if (body.url         !== undefined) data.url         = body.url?.trim()         || null
  if (body.orderIndex  !== undefined) data.orderIndex  = body.orderIndex

  const updated = await prisma.unitMedia.update({ where: { id: params.mediaId }, data })
  return NextResponse.json(updated)
}

/* ── DELETE /api/admin/units/[id]/media/[mediaId] ────────────── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.unitMedia.findUnique({ where: { id: params.mediaId } })
  if (!existing || existing.unitId !== params.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.unitMedia.delete({ where: { id: params.mediaId } })
  return NextResponse.json({ success: true })
}
