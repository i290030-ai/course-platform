import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole, isSuperAdmin } from '@/lib/roles'
import bcrypt from 'bcryptjs'

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const

/* ── GET /api/admin/users — admin+ can view ───────────────────── */
export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!isAdminRole(role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

/* ── POST /api/admin/users — super_admin only: create user ───── */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role

  if (!isSuperAdmin(role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role: newRole } = await req.json()

  if (!name?.trim() || !email?.trim() || !password || !newRole)
    return NextResponse.json({ error: 'כל השדות נדרשים' }, { status: 400 })

  if (password.length < 6)
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })

  const validRoles = ['super_admin', 'admin', 'instructor', 'user']
  if (!validRoles.includes(newRole))
    return NextResponse.json({ error: 'תפקיד לא חוקי' }, { status: 400 })

  const exists = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (exists)
    return NextResponse.json({ error: 'כתובת מייל כבר קיימת במערכת' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), password: hashed, role: newRole },
    select: USER_SELECT,
  })

  return NextResponse.json(user, { status: 201 })
}
