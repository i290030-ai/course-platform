'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isSuperAdmin } from '@/lib/roles'

interface User {
  id: string
  name: string
  email: string
  role: string
  enrollments: { course: { title: string } }[]
}

interface Course {
  id: string
  title: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollForm, setEnrollForm] = useState({ userId: '', courseId: '' })
  const [enrolling, setEnrolling] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isSuperAdmin((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/admin/users')
        .then((r) => r.json())
        .then((d) => setUsers(Array.isArray(d) ? d : []))
      fetch('/api/courses')
        .then((r) => r.json())
        .then((d) => setCourses(Array.isArray(d) ? d : []))
    }
  }, [status])

  const enroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnrolling(true)
    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrollForm),
    })
    if (res.ok) {
      setMessage('הרשמה בוצעה בהצלחה!')
      fetch('/api/admin/users')
        .then((r) => r.json())
        .then((d) => setUsers(Array.isArray(d) ? d : []))
    } else {
      setMessage('שגיאה - ייתכן שהמשתמש כבר רשום')
    }
    setEnrolling(false)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="text-indigo-600">
            ← ניהול
          </Link>
          <h1 className="text-xl font-bold text-indigo-800">משתמשים</h1>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">הרשמה לקורס</h3>
          {message && (
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg mb-4 text-sm">
              {message}
            </div>
          )}
          <form onSubmit={enroll} className="flex gap-3 flex-wrap">
            <select
              value={enrollForm.userId}
              onChange={(e) => setEnrollForm({ ...enrollForm, userId: e.target.value })}
              className="border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
              required
            >
              <option value="">בחר משתמש</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <select
              value={enrollForm.courseId}
              onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
              className="border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
              required
            >
              <option value="">בחר קורס</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={enrolling}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {enrolling ? 'מרשם...' : 'הרשם'}
            </button>
          </form>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4">רשימת משתמשים</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-800">{user.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {user.enrollments.length > 0 ? (
                    <div>
                      <p className="font-medium text-gray-700">קורסים:</p>
                      {user.enrollments.map((e, i) => (
                        <p key={i} className="text-indigo-600">
                          {e.course.title}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p>אין הרשמות</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
