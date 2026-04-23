'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Unit {
  id: string
  title: string
  locked: boolean
  completed?: boolean
  orderIndex: number
  zoomLink?: string
}

interface Course {
  id: string
  title: string
  description: string
  releaseMode: string
}

export default function CoursePage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      Promise.all([
        fetch(`/api/courses/${params.id}`).then((r) => r.json()),
        fetch(`/api/units/${params.id}`).then((r) => r.json()),
      ]).then(([courseData, unitsData]) => {
        setCourse(courseData)
        setUnits(Array.isArray(unitsData) ? unitsData : [])
        setLoading(false)
      })
    }
  }, [status, params.id])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-indigo-600">טוען...</div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
            ← חזרה לדאשבורד
          </Link>
          <h1 className="text-xl font-bold text-indigo-800">{course?.title}</h1>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {course && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <p className="text-gray-600">{course.description}</p>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-800 mb-4">יחידות הקורס</h2>

        <div className="space-y-3">
          {units.map((unit, idx) => (
            <div
              key={unit.id}
              className={`bg-white rounded-xl shadow p-4 flex justify-between items-center ${
                unit.locked ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    unit.completed
                      ? 'bg-green-500 text-white'
                      : unit.locked
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {unit.completed ? '✓' : idx + 1}
                </div>
                <span className={`font-medium ${unit.locked ? 'text-gray-400' : 'text-gray-800'}`}>
                  {unit.title}
                </span>
              </div>
              {!unit.locked ? (
                <Link
                  href={`/unit/${unit.id}`}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                >
                  {unit.completed ? 'צפה שוב' : 'התחל'}
                </Link>
              ) : (
                <span className="text-gray-400 text-sm flex items-center gap-1">🔒 נעול</span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
