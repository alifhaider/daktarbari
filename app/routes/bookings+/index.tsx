import {
	getFormProps,
	getInputProps,
	type Intent,
	useForm,
} from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { differenceInHours, format, isAfter } from 'date-fns'
import {
	data,
	Form,
	Link,
	type MetaFunction,
	useFetcher,
	useSearchParams,
} from 'react-router'
import { z } from 'zod'
import { Field } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { isStartTimeMoreThanSixHoursAhead } from '#app/utils/schedule.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'
import { type Route } from './+types'
import { StatusButton } from '#app/components/ui/status-button.tsx'

function CancelBookingSchema(
	intent: Intent | null,
	options?: {
		bookingHasMoreThanSixHours: (bookingId: string) => Promise<boolean>
	},
) {
	return z
		.object({
			bookingId: z.string(),
		})
		.pipe(
			z
				.object({
					bookingId: z.string(),
				})
				.superRefine(async (data, ctx) => {
					const isValidatingSBooking =
						intent === null ||
						(intent.type === 'validate' && intent.payload.name === 'bookingId')
					if (!isValidatingSBooking) {
						ctx.addIssue({
							code: 'custom',
							path: ['form'],
							message: 'Booking validation process is not properly initiated.',
						})
						return
					}

					if (typeof options?.bookingHasMoreThanSixHours !== 'function') {
						ctx.addIssue({
							code: 'custom',
							path: ['form'],
							message: 'Booking check  validation function is not provided.',
							fatal: true,
						})
						return
					}

					try {
						const hasMoreThanSixHours =
							await options.bookingHasMoreThanSixHours(data.bookingId)

						if (!hasMoreThanSixHours) {
							ctx.addIssue({
								code: 'custom',
								path: ['bookingId'],
								message:
									'The booking cannot be cancelled as it is less than six hours away.',
								fatal: true,
							})
						}
					} catch (error) {
						ctx.addIssue({
							code: 'custom',
							path: ['form'],
							message:
								'An error occurred while validating  the booking. Please try again later.' +
								(error instanceof Error ? ` ${error.message}` : ''),
							fatal: true,
						})
					}
				}),
		)
}

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
	const bookingFilter = searchParams.get('bookingKeyword') || ''
	const page = parseInt(searchParams.get('page') || '1', 10) || 1
	const skip = (page - 1) * 10
	const bookings = await prisma.booking.findMany({
		where: {
			userId,
			...(statusFilter !== 'all' && { status: statusFilter }),
			...(bookingFilter && {
				OR: [
					{ name: { contains: bookingFilter } },
					{ phone: { contains: bookingFilter } },
					{ id: { contains: bookingFilter } },
					{
						doctor: {
							OR: [
								{ user: { name: { contains: bookingFilter } } },
								{ user: { username: { contains: bookingFilter } } },
								{ user: { email: { contains: bookingFilter } } },
								{
									specialties: { some: { name: { contains: bookingFilter } } },
								},
							],
						},
					},
					{
						schedule: {
							location: {
								OR: [
									{ name: { contains: bookingFilter } },
									{ city: { contains: bookingFilter } },
									{ zip: { contains: bookingFilter } },
									{ address: { contains: bookingFilter } },
									{ country: { contains: bookingFilter } },
								],
							},
						},
					},
				],
			}),
		},
		select: {
			id: true,
			name: true,
			phone: true,
			status: true,
			createdAt: true,
			doctor: {
				include: {
					specialties: { select: { id: true, name: true } },
					user: { select: { name: true, username: true } },
				},
			},
			schedule: {
				select: {
					startTime: true,
					endTime: true,
					location: {
						select: {
							id: true,
							name: true,
							address: true,
							city: true,
							zip: true,
							country: true,
						},
					},
				},
			},
		},
		skip,
		take: 10,
		orderBy: { createdAt: 'desc' },
	})
	return { bookings }
}

export async function action({ request }: Route.ActionArgs) {
	await requireUserId(request)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: CancelBookingSchema(null, {
			bookingHasMoreThanSixHours: async (bookingId) => {
				console.log('Validating booking cancellation for ID:', bookingId)
				const booking = await prisma.booking.findUnique({
					where: { id: bookingId },
					select: { schedule: { select: { startTime: true } } },
				})

				console.log('Booking found:', booking)

				if (!booking) {
					return false
				}

				const startTime = new Date(booking.schedule.startTime)
				const now = new Date()
				console.log(
					'isAfter(startTime, now):',
					startTime,
					isAfter(startTime, now),
				)
				console.log(
					'differenceInHours(startTime, now):',
					{ startTime, now },
					differenceInHours(startTime, now) > 6,
				)
				return isAfter(startTime, now) && differenceInHours(startTime, now) > 6
			},
		}),
		async: true,
	})

	console.log('Submission result:', submission)
	if (submission.status !== 'success') {
		return data(
			{ success: false },
			{
				headers: await createToastHeaders({
					description: 'Could not cancel booking. Please try again later.',
					type: 'error',
				}),
			},
		)
	}

	const bookingId = submission.value.bookingId

	await prisma.booking.delete({ where: { id: bookingId } })

	return data(
		{ success: true },
		{
			headers: await createToastHeaders({
				description: 'Booking cancelled successfully.',
				type: 'success',
			}),
		},
	)
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
						A list of your booking history
					</p>
				</div>
				<Button asChild>
					<Link to="/search">
						<Icon name="calendar" className="mr-2 h-4 w-4" />
						New Booking
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>All Bookings</CardTitle>
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
								name="bookingKeyword"
								placeholder="Search bookings..."
								defaultValue={searchParams.get('bookingKeyword') || ''}
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
											ID
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
											Location
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
									{bookings.map((booking) => {
										return (
											<tr
												className="hover:bg-muted/50 border-b transition-colors"
												key={booking.id}
											>
												<td className="p-4 align-middle font-mono text-sm">
													<Link to={`/bookings/${booking.id}`}>
														{booking.id.slice(-8)}
													</Link>
												</td>
												<td className="p-4 align-middle">
													<Link to={`/bookings/${booking.id}`}>
														<div className="flex items-center gap-2">
															<Icon
																name="avatar"
																className="text-muted-foreground h-4 w-4"
															/>
															<div>
																<div className="font-medium">
																	{booking.name}
																</div>
															</div>
														</div>
													</Link>
												</td>
												<td className="p-4 align-middle">
													<Link to={`/bookings/${booking.id}`}>
														<div className="flex items-center gap-2">
															<Icon
																name="phone"
																className="text-muted-foreground h-4 w-4"
															/>
															<span className="text-sm">{booking.phone}</span>
														</div>
													</Link>
												</td>
												<td className="p-4 align-middle">
													<Link to={`/bookings/${booking.id}`}>
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
																	{booking.doctor.specialties.length > 0 ? (
																		<>{booking.doctor.specialties[0]?.name}</>
																	) : null}
																</div>
															</div>
														</div>
													</Link>
												</td>
												<td className="p-4 align-middle">
													<Link to={`/bookings/${booking.id}`}>
														<div className="flex items-center gap-2">
															<Icon
																name="map-pin"
																className="text-muted-foreground h-4 w-4"
															/>
															<div>
																<div className="font-medium">
																	{booking.schedule.location.name}
																</div>
																<div className="text-muted-foreground text-xs">
																	{booking.schedule.location.address},
																	{booking.schedule.location.city}
																</div>
															</div>
														</div>
													</Link>
												</td>
												<td className="p-4 align-middle">
													<Link to={`/bookings/${booking.id}`}>
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
													</Link>
												</td>

												<td className="p-4 align-middle">
													<Link to={`/bookings/${booking.id}`}>
														<Badge
															className={getStatusColor(
																booking.status || 'PENDING',
															)}
														>
															{booking.status}
														</Badge>
													</Link>
												</td>
												<td className="text-muted-foreground p-4 align-middle text-sm">
													<Link to={`/bookings/${booking.id}`}>
														{format(
															new Date(booking.createdAt),
															'MMM dd, yyyy',
														)}
													</Link>
												</td>
												<td className="p-4 text-right align-middle">
													{isStartTimeMoreThanSixHoursAhead(
														booking.schedule.startTime,
													) ? (
														<CancelBookingForm bookingId={booking.id} />
													) : null}
												</td>
											</tr>
										)
									})}
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

			<Spacer size="md" />
		</div>
	)
}

const CancelBookingForm = ({ bookingId }: { bookingId: string }) => {
	const cancelBookingFetcher = useFetcher()

	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, {
				schema: z.object({ bookingId: z.string() }),
			})
		},
		shouldRevalidate: 'onSubmit',
	})

	return (
		<cancelBookingFetcher.Form method="post" {...getFormProps(form)}>
			<Field
				labelProps={{
					children: 'Booking ID',
					className: 'sr-only',
				}}
				className="col-span-4"
				inputProps={{
					...getInputProps(fields.bookingId, {
						type: 'hidden',
					}),
					value: bookingId,
				}}
				errors={fields.bookingId.errors}
			/>
			<StatusButton
				variant="destructive"
				size="sm"
				type="submit"
				status={
					cancelBookingFetcher.state !== 'idle'
						? 'pending'
						: (form.status ?? 'idle')
				}
			>
				Cancel
				<Icon name="trash" className="mr-2 h-4 w-4" />
			</StatusButton>
		</cancelBookingFetcher.Form>
	)
}
