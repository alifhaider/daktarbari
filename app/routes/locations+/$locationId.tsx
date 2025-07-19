import { invariantResponse } from '@epic-web/invariant'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/$locationId'
import { Badge } from '#app/components/ui/badge.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Img } from 'openimg/react'
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '#app/components/ui/avatar.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '#app/components/ui/tabs.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Link } from 'react-router'

const mockLocationDetails = {
	id: '1',
	name: 'Downtown Medical Center',
	address: '123 Main Street',
	city: 'New York',
	state: 'NY',
	zip: '10001',
	country: 'USA',
	type: 'Hospital',
	rating: 4.8,
	reviewCount: 245,
	phone: '+1 (555) 123-4567',
	website: 'www.downtownmedical.com',
	description:
		'Downtown Medical Center is a state-of-the-art healthcare facility providing comprehensive medical services to the community. Our experienced team of healthcare professionals is dedicated to delivering exceptional patient care in a modern environment.',
	images: [
		'/placeholder.svg?height=400&width=600&text=Main+Building',
		'/placeholder.svg?height=300&width=400&text=Reception+Area',
		'/placeholder.svg?height=300&width=400&text=Consultation+Room',
		'/placeholder.svg?height=300&width=400&text=Waiting+Area',
		'/placeholder.svg?height=300&width=400&text=Laboratory',
		'/placeholder.svg?height=300&width=400&text=Pharmacy',
		'/placeholder.svg?height=300&width=400&text=Emergency+Wing',
	],
	stats: {
		totalDoctors: 12,
		totalSpecialties: 8,
		totalSchedules: 45,
		averageWaitTime: '15 mins',
		totalAppointmentsThisMonth: 1247,
		availabilityRate: 85,
	},
	specialties: [
		{ name: 'Cardiology', doctorCount: 2 },
		{ name: 'Dermatology', doctorCount: 1 },
		{ name: 'Orthopedics', doctorCount: 2 },
		{ name: 'Pediatrics', doctorCount: 2 },
		{ name: 'Internal Medicine', doctorCount: 3 },
		{ name: 'Neurology', doctorCount: 1 },
		{ name: 'Gynecology', doctorCount: 1 },
	],
	doctors: [
		{
			id: 'doc1',
			name: 'Dr. Sarah Johnson',
			image: '/placeholder.svg?height=80&width=80&text=Dr.+Johnson',
			specialties: ['Cardiology', 'Internal Medicine'],
			experience: '15 years',
			rating: 4.9,
			reviewCount: 89,
			nextAvailable: 'Today 2:30 PM',
			schedules: [
				{
					id: 'sch1',
					startTime: '09:00',
					endTime: '17:00',
					days: ['Mon', 'Wed', 'Fri'],
					visitFee: 150,
					serialFee: 25,
					discountFee: 120,
					maxAppointments: 12,
					bookedAppointments: 8,
				},
			],
		},
		{
			id: 'doc2',
			name: 'Dr. Michael Chen',
			image: '/placeholder.svg?height=80&width=80&text=Dr.+Chen',
			specialties: ['Orthopedics'],
			experience: '12 years',
			rating: 4.7,
			reviewCount: 67,
			nextAvailable: 'Tomorrow 10:00 AM',
			schedules: [
				{
					id: 'sch2',
					startTime: '08:00',
					endTime: '16:00',
					days: ['Tue', 'Thu', 'Sat'],
					visitFee: 180,
					serialFee: 30,
					discountFee: 150,
					maxAppointments: 10,
					bookedAppointments: 6,
				},
			],
		},
		{
			id: 'doc3',
			name: 'Dr. Emily Rodriguez',
			image: '/placeholder.svg?height=80&width=80&text=Dr.+Rodriguez',
			specialties: ['Pediatrics', 'Internal Medicine'],
			experience: '10 years',
			rating: 4.8,
			reviewCount: 124,
			nextAvailable: 'Today 4:00 PM',
			schedules: [
				{
					id: 'sch3',
					startTime: '10:00',
					endTime: '18:00',
					days: ['Mon', 'Tue', 'Thu'],
					visitFee: 140,
					serialFee: 20,
					discountFee: 110,
					maxAppointments: 15,
					bookedAppointments: 12,
				},
			],
		},
	],
	pricing: {
		consultationRange: '$140 - $180',
		serialFeeRange: '$20 - $30',
		averageDiscount: '20%',
		depositRequired: '$50',
		acceptsInsurance: true,
		paymentMethods: ['Cash', 'Card', 'Insurance', 'Online Payment'],
	},
	hours: [
		{ day: 'Monday', time: '8:00 AM - 8:00 PM' },
		{ day: 'Tuesday', time: '8:00 AM - 8:00 PM' },
		{ day: 'Wednesday', time: '8:00 AM - 8:00 PM' },
		{ day: 'Thursday', time: '8:00 AM - 8:00 PM' },
		{ day: 'Friday', time: '8:00 AM - 6:00 PM' },
		{ day: 'Saturday', time: '9:00 AM - 4:00 PM' },
		{ day: 'Sunday', time: 'Closed' },
	],
}

const mockReviews = [
	{
		id: '1',
		userName: 'Sarah Johnson',
		userImage: '/placeholder.svg?height=40&width=40&text=SJ',
		rating: 5,
		date: '2024-01-15',
		doctorName: 'Dr. Michael Chen',
		specialty: 'Orthopedics',
		comment:
			'Excellent facility with very professional staff. Dr. Chen was thorough and caring. The appointment was on time and the facility is very clean.',
	},
	{
		id: '2',
		userName: 'Michael Chen',
		userImage: '/placeholder.svg?height=40&width=40&text=MC',
		rating: 4,
		date: '2024-01-10',
		doctorName: 'Dr. Emily Rodriguez',
		specialty: 'Pediatrics',
		comment:
			"Great experience with Dr. Rodriguez for my child's checkup. The staff was friendly and the wait time was minimal.",
	},
	{
		id: '3',
		userName: 'Emily Rodriguez',
		userImage: '/placeholder.svg?height=40&width=40&text=ER',
		rating: 5,
		date: '2024-01-05',
		doctorName: 'Dr. Sarah Johnson',
		specialty: 'Cardiology',
		comment:
			'Outstanding care from Dr. Johnson. The consultation was detailed and she explained everything clearly. Highly recommend this location.',
	},
]

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
	const actualLocation = loaderData.location
	const location = mockLocationDetails
	const remainingImagesCount = Math.max(0, location.images.length - 3)
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="border-b bg-white">
				<div className="container mx-auto px-4 py-8">
					<div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex-1">
							<div className="mb-4 flex items-center gap-3">
								<Badge variant="outline">{location.type}</Badge>
								<div className="flex items-center gap-1">
									<Icon name="award" className="h-4 w-4 text-gray-600" />
									<span className="text-sm text-gray-600">Top Rated</span>
								</div>
							</div>

							<h1 className="mb-4 text-3xl font-bold text-gray-900">
								{location.name}
							</h1>

							<div className="mb-6 flex items-center text-gray-600">
								<Icon name="map-pin" className="mr-2 h-5 w-5" />
								<span>
									{location.address}, {location.city}, {location.state}{' '}
									{location.zip}
								</span>
							</div>

							<div className="flex items-center gap-8">
								<div className="flex items-center">
									<Icon
										name="star"
										className="mr-2 h-5 w-5 fill-gray-900 text-gray-900"
									/>
									<span className="text-lg font-semibold">
										{location.rating}
									</span>
									<span className="ml-2 text-gray-600">
										({location.reviewCount} reviews)
									</span>
								</div>
								<div className="flex items-center text-gray-600">
									<Icon name="users" className="mr-2 h-5 w-5" />
									<span>{location.stats.totalDoctors} Doctors</span>
								</div>
								<div className="flex items-center text-gray-600">
									<Icon name="clock" className="mr-2 h-5 w-5" />
									<span>{location.stats.averageWaitTime} avg wait</span>
								</div>
							</div>
						</div>

						<div className="rounded-lg bg-gray-50 p-6 lg:w-80">
							<Button
								size="lg"
								className="mb-4 w-full bg-gray-900 hover:bg-gray-800"
							>
								Book Appointment
							</Button>
							<div className="text-center text-gray-600">
								<div className="text-sm">Next Available</div>
								<div className="font-semibold">Today 2:30 PM</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Key Stats */}
			<div className="border-b bg-white">
				<div className="container mx-auto px-4 py-8">
					<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
						<div className="text-center">
							<Icon
								name="user-check"
								className="mx-auto mb-2 h-8 w-8 text-gray-600"
							/>
							<div className="text-2xl font-bold text-gray-900">
								{location.stats.totalDoctors}
							</div>
							<div className="text-sm text-gray-600">Expert Doctors</div>
						</div>
						<div className="text-center">
							<Icon
								name="stethoscope"
								className="mx-auto mb-2 h-8 w-8 text-gray-600"
							/>
							<div className="text-2xl font-bold text-gray-900">
								{location.stats.totalSpecialties}
							</div>
							<div className="text-sm text-gray-600">Specialties</div>
						</div>
						<div className="text-center">
							<Icon
								name="calendar"
								className="mx-auto mb-2 h-8 w-8 text-gray-600"
							/>
							<div className="text-2xl font-bold text-gray-900">
								{location.stats.totalSchedules}
							</div>
							<div className="text-sm text-gray-600">Time Slots</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-gray-900">
								{location.stats.availabilityRate}%
							</div>
							<div className="text-sm text-gray-600">Availability</div>
						</div>
					</div>
				</div>
			</div>

			{/* Gallery */}
			<div className="container mx-auto px-4 py-12">
				<h2 className="mb-8 text-2xl font-bold text-gray-900">
					Facility Photos
				</h2>
				<div className="grid h-96 grid-cols-4 gap-4">
					<div className="relative col-span-3 overflow-hidden rounded-lg">
						<Img
							width={600}
							height={400}
							src={location.images[0] || '/placeholder.svg'}
							alt={`${location.name} main view`}
							className="object-cover"
						/>
					</div>

					<div className="col-span-1 grid grid-rows-2 gap-4">
						<div className="relative overflow-hidden rounded-lg">
							<Img
								src={location.images[1] || '/placeholder.svg'}
								alt={`${location.name} view 2`}
								width={600}
								height={400}
								className="object-cover"
							/>
						</div>

						<div className="relative overflow-hidden rounded-lg">
							<Img
								src={location.images[2] || '/placeholder.svg'}
								alt={`${location.name} view 3`}
								width={600}
								height={400}
								className="object-cover"
							/>
							{remainingImagesCount > 0 && (
								<div className="absolute inset-0 flex items-center justify-center bg-black/60">
									<div className="text-center text-white">
										<div className="text-xl font-semibold">
											+{remainingImagesCount}
										</div>
										<div className="text-sm">more photos</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 pb-12">
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
					{/* Main Content */}
					<div className="lg:col-span-2">
						<Tabs defaultValue="overview" className="w-full">
							<TabsList className="w-full">
								<TabsTrigger value="overview">Overview</TabsTrigger>
								<TabsTrigger value="doctors">Doctors</TabsTrigger>
								<TabsTrigger value="specialties">Specialties</TabsTrigger>
								<TabsTrigger value="reviews">Reviews</TabsTrigger>
							</TabsList>

							<TabsContent value="overview" className="mt-8 space-y-8">
								{/* About */}
								<div className="rounded-lg border border-gray-200 bg-white p-8">
									<h3 className="mb-4 text-xl font-bold text-gray-900">
										About This Location
									</h3>
									<p className="mb-6 leading-relaxed text-gray-600">
										{location.description}
									</p>

									<div className="grid grid-cols-2 gap-6 text-sm">
										<div className="rounded-lg bg-gray-50 p-4">
											<div className="text-gray-600">Monthly Appointments</div>
											<div className="text-xl font-bold text-gray-900">
												{location.stats.totalAppointmentsThisMonth}
											</div>
										</div>
										<div className="rounded-lg bg-gray-50 p-4">
											<div className="text-gray-600">Average Wait Time</div>
											<div className="text-xl font-bold text-gray-900">
												{location.stats.averageWaitTime}
											</div>
										</div>
									</div>
								</div>

								{/* Pricing */}
								<div className="rounded-lg border border-gray-200 bg-white p-8">
									<div className="mb-6 flex items-center gap-3">
										<Icon
											name="dollar-sign"
											className="h-6 w-6 text-gray-600"
										/>
										<h3 className="text-xl font-bold text-gray-900">
											Pricing Information
										</h3>
									</div>

									<div className="mb-6 grid grid-cols-2 gap-6">
										<div className="rounded-lg bg-gray-50 p-4">
											<div className="mb-1 text-gray-600">Consultation Fee</div>
											<div className="text-2xl font-bold text-gray-900">
												{location.pricing.consultationRange}
											</div>
										</div>
										<div className="rounded-lg bg-gray-50 p-4">
											<div className="mb-1 text-gray-600">Serial Fee</div>
											<div className="text-2xl font-bold text-gray-900">
												{location.pricing.serialFeeRange}
											</div>
										</div>
									</div>

									<div className="space-y-3">
										<div className="flex items-center justify-between text-sm">
											<span className="text-gray-600">Average Discount</span>
											<span className="font-medium">
												{location.pricing.averageDiscount}
											</span>
										</div>
										<div className="flex items-center justify-between text-sm">
											<span className="text-gray-600">Insurance Accepted</span>
											<span className="font-medium text-green-700">Yes</span>
										</div>
										<div className="flex items-center justify-between text-sm">
											<span className="text-gray-600">Payment Methods</span>
											<span className="font-medium">
												{location.pricing.paymentMethods.join(', ')}
											</span>
										</div>
									</div>
								</div>
							</TabsContent>

							<TabsContent value="doctors" className="mt-8 space-y-6">
								{location.doctors.map((doctor) => (
									<div
										key={doctor.id}
										className="rounded-lg border border-gray-200 bg-white p-8"
									>
										<div className="flex items-start gap-6">
											<Avatar className="h-20 w-20">
												<AvatarImage
													src={doctor.image || '/placeholder.svg'}
													alt={doctor.name}
												/>
												<AvatarFallback className="text-lg">
													{doctor.name
														.split(' ')
														.map((n) => n[0])
														.join('')}
												</AvatarFallback>
											</Avatar>

											<div className="flex-1">
												<div className="mb-4 flex items-start justify-between">
													<div>
														<h3 className="text-xl font-bold text-gray-900">
															{doctor.name}
														</h3>
														<p className="text-gray-600">
															{doctor.experience} experience
														</p>
													</div>
													<div className="text-right">
														<div className="mb-2 flex items-center">
															<Icon
																name="star"
																className="mr-1 h-4 w-4 fill-gray-900 text-gray-900"
															/>
															<span className="font-semibold">
																{doctor.rating}
															</span>
															<span className="ml-1 text-sm text-gray-500">
																({doctor.reviewCount})
															</span>
														</div>
														<div className="text-sm font-medium text-green-700">
															Next: {doctor.nextAvailable}
														</div>
													</div>
												</div>

												<div className="mb-6 flex flex-wrap gap-2">
													{doctor.specialties.map((specialty) => (
														<Badge key={specialty} variant="outline">
															{specialty}
														</Badge>
													))}
												</div>

												{doctor.schedules.map((schedule) => (
													<div
														key={schedule.id}
														className="rounded-lg bg-gray-50 p-6"
													>
														<div className="grid grid-cols-1 gap-6 md:grid-cols-4">
															<div>
																<h4 className="mb-2 font-semibold text-gray-900">
																	Schedule
																</h4>
																<div className="text-sm text-gray-600">
																	<div>{schedule.days.join(', ')}</div>
																	<div className="font-medium">
																		{schedule.startTime} - {schedule.endTime}
																	</div>
																</div>
															</div>
															<div>
																<h4 className="mb-2 font-semibold text-gray-900">
																	Fees
																</h4>
																<div className="text-sm">
																	<div>Visit: ${schedule.visitFee}</div>
																	<div>Serial: ${schedule.serialFee}</div>
																</div>
															</div>
															<div>
																<h4 className="mb-2 font-semibold text-gray-900">
																	Availability
																</h4>
																<div className="text-sm">
																	<div className="font-medium">
																		{schedule.maxAppointments -
																			schedule.bookedAppointments}{' '}
																		slots left
																	</div>
																	<div className="text-gray-500">
																		of {schedule.maxAppointments} total
																	</div>
																</div>
															</div>
															<div>
																<Button className="w-full bg-gray-900 hover:bg-gray-800">
																	Book Now
																</Button>
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
								))}
							</TabsContent>

							<TabsContent value="specialties" className="mt-8">
								<div className="rounded-lg border border-gray-200 bg-white p-8">
									<h3 className="mb-6 text-xl font-bold text-gray-900">
										Available Specialties
									</h3>
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										{location.specialties.map((specialty) => (
											<div
												key={specialty.name}
												className="flex items-center justify-between rounded-lg border p-4"
											>
												<div>
													<div className="font-medium text-gray-900">
														{specialty.name}
													</div>
													<div className="text-sm text-gray-600">
														{specialty.doctorCount} doctor
														{specialty.doctorCount > 1 ? 's' : ''} available
													</div>
												</div>
												<Badge variant="outline">{specialty.doctorCount}</Badge>
											</div>
										))}
									</div>
								</div>
							</TabsContent>

							<TabsContent value="reviews" className="mt-8">
								<div className="rounded-lg border border-gray-200 bg-white p-8">
									<h3 className="mb-6 text-xl font-bold text-gray-900">
										Patient Reviews ({location.reviewCount})
									</h3>
									<div className="space-y-6">
										{mockReviews.map((review) => (
											<div
												key={review.id}
												className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0"
											>
												<div className="flex items-start gap-4">
													<Avatar>
														<AvatarImage
															src={review.userImage || '/placeholder.svg'}
															alt={review.userName}
														/>
														<AvatarFallback>
															{review.userName
																.split(' ')
																.map((n) => n[0])
																.join('')}
														</AvatarFallback>
													</Avatar>
													<div className="flex-1">
														<div className="mb-2 flex items-center gap-3">
															<h4 className="font-semibold text-gray-900">
																{review.userName}
															</h4>
															<div className="flex items-center">
																{[...Array(5)].map((_, i) => (
																	<Icon
																		name="star"
																		key={i}
																		className={`h-4 w-4 ${
																			i < review.rating
																				? 'fill-gray-900 text-gray-900'
																				: 'text-gray-300'
																		}`}
																	/>
																))}
															</div>
															<span className="text-sm text-gray-500">
																{new Date(review.date).toLocaleDateString()}
															</span>
														</div>
														<div className="mb-3 flex gap-2">
															<Badge variant="outline" className="text-xs">
																{review.doctorName}
															</Badge>
															<Badge variant="outline" className="text-xs">
																{review.specialty}
															</Badge>
														</div>
														<p className="text-gray-600">{review.comment}</p>
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							</TabsContent>
						</Tabs>
					</div>

					{/* Sidebar */}
					<div className="space-y-8">
						{/* Contact */}
						<div className="rounded-lg border border-gray-200 bg-white p-6">
							<h3 className="mb-4 font-bold text-gray-900">
								Contact Information
							</h3>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<Icon name="phone" className="h-4 w-4 text-gray-600" />
									<span className="text-sm">{location.phone}</span>
								</div>
								<div className="flex items-center gap-3">
									<Icon name="globe" className="h-4 w-4 text-gray-600" />
									<span className="text-sm text-blue-600">
										{location.website}
									</span>
								</div>
								<div className="flex items-start gap-3">
									<Icon
										name="map-pin"
										className="mt-0.5 h-4 w-4 text-gray-600"
									/>
									<div className="text-sm">
										<div>{location.address}</div>
										<div>
											{location.city}, {location.state} {location.zip}
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Hours */}
						<div className="rounded-lg border border-gray-200 bg-white p-6">
							<div className="mb-4 flex items-center gap-3">
								<Icon name="clock" className="h-5 w-5 text-gray-600" />
								<h3 className="font-bold text-gray-900">Hours</h3>
							</div>
							<div className="space-y-2">
								{location.hours.map((hour) => (
									<div key={hour.day} className="flex justify-between text-sm">
										<span className="font-medium text-gray-900">
											{hour.day}
										</span>
										<span className="text-gray-600">{hour.time}</span>
									</div>
								))}
							</div>
						</div>

						{/* Rating Summary */}
						<div className="rounded-lg border border-gray-200 bg-white p-6">
							<h3 className="mb-4 font-bold text-gray-900">Rating Summary</h3>
							<div className="text-center">
								<div className="mb-2 text-3xl font-bold text-gray-900">
									{location.rating}
								</div>
								<div className="mb-3 flex justify-center">
									{[...Array(5)].map((_, i) => (
										<Icon
											name="star"
											key={i}
											className={`h-5 w-5 ${
												i < Math.floor(location.rating)
													? 'fill-gray-900 text-gray-900'
													: 'text-gray-300'
											}`}
										/>
									))}
								</div>
								<div className="mb-4 text-sm text-gray-600">
									Based on {location.reviewCount} reviews
								</div>
								<Button variant="outline" className="w-full bg-transparent">
									Write a Review
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<div className="container mx-auto px-4 py-12 text-center">
						<h1 className="text-primary text-3xl font-bold">
							Location Not Found
						</h1>
						<p className="text-muted-foreground mt-4">
							The location you are looking for does not exist or has been
							removed.
						</p>
						<Button asChild variant="outline" className="mt-6">
							<Link to="/locations">
								<Icon name="arrow-left" className="mr-2 h-4 w-4" />
								Back to Locations
							</Link>
						</Button>
					</div>
				),
			}}
		/>
	)
}
