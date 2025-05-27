import { Link, Outlet } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const bookings = await prisma.booking.findMany({
		where: {
			userId,
		},
		select: { id: true },
	})
	return { bookings }
}

export default function BookingsRoute({ loaderData }: Route.ComponentProps) {
	return (
		<div>
			<h1 className="text-h1">Bookings</h1>
			<details>
				<summary>Data</summary>
				<pre>{JSON.stringify(loaderData, null, 2)}</pre>
			</details>
			<div className="flex gap-12">
				<ul>
					{loaderData.bookings.map((booking) => (
						<li key={booking.id}>
							<Link to={booking.id}>{booking.id}</Link>
						</li>
					))}
				</ul>
				<div className="flex-1">
					<Outlet />
				</div>
			</div>
		</div>
	)
}
