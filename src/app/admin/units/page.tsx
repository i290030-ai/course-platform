'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole } from '@/lib/roles'

interface Course {
  id: string
  title: string
}
interface Unit {
  id: string
  title: string
  courseId: string
  orderIndex: number
  isOpen: boolean
  openDate?: string
  zoomLink?: string
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white
      text-sm font-medium px-5 py-3 rounded-2xl shadow-xl">
      {msg}
    </div>
  )
}

export default function AdminUnitsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/courses')
        .then((r) => r.json())
        .then((d) => {
          const c = Array.isArray(d) ? d : []
          setCourses(c)
          if (c.length > 0) {
            const saved = sessionStorage.getItem('adminUnitsSelectedCourse')
            const isValid = saved && c.some((course) => course.id === saved)
            setSelectedCourse(isValid ? saved : c[0].id)
          }
        })
    }
  }, [status])

  useEffect(() => {
    if (selectedCourse) {
      fetch(`/api/units/${selectedCourse}`)
        .then((r) => r.json())
        .then((d) => setUnits(Array.isArray(d) ? d : []))
    }
  }, [selectedCourse])

  const createUnit = async () => {
    if (!selectedCourse) {
      console.error('[createUnit] no courseId selected')
      setToast('יש לבחור קורס לפני יצירת יחידה')
      return
    }
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse,
          title: 'יחידה חדשה',
          content: '',
          orderIndex: units.length,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.id) {
        console.error('[createUnit] server error:', data.error, 'status:', res.status)
        setToast(data.error ?? 'שגיאה ביצירת היחידה')
        return
      }
      router.push(`/admin/units/${data.id}/edit`)
    } catch (err) {
      console.error('[createUnit] fetch error:', err)
      setToast('שגיאת רשת — לא ניתן ליצור יחידה')
    } finally {
      setCreating(false)
    }
  }

  const deleteUnit = async (id: string) => {
    await fetch('/api/units', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setUnits(prev => prev.filter(u => u.id !== id))
    setDeleteConfirm(null)
    setToast('היחידה נמחקה')
  }

  const sortedUnits = [...units].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="text-indigo-600 text-sm font-medium hover:underline">
            ← ניהול
          </Link>
          <h1 className="text-xl font-bold text-indigo-800">ניהול יחידות</h1>
          <div className="w-16" />
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Course selector */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-sm font-bold text-gray-700 mb-2">בחר קורס</label>
          <select
            value={selectedCourse}
            onChange={(e) => {
              setSelectedCourse(e.target.value)
              sessionStorage.setItem('adminUnitsSelectedCourse', e.target.value)
            }}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-[260px]"
            required
          >
            {courses.length === 0 && (
              <option value="" disabled>טוען קורסים...</option>
            )}
            {courses.length > 0 && !selectedCourse && (
              <option value="" disabled>-- בחר קורס --</option>
            )}
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Units list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">
              יחידות {sortedUnits.length > 0 && <span className="text-gray-400 font-normal text-sm">({sortedUnits.length})</span>}
            </h2>
            <button
              onClick={createUnit}
              disabled={!selectedCourse || creating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl
                hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {creating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  יוצר...
                </>
              ) : '+ יחידה חדשה'}
            </button>
          </div>

          {sortedUnits.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-3xl mb-2">📚</p>
              <p className="text-gray-500 text-sm font-medium">אין יחידות בקורס זה</p>
              <p className="text-gray-400 text-xs mt-1">לחץ "+ יחידה חדשה" להתחלה</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-xl
                      flex items-center justify-center text-xs font-bold text-indigo-600">
                      {unit.orderIndex + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">{unit.title}</h3>
                      {unit.zoomLink && (
                        <p className="text-xs text-blue-500 truncate mt-0.5" dir="ltr">{unit.zoomLink}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      unit.isOpen
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}>
                      {unit.isOpen ? 'פתוח' : 'סגור'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/units/${unit.id}/edit`}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50
                        hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                    >
                      ✏️ ערוך
                    </Link>
                    {deleteConfirm === unit.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-600 font-medium">למחוק?</span>
                        <button
                          onClick={() => deleteUnit(unit.id)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg"
                        >
                          מחק
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(unit.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50
                          text-gray-400 hover:text-red-500 transition-colors text-base"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
