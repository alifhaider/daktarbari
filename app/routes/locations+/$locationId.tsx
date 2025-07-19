import { invariantResponse } from '@epic-web/invariant'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/$locationId'

export async function loader({ request, params }: Route.LoaderArgs) {
	const location = await prisma.scheduleLocation.findUnique({
		where: { id: params.locationId },
		include: {
			images: { select: { id: true, objectKey: true } },
			schedules: {
				select: {
					id: true,
					startTime: true,
					endTime: true,
					locationId: true,
				},
			},
		},
	})
	invariantResponse(location, 'Location not found', { status: 404 })
	return { location }
}

export default function LocationDetail({ loaderData }: Route.ComponentProps) {
	const location = loaderData.location
	return (
		<div className="flex flex-col items-center justify-center gap-4">
			<h1 className="text-2xl font-bold">{location.name}</h1>
			<p className="text-lg text-gray-600">{location.address}</p>
			<p className="text-lg text-gray-600">
				{location.city}, {location.state} {location.zip}
			</p>
			<div className="mt-2">
				<h2 className="text-lg font-semibold">Images</h2>
				<ul className="grid grid-cols-2 gap-2">
					{location.images.map((image) => (
						<li key={image.id} className="overflow-hidden rounded-md">
							<img
								src={image.objectKey}
								alt=""
								className="h-32 w-full object-cover"
							/>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
