import Header from './Header'

interface Props {
  children: React.ReactNode
  /** Optional extra classes on the inner container */
  className?: string
}

/**
 * Shared layout for student-facing pages.
 * Admin pages keep their own sidebar layout.
 */
export default function MainLayout({ children, className = '' }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className={`flex-1 max-w-6xl w-full mx-auto px-4 py-8 ${className}`}>
        {children}
      </main>
    </div>
  )
}
