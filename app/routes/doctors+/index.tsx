import { searchDoctors, searchUsers } from '@prisma/client/sql'
import { Img } from 'openimg/react'
import { redirect, Link } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getUserImgSrc, useDelayedIsPending } from '#app/utils/misc.tsx'
import { type Route } from './+types/index.ts'

export async function loader({ request }: Route.LoaderArgs) {
	return redirect('/search')
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
