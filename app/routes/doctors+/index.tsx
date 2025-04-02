import { redirect } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { type Route } from './+types/index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	return redirect('/search')
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
