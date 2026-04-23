'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole } from '@/lib/roles'

interface Course {
  id: string
  title: string
  description: string
  releaseMode: string
}

export default function AdminCoursesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', releaseMode: 'manual' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/courses')
        .then((r) => r.json())
        .then((d) => setCourses(Array.isArray(d) ? d : []))
    }
  }, [status])

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCourses([...courses, data])
    setForm({ title: '', description: '', releaseMode: 'manual' })
    setShowForm(false)
    setSaving(false)
  }

  const deleteCourse = async (id: string) => {
    if (!confirm('למחוק קורס זה?')) return
    await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    setCourses(courses.filter((c) => c.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="text-indigo-600">
            ← ניהול
          </Link>
          <h1 className="text-xl font-bold text-indigo-800">ניהול קורסים</h1>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">קורסים</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            + קורס חדש
          </button>
        </div>

        {showForm && (
          <form onSubmit={createCourse} className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
            <h3 className="font-bold text-gray-800">יצירת קורס חדש</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">שם הקורס</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">מצב שחרור</label>
              <select
                value={form.releaseMode}
                onChange={(e) => setForm({ ...form, releaseMode: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="manual">ידני</option>
                <option value="date">לפי תאריך</option>
                <option value="sequential">רציף</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">{course.title}</h3>
                <p className="text-gray-500 text-sm">{course.description}</p>
                <span className="text-xs text-indigo-600">
                  {course.releaseMode === 'manual'
                    ? 'ידני'
                    : course.releaseMode === 'date'
                    ? 'לפי תאריך'
                    : 'רציף'}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/course/${course.id}`}
                  className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  צפה
                </Link>
                <button
                  onClick={() => deleteCourse(course.id)}
                  className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm hover:bg-red-200"
                >
                  מחק
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
