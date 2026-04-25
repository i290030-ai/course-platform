import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/roles'
import bcrypt from 'bcryptjs'

/* ── POST /api/admin/users/[id]/password — super_admin only ──── */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  const requesterRole = (session?.user as any)?.role

  if (!isSuperAdmin(requesterRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { password } = await req.json()

  if (!password || password.length < 6)
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })

  const exists = await prisma.user.findUnique({ where: { id: params.id } })
  if (!exists) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.update({ where: { id: params.id }, data: { password: hashed } })

  return NextResponse.json({ success: true })
}
