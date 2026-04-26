import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'

const VALID_TYPES = ['text', 'video', 'image', 'link', 'document', 'resource', 'assignment'] as const

/* ── GET /api/admin/units/[id]/media ─────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const unit = await prisma.unit.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })

    const media = await prisma.unitMedia.findMany({
      where: { unitId: params.id },
      orderBy: { orderIndex: 'asc' },
    })
    return NextResponse.json(media)
  } catch (err) {
    console.error('[media GET] prisma error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, title, description, url, caption, orderIndex: bodyOrderIndex } = body as {
    type: string
    title?: string
    description?: string
    url?: string
    caption?: string
    orderIndex?: number
  }

  if (!type || !VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    console.error('[media POST] invalid type:', type)
    return NextResponse.json({ error: `סוג בלוק לא חוקי: "${type}". הערכים המותרים: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  // URL is NOT required on creation — the block starts empty and is filled via edit.
  // URL validation (for types that need it) happens on the PUT (save) call.

  // Place new block at end (or use provided orderIndex)
  let orderIndex: number = typeof bodyOrderIndex === 'number' ? bodyOrderIndex : 0
  if (bodyOrderIndex === undefined) {
    const lastBlock = await prisma.unitMedia.findFirst({
      where: { unitId: params.id },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    })
    orderIndex = (lastBlock?.orderIndex ?? -1) + 1
  }

  try {
    const media = await prisma.unitMedia.create({
      data: {
        unitId: params.id,
        type,
        title: (title as string | undefined)?.trim() || null,
        description: (description as string | undefined)?.trim() || null,
        url: (url as string | undefined)?.trim() || null,
        caption: (caption as string | undefined)?.trim() || null,
        orderIndex,
      },
    })
    return NextResponse.json(media, { status: 201 })
  } catch (err) {
    console.error('[media POST] prisma error:', err)
    return NextResponse.json({ error: 'שגיאת שרת ביצירת הבלוק' }, { status: 500 })
  }
}
