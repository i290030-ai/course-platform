'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MainLayout from '@/components/MainLayout'
import { isAdminRole } from '@/lib/roles'

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface CourseProgress {
  id: string
  title: string
  description: string
  releaseMode: string
  totalUnits: number
  completedUnits: number
  pct: number
  currentUnit: { id: string; title: string; orderIndex: number } | null
}

/* ─────────────────────────────────────────
   Skeleton
───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-1.5 bg-gradient-to-l from-gray-200 to-gray-100" />
      <div className="p-6 space-y-4">
        <div className="h-4 bg-gray-200 rounded-full w-2/3" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="h-3 bg-gray-100 rounded-full w-4/5" />
        </div>
        <div className="h-2 bg-gray-100 rounded-full w-full mt-2" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-3 bg-gray-100 rounded-full w-20" />
          <div className="h-9 bg-gray-200 rounded-xl w-28" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Animated progress bar
───────────────────────────────────────── */
function ProgressBar({ pct, active }: { pct: number; active?: boolean }) {
  const [width, setWidth] = useState(0)
  const ref = useRef(false)

  useEffect(() => {
    if (ref.current) return
    ref.current = true
    const t = setTimeout(() => setWidth(pct), 120) // slight delay → animates in
    return () => clearTimeout(t)
  }, [pct])

  const color = pct === 100
    ? 'from-green-400 to-emerald-500'
    : active
    ? 'from-indigo-500 to-purple-500'
    : 'from-indigo-400 to-indigo-500'

  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-l ${color} transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

const SECTION_LABELS: Record<string, string> = {
  'section-objectives': 'מה לומדים',
  'section-content':    'תוכן',
  'section-practice':   'תרגול',
  'section-assignment': 'משימה',
}

/* ─────────────────────────────────────────
   CTA button
───────────────────────────────────────── */
function CtaButton({ course, resumeSection }: { course: CourseProgress; resumeSection?: string }) {
  const router = useRouter()

  if (course.pct === 100) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border
        border-green-200 text-sm font-bold px-4 py-2 rounded-xl cursor-default select-none">
        <span className="text-base">✓</span>
        הקורס הושלם
      </span>
    )
  }

  // currentUnit may be null when all remaining units are locked (e.g. manual mode, nothing open)
  const hasCurrentUnit = !!course.currentUnit?.id
  const hasResume = !!resumeSection && course.pct > 0 && hasCurrentUnit

  const label = course.pct === 0
    ? 'התחל קורס'
    : !hasCurrentUnit
    ? 'צפה בקורס'
    : hasResume
    ? 'המשך מהמקום שהפסקת'
    : `המשך יחידה ${course.currentUnit!.orderIndex + 1}`

  function handleClick() {
    console.log('currentUnit:', course.currentUnit)
    try {
      if (!course.currentUnit?.id) {
        router.push(`/course/${course.id}`)
        return
      }
      router.push(`/unit/${course.currentUnit.id}`)
    } catch (err) {
      console.error('Navigation error:', err)
      router.push(`/course/${course.id}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700
        active:scale-95 text-white text-sm font-bold px-4 py-2 rounded-xl
        transition-all duration-150 shadow-sm hover:shadow-md">
      {label}
      <span className="text-xs opacity-80">{course.pct === 0 ? '▶' : '→'}</span>
    </button>
  )
}

/* ─────────────────────────────────────────
   Course card
───────────────────────────────────────── */
function CourseCard({ course, active, resumeSection }: { course: CourseProgress; active: boolean; resumeSection?: string }) {
  return (
    <div className={`
      bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col
      transition-all duration-200 ease-out
      hover:-translate-y-1 hover:shadow-lg
      ${active
        ? 'border-indigo-300 ring-2 ring-indigo-200 ring-offset-1'
        : 'border-gray-100 hover:border-indigo-100'}
    `}>
      {/* Top accent */}
      <div className={`h-1.5 bg-gradient-to-l ${
        course.pct === 100
          ? 'from-green-400 to-emerald-500'
          : active
          ? 'from-indigo-500 to-purple-600'
          : 'from-indigo-400 to-purple-500'
      }`} />

      <div className="p-6 flex flex-col flex-1 gap-4">

        {/* Title + badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-extrabold text-gray-900 leading-snug">
            {course.title}
          </h3>
          {active && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-extrabold
              uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-600 text-white
              shadow-sm animate-pulse">
              ממשיך עכשיו
            </span>
          )}
          {course.pct === 100 && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-extrabold
              uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              ✓ הושלם
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
          {course.description}
        </p>

        {/* Progress section */}
        {course.totalUnits > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">
                {course.completedUnits} מתוך {course.totalUnits} יחידות
              </span>
              <span className={`font-extrabold tabular-nums ${
                course.pct === 100 ? 'text-green-600' : 'text-indigo-600'
              }`}>
                {course.pct}%
              </span>
            </div>
            <ProgressBar pct={course.pct} active={active} />
          </div>
        )}

        {/* Current unit + resume section hint */}
        {course.currentUnit && course.pct > 0 && course.pct < 100 && (
          <div className="space-y-1 -mt-1">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
              יחידה: <span className="text-gray-600 font-semibold truncate">{course.currentUnit.title}</span>
            </p>
            {resumeSection && SECTION_LABELS[resumeSection] && (
              <p className="text-xs text-indigo-400 flex items-center gap-1.5 pr-3">
                <span className="shrink-0">↳</span>
                עצרת ב: <span className="font-semibold">{SECTION_LABELS[resumeSection]}</span>
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto">
          <Link href={`/course/${course.id}`}
            className="text-xs text-gray-400 hover:text-indigo-600 font-medium transition-colors">
            כל היחידות →
          </Link>
          <CtaButton course={course} resumeSection={resumeSection} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main page
───────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)

  const role = session?.user?.role
  const isAdmin = isAdminRole(role)
  const name = session?.user?.name ?? ''
  const [resumeSectionMap, setResumeSectionMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/courses/progress')
      .then(r => r.json())
      .then(data => {
        const list: CourseProgress[] = Array.isArray(data) ? data : []
        setCourses(list)
        setLoading(false)
        // Read last-viewed section from localStorage for each in-progress course
        try {
          const map: Record<string, string> = {}
          list.forEach(c => {
            if (c.currentUnit && c.pct > 0 && c.pct < 100) {
              const saved = localStorage.getItem(`unit-resume-${c.currentUnit.id}`)
              if (saved) map[c.id] = saved
            }
          })
          setResumeSectionMap(map)
        } catch {}
      })
  }, [status])

  // The "active" course: in-progress (pct > 0 && < 100), or first course if all at 0
  const activeCourseId = (() => {
    const inProgress = courses.find(c => c.pct > 0 && c.pct < 100)
    if (inProgress) return inProgress.id
    if (courses.length > 0 && courses.every(c => c.pct === 0)) return courses[0].id
    return null
  })()

  const totalCompleted = courses.filter(c => c.pct === 100).length

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
              font-extrabold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50
              transition-colors shadow-sm active:scale-95">
            עבור ללוח ניהול →
          </Link>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {name ? `שלום, ${name} 👋` : 'הקורסים שלי'}
          </h1>
          {!loading && courses.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {totalCompleted > 0
                ? `${totalCompleted} מתוך ${courses.length} קורסים הושלמו`
                : `${courses.length} ${courses.length === 1 ? 'קורס רשום' : 'קורסים רשומים'}`}
            </p>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">📚</p>
          <p className="font-extrabold text-gray-700 text-lg mb-1">אין קורסים זמינים כרגע</p>
          <p className="text-gray-400 text-sm">פנה למנהל לקבלת גישה לקורסים</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              active={course.id === activeCourseId}
              resumeSection={resumeSectionMap[course.id]}
            />
          ))}
        </div>
      )}
    </MainLayout>
  )
}
