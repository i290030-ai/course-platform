'use client'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdminRole, isSuperAdmin, roleLabel } from '@/lib/roles'

const BASE_SECTIONS = [
  { href: '/admin/dashboard', title: 'דאשבורד ניהול', desc: 'סקירה כללית, הגשות, התקדמות ומשימות', icon: '🏠', highlight: true, superOnly: false },
  { href: '/admin/courses', title: 'ניהול קורסים', desc: 'יצירה ועריכה של קורסים', icon: '📚', superOnly: false },
  { href: '/admin/units', title: 'ניהול יחידות', desc: 'ניהול יחידות ותוכן', icon: '📖', superOnly: false },
  { href: '/admin/submissions', title: 'הגשות ומשימות', desc: 'בדיקת הגשות, ציונים ומשוב', icon: '📝', superOnly: false },
  { href: '/admin/users', title: 'משתמשים', desc: 'ניהול משתמשים והרשמות', icon: '👥', superOnly: true },
  { href: '/admin/access-codes', title: 'קודי גישה', desc: 'יצירה וניהול קודי גישה', icon: '🔑', superOnly: true },
]

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const role = (session?.user as any)?.role
  const superAdmin = isSuperAdmin(role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !isAdminRole((session?.user as any)?.role))
      router.push('/dashboard')
  }, [status, session, router])

  const adminSections = BASE_SECTIONS.filter(s => !s.superOnly || superAdmin)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-800">
            ← חזרה
          </Link>
          <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-indigo-800">לוח ניהול</h1>
              {role && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  superAdmin ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {roleLabel(role)}
                </span>
              )}
            </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ניהול המערכת</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminSections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={`rounded-xl shadow hover:shadow-md transition-shadow p-6 flex items-center gap-4 ${
                (s as any).highlight
                  ? 'bg-gradient-to-l from-indigo-600 to-purple-600 text-white col-span-1 md:col-span-2'
                  : 'bg-white'
              }`}
            >
              <span className="text-4xl">{s.icon}</span>
              <div>
                <h3 className={`text-lg font-bold ${(s as any).highlight ? 'text-white' : 'text-gray-800'}`}>{s.title}</h3>
                <p className={`text-sm ${(s as any).highlight ? 'text-indigo-100' : 'text-gray-500'}`}>{s.desc}</p>
              </div>
              {(s as any).highlight && <span className="mr-auto text-2xl">→</span>}
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
