import { Form, Link, MetaFunction, Outlet, useSearchParams } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { format } from 'date-fns'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Bookings / DB' },
		{ name: 'description', content: 'Your bookings from DaktarBari' },
	]
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const searchParams = new URL(request.url).searchParams
	const statusFilter = searchParams.get('status') || 'all'
	const nameFilter = searchParams.get('name') || ''
	const page = parseInt(searchParams.get('page') || '1', 10) || 1
	const skip = (page - 1) * 10
	const bookings = await prisma.booking.findMany({
		where: {
			userId,
			...(statusFilter !== 'all' && { status: statusFilter }),
			...(nameFilter && {}),
		},
		select: {
			id: true,
			name: true,
			phone: true,
			status: true,
			createdAt: true,
			user: { select: { email: true } },
			doctor: {
				include: {
					specialties: { select: { id: true, name: true } },
					user: { select: { name: true, username: true } },
				},
			},
			schedule: { select: { startTime: true, endTime: true } },
		},
		skip,
		take: 10,
		orderBy: { createdAt: 'desc' },
	})
	return { bookings }
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
}

export default function BookingsRoute({ loaderData }: Route.ComponentProps) {
	const { bookings } = loaderData
	const [searchParams, setSearchParams] = useSearchParams()

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'CONFIRMED':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
			case 'PENDING':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
			case 'COMPLETED':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
			case 'CANCELLED':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
		}
	}

	return (
		<div className="container mx-auto space-y-6 p-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
					<p className="text-muted-foreground">
						Manage and view all patient appointments
					</p>
				</div>
				<Button>
					<Icon name="calendar" className="mr-2 h-4 w-4" />
					New Booking
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Bookings</CardTitle>
					<CardDescription>
						A list of all patient bookings and their current status
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form
						className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
						onChange={async (event) => {
							event.preventDefault()
							const formData = new FormData(event.currentTarget)
							const newSearchParams = new URLSearchParams(searchParams)
							for (const [key, value] of formData.entries()) {
								if (formData.has(key) && value.toString().trim()) {
									newSearchParams.set(key, value.toString())
								} else {
									newSearchParams.delete(key)
								}
							}

							setSearchParams(newSearchParams)

							// handleFormChange(event.currentTarget)
						}}
					>
						<div className="relative max-w-sm flex-1">
							<Icon
								name="magnifying-glass"
								className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform"
							/>

							<Input
								type="text"
								name="name"
								placeholder="Search bookings..."
								defaultValue={searchParams.get('name') || ''}
								className="pl-10"
							/>
						</div>
						<Select
							defaultValue={searchParams.get('status') || 'all'}
							name="status"
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="PENDING">Pending</SelectItem>
								<SelectItem value="CONFIRMED">Confirmed</SelectItem>
								<SelectItem value="COMPLETED">Completed</SelectItem>
								<SelectItem value="CANCELLED">Cancelled</SelectItem>
							</SelectContent>
						</Select>
					</Form>

					<div className="overflow-hidden rounded-md border">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr className="border-b">
										<th className="text-muted-foreground h-12 px-4 text-left align-middle font-medium">
											Booking ID
										</th>
										<th className="text-muted-foreground h-12 px-4 text-left align-middle font-medium">
											Patient
										</th>
										<th className="text-muted-foreground h-12 px-4 text-left align-middle font-medium">
											Contact
										</th>
										<th className="text-muted-foreground h-12 px-4 text-left align-middle font-medium">
											Doctor
										</th>
										<th className="text-muted-foreground h-12 px-4 text-left align-middle font-medium">
											Schedule
										</th>
										<th className="text-muted-foreground h-12 px-4 text-left align-middle font-medium">
											Status
										</th>
										<th className="text-muted-foreground h-12 px-4 text-left align-middle font-medium">
											Created
										</th>
										<th className="text-muted-foreground h-12 px-4 text-right align-middle font-medium">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{bookings.map((booking) => (
										<tr
											key={booking.id}
											className="hover:bg-muted/50 border-b transition-colors"
										>
											<td className="p-4 align-middle font-mono text-sm">
												{booking.id.slice(-8)}
											</td>
											<td className="p-4 align-middle">
												<div className="flex items-center gap-2">
													<Icon
														name="avatar"
														className="text-muted-foreground h-4 w-4"
													/>
													\
													<div>
														<div className="font-medium">{booking.name}</div>
														<div className="text-muted-foreground text-sm">
															{booking.user.email}
														</div>
													</div>
												</div>
											</td>
											<td className="p-4 align-middle">
												<div className="flex items-center gap-2">
													<Icon
														name="phone"
														className="text-muted-foreground h-4 w-4"
													/>
													<span className="text-sm">{booking.phone}</span>
												</div>
											</td>
											<td className="p-4 align-middle">
												<div className="flex items-center gap-2">
													<Icon
														name="stethoscope"
														className="text-muted-foreground h-4 w-4"
													/>
													<div>
														<div className="font-medium">
															{booking.doctor.user.name ??
																booking.doctor.user.username}
														</div>
														<div className="text-muted-foreground text-sm">
															{booking.doctor.specialties
																.map((spec) => spec.name)
																.join(', ')}
														</div>
													</div>
												</div>
											</td>
											<td className="p-4 align-middle">
												<div>
													<div className="font-medium">
														{format(
															new Date(booking.schedule.startTime),
															'MMM dd, yyyy',
														)}
													</div>
													<div className="text-muted-foreground text-sm">
														{format(
															new Date(booking.schedule.startTime),
															'h:mm a',
														)}{' '}
														-{' '}
														{format(
															new Date(booking.schedule.endTime),
															'h:mm a',
														)}
													</div>
												</div>
											</td>
											<td className="p-4 align-middle">
												<Badge
													className={getStatusColor(
														booking.status || 'PENDING',
													)}
												>
													{booking.status}
												</Badge>
											</td>
											<td className="text-muted-foreground p-4 align-middle text-sm">
												{format(new Date(booking.createdAt), 'MMM dd, yyyy')}
											</td>
											<td className="p-4 text-right align-middle">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" className="h-8 w-8 p-0">
															<span className="sr-only">Open menu</span>
															<Icon name="ellipsis" className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem>
															<Link to={`/bookings/${booking.id}`}>
																<Icon name="eye" className="mr-2 h-4 w-4" />
																View Details
															</Link>
														</DropdownMenuItem>
														<DropdownMenuItem className="text-red-600">
															<Icon name="trash" className="mr-2 h-4 w-4" />
															Cancel Booking
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					{/* {filteredBookings.length > 0 && (
						<div className="flex items-center justify-between px-2 py-4">
							<div className="text-muted-foreground text-sm">
								Showing {startIndex + 1}-
								{Math.min(endIndex, filteredBookings.length)} of{' '}
								{filteredBookings.length} results
							</div>
							<div className="flex items-center space-x-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage - 1)}
									disabled={currentPage === 1}
								>
									<Icon name="chevron-left" className="h-4 w-4" />
									Previous
								</Button>
								<div className="flex items-center space-x-1">
									{Array.from({ length: totalPages }, (_, i) => i + 1).map(
										(page) => (
											<Button
												key={page}
												variant={currentPage === page ? 'default' : 'outline'}
												size="sm"
												onClick={() => setCurrentPage(page)}
												className="h-8 w-8 p-0"
											>
												{page}
											</Button>
										),
									)}
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(currentPage + 1)}
									disabled={currentPage === totalPages}
								>
									Next
									<Icon name="chevron-right" className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}

					{filteredBookings.length === 0 && (
						<div className="py-8 text-center">
							<p className="text-muted-foreground">
								No bookings found matching your criteria.
							</p>
						</div>
					)} */}
				</CardContent>
			</Card>
		</div>
	)
}
