import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import bcrypt from 'bcryptjs'

/* ── GET /api/admin/courses/[id]/participants ─────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const courseId = params.id

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      units: { select: { id: true, title: true, orderIndex: true }, orderBy: { orderIndex: 'asc' } },
    },
  })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Exclude super_admins from the list
  const filtered = enrollments.filter((e) => e.user.role !== 'super_admin')

  const unitIds = course.units.map((u) => u.id)
  const totalUnits = unitIds.length

  // Fetch progress for all enrolled users in this course
  const progressRows = await prisma.progress.findMany({
    where: {
      unitId: { in: unitIds },
      userId: { in: filtered.map((e) => e.userId) },
      completed: true,
    },
    select: { userId: true, unitId: true },
  })

  const progressByUser: Record<string, Set<string>> = {}
  for (const p of progressRows) {
    if (!progressByUser[p.userId]) progressByUser[p.userId] = new Set()
    progressByUser[p.userId].add(p.unitId)
  }

  const participants = filtered.map((e) => {
    const completed = progressByUser[e.userId]?.size ?? 0
    return {
      enrollmentId: e.id,
      enrolledAt: e.createdAt,
      user: e.user,
      progress: { completed, total: totalUnits, pct: totalUnits ? Math.round((completed / totalUnits) * 100) : 0 },
    }
  })

  return NextResponse.json({ courseTitle: course.title, units: course.units, participants })
}

/* ── POST /api/admin/courses/[id]/participants ────────────────── */
// Body A: { userId: string }            — enroll existing user
// Body B: { name, email, password }     — create new student + enroll
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!isAdminRole((session?.user as any)?.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const courseId = params.id
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } })
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const body = await req.json()

  /* ── Case A: enroll existing user ── */
  if (body.userId) {
    const user = await prisma.user.findUnique({ where: { id: body.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.role === 'super_admin')
      return NextResponse.json({ error: 'לא ניתן לרשום מנהל ראשי לקורס' }, { status: 403 })

    try {
      const enrollment = await prisma.enrollment.create({
        data: { userId: body.userId, courseId },
        include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } } },
      })
      return NextResponse.json({ enrollmentId: enrollment.id, user: enrollment.user }, { status: 201 })
    } catch {
      return NextResponse.json({ error: 'המשתמש כבר רשום לקורס זה' }, { status: 409 })
    }
  }

  /* ── Case B: create new student + enroll ── */
  const { name, email, password } = body
  if (!name?.trim() || !email?.trim() || !password)
    return NextResponse.json({ error: 'שם, מייל וסיסמה נדרשים' }, { status: 400 })
  if (password.length < 6)
    return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' }, { status: 400 })

  const exists = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (exists) return NextResponse.json({ error: 'כתובת מייל כבר קיימת במערכת' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)
  const newUser = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), password: hashed, role: 'user' },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  })

  const enrollment = await prisma.enrollment.create({ data: { userId: newUser.id, courseId } })

  return NextResponse.json({ enrollmentId: enrollment.id, user: newUser }, { status: 201 })
}
