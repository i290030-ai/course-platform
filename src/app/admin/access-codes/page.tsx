'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isSuperAdmin } from '@/lib/roles'

interface AccessCode {
  id: string
  code: string
  used: boolean
  course: { title: string }
}
interface Course {
  id: string
  title: string
}

export default function AdminAccessCodesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isSuperAdmin((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/access-code')
        .then((r) => r.json())
        .then((d) => setCodes(Array.isArray(d) ? d : []))
      fetch('/api/courses')
        .then((r) => r.json())
        .then((d) => {
          const c = Array.isArray(d) ? d : []
          setCourses(c)
          if (c.length > 0) setSelectedCourse(c[0].id)
        })
    }
  }, [status])

  const generateCode = async () => {
    if (!selectedCourse) return
    setGenerating(true)
    await fetch('/api/access-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: selectedCourse }),
    })
    fetch('/api/access-code')
      .then((r) => r.json())
      .then((d) => setCodes(Array.isArray(d) ? d : []))
    setGenerating(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="text-indigo-600">
            ← ניהול
          </Link>
          <h1 className="text-xl font-bold text-indigo-800">קודי גישה</h1>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">יצירת קוד גישה חדש</h3>
          <div className="flex gap-3">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="border rounded-lg px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              onClick={generateCode}
              disabled={generating}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? 'יוצר...' : 'צור קוד'}
            </button>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-4">קודי גישה</h2>
        <div className="space-y-3">
          {codes.map((code) => (
            <div
              key={code.id}
              className="bg-white rounded-xl shadow p-4 flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-3">
                  <code className="bg-gray-100 px-3 py-1 rounded font-mono text-lg font-bold">
                    {code.code}
                  </code>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      code.used ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {code.used ? 'שומש' : 'זמין'}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mt-1">{code.course.title}</p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(code.code)}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200"
              >
                העתק
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
