import { redirect } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { type Route } from './+types'

export async function loader({ params }: Route.LoaderArgs) {
	return redirect(`/profiles/${params.username}`)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
