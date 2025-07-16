import { redirect } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

export async function loader() {
	return redirect('/search')
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
