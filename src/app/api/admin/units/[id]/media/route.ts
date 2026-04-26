import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

const VALID_TYPES = ['image', 'document', 'resource'] as const

/* ── GET /api/admin/units/[id]/media ─────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const unit = await prisma.unit.findUnique({ where: { id: params.id }, select: { id: true, title: true } })
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  const media = await prisma.unitMedia.findMany({
    where: { unitId: params.id },
    orderBy: { orderIndex: 'asc' },
  })

  return NextResponse.json({ unit, media })
}

/* ── POST /api/admin/units/[id]/media ────────────────────────── */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const unit = await prisma.unit.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

  const body = await req.json()
  const { type, title, description, url, caption } = body

  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: 'סוג מדיה לא חוקי' }, { status: 400 })
  if (!url?.trim())
    return NextResponse.json({ error: 'כתובת URL נדרשת' }, { status: 400 })

  // Place new block at end
  const lastBlock = await prisma.unitMedia.findFirst({
    where: { unitId: params.id },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  })
  const orderIndex = (lastBlock?.orderIndex ?? -1) + 1

  const media = await prisma.unitMedia.create({
    data: {
      unitId: params.id,
      type,
      title: title?.trim() || null,
      description: description?.trim() || null,
      url: url.trim(),
      caption: caption?.trim() || null,
      orderIndex,
    },
  })

  return NextResponse.json(media, { status: 201 })
}
