import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole, isSuperAdmin } from '@/lib/roles'

const USER_SELECT = {
  id: true, name: true, email: true,
  role: true, isActive: true, createdAt: true,
} as const

/* ── PATCH /api/admin/users/[id] ─────────────────────────────── */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  const requesterId = (session?.user as any)?.id
  const requesterRole = (session?.user as any)?.role

  if (!isAdminRole(requesterRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body: { name?: string; email?: string; role?: string; isActive?: boolean } = await req.json()

  /* Role / isActive changes: super_admin only */
  if ((body.role !== undefined || body.isActive !== undefined) && !isSuperAdmin(requesterRole))
    return NextResponse.json({ error: 'רק מנהל ראשי יכול לשנות תפקיד או סטטוס' }, { status: 403 })

  /* Safety: cannot demote yourself from super_admin */
  if (params.id === requesterId && body.role && body.role !== 'super_admin' && target.role === 'super_admin')
    return NextResponse.json({ error: 'לא ניתן לשנות את תפקיד המנהל הראשי שלך' }, { status: 400 })

  /* Safety: cannot deactivate the last active super_admin */
  if (body.isActive === false && target.role === 'super_admin') {
    const activeSuperAdmins = await prisma.user.count({
      where: { role: 'super_admin', isActive: true },
    })
    if (activeSuperAdmins <= 1)
      return NextResponse.json({ error: 'לא ניתן לבטל את המנהל הראשי האחרון' }, { status: 400 })
  }

  /* Safety: validate role value */
  if (body.role !== undefined) {
    const validRoles = ['super_admin', 'admin', 'instructor', 'user']
    if (!validRoles.includes(body.role))
      return NextResponse.json({ error: 'תפקיד לא חוקי' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name?.trim())           data.name     = body.name.trim()
  if (body.email?.trim())          data.email    = body.email.trim().toLowerCase()
  if (body.role !== undefined)     data.role     = body.role
  if (body.isActive !== undefined) data.isActive = body.isActive

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: 'אין שדות לעדכון' }, { status: 400 })

  /* Email uniqueness check */
  if (data.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: data.email as string, id: { not: params.id } },
    })
    if (conflict)
      return NextResponse.json({ error: 'כתובת המייל כבר שייכת למשתמש אחר' }, { status: 409 })
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: USER_SELECT,
  })

  return NextResponse.json(updated)
}

/* ── DELETE /api/admin/users/[id] ────────────────────────────── */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  const requesterId = (session?.user as any)?.id
  const requesterRole = (session?.user as any)?.role

  if (!isSuperAdmin(requesterRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (params.id === requesterId)
    return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (target.role === 'super_admin') {
    const superAdminCount = await prisma.user.count({ where: { role: 'super_admin' } })
    if (superAdminCount <= 1)
      return NextResponse.json({ error: 'לא ניתן למחוק את המנהל הראשי האחרון' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
