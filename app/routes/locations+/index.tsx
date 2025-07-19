import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types'

export async function loader({ request }: Route.LoaderArgs) {
	const locations = await prisma.scheduleLocation.findMany({
		select: {
			id: true,
			name: true,
			address: true,
			city: true,
			state: true,
			zip: true,
			images: {
				select: { id: true, objectKey: true },
			},
		},
	})
	return { locations }
}

export default function LocationsIndex({ loaderData }: Route.ComponentProps) {
	const locations = loaderData.locations
	return (
		<div className="flex flex-col items-center justify-center gap-4">
			<h1 className="text-2xl font-bold">Locations</h1>
			<p className="text-lg text-gray-600">List of all locations</p>
			<ul className="space-y-4">
				{locations.map((location) => (
					<li key={location.id} className="border-b border-gray-200 pb-4">
						<h2 className="text-xl font-semibold">{location.name}</h2>
						<p className="text-gray-600">{location.address}</p>
						<p className="text-gray-600">
							{location.city}, {location.state} {location.zip}
						</p>
						<div className="mt-2">
							<h3 className="text-lg font-semibold">Images</h3>
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
					</li>
				))}
			</ul>
		</div>
	)
}
