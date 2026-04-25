'use client'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import { isAdminRole } from '@/lib/roles'

export default function Header() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Right: logo + desktop nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600
              flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              🎓
            </span>
            <span className="font-extrabold text-gray-900 text-sm hidden sm:block">פלטפורמת קורסים</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard"
              className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600
                hover:bg-gray-50 hover:text-indigo-700 transition-colors">
              קורסים
            </Link>
          </nav>
        </div>

        {/* Left: user info + logout */}
        <div className="flex items-center gap-3">
          {session?.user?.email && (
            <span className="hidden sm:block text-xs text-gray-400 truncate max-w-[180px]">
              {session.user.email}
            </span>
          )}

          {/* Admin back-link — visible to admin + super_admin */}
          {isAdminRole(role) && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-semibold
                text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors
                px-3 py-1.5 rounded-lg border border-indigo-200 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              חזרה לניהול
            </Link>
          )}

          {/* Desktop logout */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold
              text-gray-500 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg
              hover:bg-red-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            התנתק
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center
              text-gray-600 hover:bg-gray-200 transition-colors">
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1
          shadow-lg animate-in slide-in-from-top-2 duration-150">
          <Link href="/dashboard" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold
              text-gray-700 hover:bg-gray-50 transition-colors">
            📚 קורסים
          </Link>
          {isAdminRole(role) && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold
                text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200">
              ⚙️ חזרה לניהול
            </Link>
          )}
          <div className="pt-2 border-t border-gray-100 mt-1">
            <p className="text-xs text-gray-400 px-3 pb-1 truncate">{session?.user?.email}</p>
            <button onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold
                text-red-500 hover:bg-red-50 transition-colors w-full text-right">
              🚪 התנתק
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
