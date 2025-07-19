import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { Img } from 'openimg/react'
import { type Route } from './+types'
import { Link, useSearchParams } from 'react-router'
import { Badge } from '#app/components/ui/badge.tsx'
import { getLocationImgSrc } from '#app/utils/misc.tsx'
import { formatDate } from 'date-fns'

const mockLocations = [
	{
		id: '1',
		name: 'Downtown Medical Center',
		address: '123 Main Street',
		city: 'New York',
		state: 'NY',
		zip: '10001',
		type: 'Hospital',
		rating: 4.8,
		reviewCount: 245,
		doctorCount: 12,
		specialties: ['Cardiology', 'Neurology', 'Orthopedics'],
		nextAvailable: 'Today 2:30 PM',
		waitTime: '15 min',
		image: '/placeholder.svg?height=300&width=400&text=Downtown+Medical',
		featured: true,
	},
	{
		id: '2',
		name: 'Sunset Family Clinic',
		address: '456 Oak Avenue',
		city: 'Los Angeles',
		state: 'CA',
		zip: '90210',
		type: 'Clinic',
		rating: 4.6,
		reviewCount: 189,
		doctorCount: 8,
		specialties: ['Family Medicine', 'Pediatrics'],
		nextAvailable: 'Tomorrow 9:00 AM',
		waitTime: '10 min',
		image: '/placeholder.svg?height=300&width=400&text=Sunset+Clinic',
		featured: false,
	},
	{
		id: '3',
		name: 'Riverside Wellness Center',
		address: '789 River Road',
		city: 'Chicago',
		state: 'IL',
		zip: '60601',
		type: 'Wellness Center',
		rating: 4.9,
		reviewCount: 312,
		doctorCount: 15,
		specialties: ['Internal Medicine', 'Dermatology', 'Psychiatry'],
		nextAvailable: 'Today 4:00 PM',
		waitTime: '20 min',
		image: '/placeholder.svg?height=300&width=400&text=Riverside+Wellness',
		featured: true,
	},
	{
		id: '4',
		name: 'Mountain View Specialty Hospital',
		address: '321 Hill Street',
		city: 'Denver',
		state: 'CO',
		zip: '80202',
		type: 'Specialty Hospital',
		rating: 4.7,
		reviewCount: 156,
		doctorCount: 20,
		specialties: ['Oncology', 'Cardiology', 'Surgery'],
		nextAvailable: 'Tomorrow 11:00 AM',
		waitTime: '25 min',
		image: '/placeholder.svg?height=300&width=400&text=Mountain+View',
		featured: false,
	},
	{
		id: '5',
		name: 'Coastal Medical Plaza',
		address: '654 Beach Boulevard',
		city: 'Miami',
		state: 'FL',
		zip: '33101',
		type: 'Medical Plaza',
		rating: 4.5,
		reviewCount: 203,
		doctorCount: 10,
		specialties: ['Gynecology', 'Orthopedics'],
		nextAvailable: 'Today 6:00 PM',
		waitTime: '12 min',
		image: '/placeholder.svg?height=300&width=400&text=Coastal+Medical',
		featured: false,
	},
	{
		id: '6',
		name: 'Central Park Health Hub',
		address: '987 Park Avenue',
		city: 'New York',
		state: 'NY',
		zip: '10022',
		type: 'Health Hub',
		rating: 4.8,
		reviewCount: 278,
		doctorCount: 18,
		specialties: ['Family Medicine', 'Preventive Care', 'Wellness'],
		nextAvailable: 'Tomorrow 8:00 AM',
		waitTime: '8 min',
		image: '/placeholder.svg?height=300&width=400&text=Central+Park+Hub',
		featured: true,
	},
]

export async function loader({ request }: Route.LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('location')?.toLocaleLowerCase()
	const locations = await prisma.scheduleLocation.findMany({
		where: query
			? {
					OR: [
						{ name: { contains: query } },
						{ address: { contains: query } },
						{ city: { contains: query } },
						{ state: { contains: query } },
						{ zip: { contains: query } },
					],
				}
			: {},
		include: {
			schedules: {
				take: 1,
				orderBy: { startTime: 'asc' },
			},
			images: {
				select: {
					id: true,
					objectKey: true,
				},
			},

			_count: {
				select: {
					schedules: true,
				},
			},
		},
		distinct: ['name', 'address', 'city', 'state', 'zip'],
	})
	return { locations }
}

export default function LocationsIndex({ loaderData }: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const locations = loaderData.locations

	const featuredLocations = mockLocations.filter((loc) => loc.featured)
	return (
		<section className="container mx-auto min-h-screen py-12 md:px-8">
			{/* Clean Header */}
			<div className="max-w-3xl">
				<h1 className="text-primary mb-4 text-4xl font-bold">
					Find Medical Care
				</h1>
				<p className="text-muted-foreground mb-8 text-xl">
					Browse trusted medical facilities with experienced doctors and quality
					care.
				</p>
			</div>

			{/* Simple Search */}
			<div className="flex w-full justify-center gap-3">
				<div className="bg-background relativeflex items-center">
					<Input
						type="search"
						name="location"
						defaultValue={searchParams.get('location') ?? ''}
						placeholder="Dr. Shafiul Azam"
						className="w-full min-w-md"
						autoFocus
					/>
				</div>
				<Button>Search</Button>
			</div>

			<div className="mt-12 flex flex-col gap-3.5 md:gap-6">
				{locations.map((location) => (
					<Link
						key={location.id}
						to={`/locations/${location.id}`}
						className="group hover:border-brand/20 bg-primary-foreground rounded-lg border p-6 transition-colors"
					>
						<div className="flex items-start gap-6">
							{/* Image */}
							<div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg">
								<Img
									src={getLocationImgSrc(location.images[0]?.objectKey)}
									alt={location.name}
									width={400}
									height={300}
									className="object-cover"
								/>
							</div>

							{/* Content */}
							<div className="min-w-0 flex-1">
								<div className="mb-2 flex items-start justify-between">
									<div>
										<h3 className="text-primary text-lg font-semibold">
											{location.name}
										</h3>
										<div className="text-muted-foreground flex items-center">
											<Icon name="map-pin" className="mr-1 h-4 w-4" />
											<span className="text-sm">
												{location.address}, {location.city}, {location.state}
											</span>
										</div>
									</div>
									<Badge variant="outline">{location.type}</Badge>
								</div>

								{/* Info Grid */}
								<div className="text-accent mt-4 grid grid-cols-4 gap-6 text-sm">
									<div>
										<div className="mb-0.5 text-gray-400">Rating</div>
										<div className="text-primary flex items-center">
											<Icon
												name="star"
												className="fill-brand text-brand mr-1 h-4 w-4"
											/>
											<span className="text-secondary-foreground font-medium">
												4.8
											</span>
										</div>
									</div>
									<div>
										<div className="mb-0.5 text-gray-400">Doctors</div>
										<div className="text-secondary-foreground font-medium">
											10
										</div>
									</div>
									<div>
										<div className="mb-0.5 text-gray-400">Schedules</div>
										<div className="text-secondary-foreground font-medium">
											{location._count.schedules}
										</div>
									</div>
								</div>
							</div>

							{/* Arrow */}
							<div className="flex-shrink-0">
								<Icon
									name="arrow-right"
									className="text-muted group-hover:text-brand h-5 w-5"
								/>
							</div>
						</div>
					</Link>
				))}
			</div>

			{/* Featured Section */}

			{/* All Locations */}
			<div className="mt-16">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-gray-900">
							Featured Locations
						</h2>
						<p className="mt-1 text-gray-600">
							Top-rated facilities in your area
						</p>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
				{featuredLocations.map((location) => (
					<Link key={location.id} to={`/locations/${location.id}`}>
						<article className="bg-muted overflow-hidden rounded-lg border hover:border-gray-300">
							{/* Image */}
							<div className="relative h-48">
								<Img
									width={400}
									height={300}
									src={'/img/placeholder.png'}
									alt={location.name}
									className="object-cover"
								/>
								<div className="absolute top-3 left-3">
									<Badge className="border-0 bg-white text-gray-900">
										Featured
									</Badge>
								</div>
							</div>

							{/* Content */}
							<div className="p-6">
								<div className="mb-3 flex items-start justify-between">
									<h3 className="text-lg leading-tight font-semibold text-gray-900">
										{location.name}
									</h3>
									<Badge variant="outline" className="ml-2 text-xs">
										{location.type}
									</Badge>
								</div>

								<div className="mb-4 flex items-center text-gray-600">
									<Icon name="map-pin" className="mr-2 h-4 w-4" />
									<span className="text-sm">
										{location.city}, {location.state}
									</span>
								</div>

								{/* Key Info Grid */}
								<div className="mb-4 grid grid-cols-2 gap-4 text-sm">
									<div>
										<div className="text-gray-500">Rating</div>
										<div className="flex items-center">
											<Icon
												name="star"
												className="mr-1 h-4 w-4 fill-gray-900 text-gray-900"
											/>
											<span className="font-medium">{location.rating}</span>
											<span className="ml-1 text-gray-500">
												({location.reviewCount})
											</span>
										</div>
									</div>
									<div>
										<div className="text-gray-500">Doctors</div>
										<div className="font-medium">
											{location.doctorCount} available
										</div>
									</div>
									<div>
										<div className="text-gray-500">Wait time</div>
										<div className="font-medium">{location.waitTime}</div>
									</div>
									<div>
										<div className="text-gray-500">Next slot</div>
										<div className="font-medium text-green-700">
											{location.nextAvailable}
										</div>
									</div>
								</div>

								{/* Specialties */}
								<div className="flex flex-wrap gap-2">
									{location.specialties.slice(0, 2).map((specialty) => (
										<span
											key={specialty}
											className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
										>
											{specialty}
										</span>
									))}
									{location.specialties.length > 2 && (
										<span className="text-xs text-gray-500">
											+{location.specialties.length - 2} more
										</span>
									)}
								</div>
							</div>
						</article>
					</Link>
				))}
			</div>
		</section>
	)
}
