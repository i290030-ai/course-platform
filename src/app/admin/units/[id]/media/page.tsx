import { redirect } from 'next/navigation'

// Media builder merged into the unified unit editor.
export default function MediaRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/admin/units/${params.id}/edit`)
}
