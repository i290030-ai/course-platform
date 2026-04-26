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

export default function AdminUnitsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    content: '',
    zoomLink: '',
    orderIndex: 0,
    openDate: '',
  })
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
        .then((d) => {
          const c = Array.isArray(d) ? d : []
          setCourses(c)
          if (c.length > 0) setSelectedCourse(c[0].id)
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

  const createUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, courseId: selectedCourse }),
    })
    const data = await res.json()
    setUnits([...units, data])
    setForm({ title: '', content: '', zoomLink: '', orderIndex: units.length, openDate: '' })
    setShowForm(false)
    setSaving(false)
  }

  const toggleUnit = async (unit: Unit) => {
    const res = await fetch('/api/units', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: unit.id, isOpen: !unit.isOpen }),
    })
    const data = await res.json()
    setUnits(units.map((u) => (u.id === unit.id ? data : u)))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="text-indigo-600">
            ← ניהול
          </Link>
          <h1 className="text-xl font-bold text-indigo-800">ניהול יחידות</h1>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">בחר קורס</label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">יחידות</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            + יחידה חדשה
          </button>
        </div>

        {showForm && (
          <form onSubmit={createUnit} className="bg-white rounded-xl shadow p-6 mb-6 space-y-4">
            <h3 className="font-bold text-gray-800">יצירת יחידה חדשה</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">כותרת</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">תוכן</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={5}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                קישור זום (אופציונלי)
              </label>
              <input
                value={form.zoomLink}
                onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
                className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">סדר</label>
                <input
                  type="number"
                  value={form.orderIndex}
                  onChange={(e) => setForm({ ...form, orderIndex: parseInt(e.target.value) })}
                  className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">תאריך פתיחה</label>
                <input
                  type="date"
                  value={form.openDate}
                  onChange={(e) => setForm({ ...form, openDate: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
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

        <div className="space-y-3">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="bg-white rounded-xl shadow p-4 flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded">
                    {unit.orderIndex + 1}
                  </span>
                  <h3 className="font-medium text-gray-800">{unit.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      unit.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {unit.isOpen ? 'פתוח' : 'סגור'}
                  </span>
                </div>
                {unit.zoomLink && <p className="text-xs text-blue-600 mt-1">{unit.zoomLink}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/units/${unit.id}/media`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                >
                  📎 מדיה
                </Link>
                <button
                  onClick={() => toggleUnit(unit)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    unit.isOpen
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {unit.isOpen ? 'סגור יחידה' : 'פתח יחידה'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
