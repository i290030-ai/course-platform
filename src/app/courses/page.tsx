'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isAdminRole } from '@/lib/roles'

/**
 * /courses — student landing page.
 * Currently forwards to /dashboard where enrolled courses are listed.
 * Replace the redirect with a real course-browser UI when needed.
 */
export default function CoursesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/login'); return }
    if (status !== 'authenticated') return

    // Admins who land here get sent to their home
    if (isAdminRole(session.user?.role)) {
      router.replace('/admin')
      return
    }

    router.replace('/dashboard')
  }, [status, session, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )
}
