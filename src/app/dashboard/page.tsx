'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/MainLayout'
import { isAdminRole } from '@/lib/roles'

interface Course {
  id: string
  title: string
  description: string
  releaseMode: string
  units?: { id: string }[]
}

/* ── Skeleton card shown while loading ── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-2 bg-gradient-to-l from-indigo-200 to-purple-200" />
      <div className="p-6 space-y-3">
        <div className="h-4 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-5/6" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-3 bg-gray-100 rounded-full w-16" />
          <div className="h-8 bg-gray-200 rounded-xl w-24" />
        </div>
      </div>
    </div>
  )
}

/* ── Release mode label ── */
function releaseLabel(mode: string) {
  if (mode === 'date')       return 'שחרור לפי תאריך'
  if (mode === 'sequential') return 'שחרור רציף'
  return 'שחרור ידני'
}

/* ── Course card ── */
function CourseCard({ course }: { course: Course }) {
  const unitCount = course.units?.length ?? 0
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden
      hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="h-1.5 bg-gradient-to-l from-indigo-500 to-purple-600" />
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-base font-extrabold text-gray-900 mb-1.5 leading-snug">
          {course.title}
        </h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
          {course.description}
        </p>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {unitCount > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {unitCount} יחידות
              </span>
            )}
            <span>{releaseLabel(course.releaseMode)}</span>
          </div>
          <Link href={`/course/${course.id}`}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700
              text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm">
            המשך
            <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const role = session?.user?.role
  const isAdmin = isAdminRole(role)
  const name = session?.user?.name ?? ''

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => { setCourses(Array.isArray(data) ? data : []); setLoading(false) })
  }, [status])

  return (
    <MainLayout>

      {/* Admin quick-action banner */}
      {isAdmin && (
        <div className="mb-8 rounded-2xl bg-gradient-to-l from-indigo-600 to-purple-600
          p-5 flex items-center justify-between gap-4 shadow-md">
          <div>
            <p className="text-white font-extrabold text-base">לוח הניהול</p>
            <p className="text-indigo-200 text-sm mt-0.5">בדיקת הגשות, ניהול קורסים ומעקב התקדמות</p>
          </div>
          <Link href="/admin"
            className="shrink-0 inline-flex items-center gap-2 bg-white text-indigo-700
              font-extrabold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
            עבור ללוח ניהול
            <span className="text-lg">→</span>
          </Link>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {name ? `שלום, ${name} 👋` : 'הקורסים שלי'}
          </h1>
          {!loading && courses.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              {courses.length} {courses.length === 1 ? 'קורס' : 'קורסים'} פעילים
            </p>
          )}
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-4xl mb-4">📚</p>
          <p className="font-bold text-gray-700 text-lg">אין קורסים זמינים כרגע</p>
          <p className="text-gray-400 text-sm mt-2">פנה למנהל לקבלת גישה לקורסים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => <CourseCard key={course.id} course={course} />)}
        </div>
      )}
    </MainLayout>
  )
}
