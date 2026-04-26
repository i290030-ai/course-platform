import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

const VALID_TYPES = ['text', 'video', 'image', 'link', 'document', 'resource', 'assignment'] as const
// Types that require a URL
const URL_REQUIRED_TYPES = ['video', 'image', 'link', 'document', 'resource']

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

  // Return array directly (edit page expects array, not { unit, media })
  return NextResponse.json(media)
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
  const { type, title, description, url, caption, orderIndex: bodyOrderIndex } = body

  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: 'סוג בלוק לא חוקי' }, { status: 400 })

  if (URL_REQUIRED_TYPES.includes(type) && !url?.trim())
    return NextResponse.json({ error: 'כתובת URL נדרשת לסוג זה' }, { status: 400 })

  // Place new block at end (or use provided orderIndex)
  let orderIndex = bodyOrderIndex
  if (orderIndex === undefined) {
    const lastBlock = await prisma.unitMedia.findFirst({
      where: { unitId: params.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    })
    orderIndex = (lastBlock?.orderIndex ?? -1) + 1
  }

  const media = await prisma.unitMedia.create({
    data: {
      unitId: params.id,
      type,
      title: title?.trim() || null,
      description: description?.trim() || null,
      url: url?.trim() || null,
      caption: caption?.trim() || null,
      orderIndex,
    },
  })

  return NextResponse.json(media, { status: 201 })
}
