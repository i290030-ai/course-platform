'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  releaseMode: string
  units?: any[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/courses')
        .then((r) => r.json())
        .then((data) => {
          setCourses(Array.isArray(data) ? data : [])
          setLoading(false)
        })
    }
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-indigo-600 text-xl">טוען...</div>
      </div>
    )
  }

  const isAdmin = (session?.user as any)?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-indigo-800">פלטפורמת קורסים</h1>
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200"
              >
                ניהול
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-sm">שלום, {session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              יציאה
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">הקורסים שלי</h2>

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
            <p className="text-lg">אין קורסים זמינים כרגע</p>
            <p className="text-sm mt-2">פנה למנהל לקבלת גישה לקורסים</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="bg-gradient-to-l from-indigo-500 to-purple-600 h-3" />
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{course.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      {course.releaseMode === 'manual'
                        ? 'שחרור ידני'
                        : course.releaseMode === 'date'
                        ? 'שחרור לפי תאריך'
                        : 'שחרור רציף'}
                    </span>
                    <Link
                      href={`/course/${course.id}`}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                    >
                      המשך קורס
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
