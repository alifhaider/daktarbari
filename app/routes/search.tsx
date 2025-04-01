import { searchDoctors } from '@prisma/client/sql'
import { Img } from 'openimg/react'
import { Link, redirect } from 'react-router'
import { ErrorList } from '#app/components/forms.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getUserImgSrc, useDelayedIsPending } from '#app/utils/misc.tsx'
import { type Route } from './+types/search'

export async function loader({ request }: Route.LoaderArgs) {
	const searchTerm = new URL(request.url).searchParams.get('search')
	if (searchTerm === '') {
		return redirect('/search')
	}

	const name = `%${searchTerm ?? ''}%`
	const users = await prisma.$queryRawTyped(searchDoctors(name, '', ''))
	return { status: 'idle', users } as const
}

export default function SearchRoute({ loaderData }: Route.ComponentProps) {
	const isPending = useDelayedIsPending({
		formMethod: 'GET',
		formAction: '/search',
	})

	return (
		<>
			<div className="container mb-48 mt-36 flex flex-col items-center justify-center gap-6">
				<h1 className="text-h1">Daktar Bari Doctors</h1>
				<div className="w-full max-w-[700px]">
					<SearchBar status={loaderData.status} autoFocus autoSubmit />
				</div>
				<main>
					{loaderData.status === 'idle' ? (
						loaderData.users.length ? (
							<ul
								className={cn(
									'flex w-full flex-wrap items-center justify-center gap-4 delay-200',
									{ 'opacity-50': isPending },
								)}
							>
								{loaderData.users.map((user) => (
									<li key={user.id}>
										<Link
											to={user.username}
											className="flex h-36 w-44 flex-col items-center justify-center rounded-lg bg-muted px-5 py-3"
										>
											<Img
												alt={user.name ?? user.username}
												src={getUserImgSrc(user.imageObjectKey)}
												className="h-16 w-16 rounded-full"
												width={256}
												height={256}
											/>
											{user.name ? (
												<span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-body-md">
													{user.name}
												</span>
											) : null}
											<span className="w-full overflow-hidden text-ellipsis text-center text-body-sm text-muted-foreground">
												{user.username}
											</span>
										</Link>
									</li>
								))}
							</ul>
						) : (
							<p>No users found</p>
						)
					) : loaderData.status === 'error' ? (
						<ErrorList errors={['There was an error parsing the results']} />
					) : null}
				</main>
			</div>
		</>
	)
}
