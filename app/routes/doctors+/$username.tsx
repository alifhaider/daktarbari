import {
	getFormProps,
	getInputProps,
	type Intent,
	useForm,
} from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { format } from 'date-fns'
import { Img } from 'openimg/react'
import { useState } from 'react'
import {
	data,
	Link,
	useActionData,
	useFetcher,
	useLoaderData,
} from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getDoctor, getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import {
	getUpcomingSchedules,
	isScheduleHasMoreThanSixHours,
	type TSchedule,
} from '#app/utils/schedule.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$username'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Avatar } from '#app/components/ui/avatar.tsx'

export const meta = ({ data }: Route.MetaArgs) => {
	return [
		{ title: `${data?.user.username} / DB` },
		{
			name: 'description',
			content: `Daktar Bari ${data?.user.username} Profile!`,
		},
	]
}

const ReviewSchema = z.object({
	rating: z
		.number({ message: 'Please provide a rating' })
		.int({ message: 'Rating must be a whole number' })
		.min(1, 'Rating must be between 1 and 5')
		.max(5, 'Rating must be between 1 and 5'),
	doctorId: z.string(),
	userId: z.string(),
	comment: z.string().min(10, 'Comment must be at least 10 characters'),
})

function CreateScheduleDeleteSchema(
	intent: Intent | null,
	options?: {
		doesScheduleHaveBookings: (scheduleId: string) => Promise<boolean>
	},
) {
	return z
		.object({
			scheduleId: z.string(),
		})
		.pipe(
			z
				.object({
					scheduleId: z.string(),
				})
				.superRefine(async (data, ctx) => {
					const isValidatingSchedule =
						intent === null ||
						(intent.type === 'validate' && intent.payload.name === 'scheduleId')
					if (!isValidatingSchedule) {
						ctx.addIssue({
							code: 'custom',
							path: ['form'],
							message: 'Schedule validation process is not properly initiated.',
						})
						return
					}

					if (typeof options?.doesScheduleHaveBookings !== 'function') {
						ctx.addIssue({
							code: 'custom',
							path: ['form'],
							message: 'Booking check  validation function is not provided.',
							fatal: true,
						})
						return
					}

					try {
						// Check if the schedule has bookings
						const hasBookings = await options.doesScheduleHaveBookings(
							data.scheduleId,
						)

						if (hasBookings) {
							ctx.addIssue({
								code: 'custom',
								path: ['scheduleId'],
								message:
									'The schedule cannot be deleted because it has existing bookings.',
							})
						}
					} catch (error) {
						ctx.addIssue({
							code: 'custom',
							path: ['form'],
							message:
								'An error occurred while validating the schedule. Please try again later.' +
								error,
							fatal: true,
						})
					}
				}),
		)
}

const ScheduleDeleteSchema = z.object({
	scheduleId: z.string(),
})

export async function loader({ request, params }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const page = url.searchParams.get('page')
	const user = await prisma.user.findFirst({
		select: {
			id: true,
			name: true,
			email: true,
			username: true,
			createdAt: true,
			image: { select: { id: true, objectKey: true } },
			doctor: {
				include: {
					_count: {
						select: { reviews: true },
					},
					specialties: { select: { id: true, name: true } },
					education: {
						select: {
							id: true,
							degree: true,
							institute: true,
							year: true,
						},
					},
					schedules: {
						include: {
							_count: {
								select: { bookings: true },
							},
							location: {
								select: {
									id: true,
									address: true,
									name: true,
									city: true,
									state: true,
									zip: true,
								},
							},
						},
					},
					reviews: {
						skip: page ? (parseInt(page) - 1) * 5 : 0,
						take: 5,
						select: {
							id: true,
							rating: true,
							comment: true,
							user: {
								select: {
									username: true,
									name: true,
								},
							},
							createdAt: true,
						},
					},
				},
			},
			bookings: {
				include: {
					doctor: {
						select: {
							user: {
								select: {
									username: true,
									name: true,
									image: {
										select: {
											objectKey: true,
										},
									},
								},
							},
						},
					},
					schedule: {
						select: {
							createdAt: true,
							startTime: true,
							endTime: true,
							location: {
								select: {
									name: true,
									address: true,
									city: true,
									state: true,
									zip: true,
								},
							},
							depositAmount: true,
							serialFee: true,
							visitFee: true,
							discountFee: true,
						},
					},
				},
			},
		},
		where: {
			username: params.username,
		},
	})

	invariantResponse(user, 'User not found', { status: 404 })
	const loggedInUserId = await getUserId(request)
	const isLoggedUser = loggedInUserId === user.id
	const isDoctor = !!user.doctor
	const totalReviewsCount = user.doctor?._count?.reviews
	const totalRating = user.doctor?.reviews.reduce(
		(acc, review) => acc + review.rating,
		0,
	)
	const overallRating =
		totalRating && totalReviewsCount
			? Number(totalRating) / totalReviewsCount
			: 0

	return {
		user,
		userJoinedDisplay: user.createdAt.toLocaleDateString(),
		isLoggedUser,
		isDoctor,
		overallRating,
	}
}

export async function action({ request }: Route.ActionArgs) {
	await requireUserId(request)
	const formData = await request.formData()
	const { _action } = Object.fromEntries(formData)

	async function createReview(formData: FormData) {
		const submission = parseWithZod(formData, { schema: ReviewSchema })

		if (submission.status !== 'success') {
			return data(
				{ success: false },
				{
					headers: await createToastHeaders({
						description: 'There was an error creating the review',
						type: 'error',
					}),
				},
			)
		}

		const { doctorId, userId, comment, rating } = submission.value

		await prisma.review.create({
			data: {
				rating,
				comment,
				doctorId,
				userId,
			},
		})

		return data(
			{ success: true },
			{
				headers: await createToastHeaders({
					description: 'Review created successfully',
					type: 'success',
				}),
			},
		)
	}

	async function deleteSchedule(formData: FormData) {
		await getDoctor(request)
		const submission = await parseWithZod(formData, {
			schema: CreateScheduleDeleteSchema(null, {
				doesScheduleHaveBookings: async (scheduleId) => {
					const bookings = await prisma.booking.findMany({
						where: { scheduleId },
					})
					return bookings.length > 0
				},
			}),
			async: true,
		})

		if (submission.status !== 'success') {
			return data(
				{ success: false },
				{
					headers: await createToastHeaders({
						description: 'Schedule has bookings and cannot be deleted',
						type: 'error',
					}),
				},
			)
		}

		const scheduleId = submission.value.scheduleId

		await prisma.schedule.delete({ where: { id: scheduleId } })

		return data(
			{ success: true },
			{
				headers: await createToastHeaders({
					description: 'Schedule deleted successfully',
					type: 'success',
				}),
			},
		)
	}

	async function cancelBooking(formData: FormData) {
		await requireUserId(request)
		const submission = parseWithZod(formData, {
			schema: z.object({
				bookingId: z.string(),
			}),
		})

		if (submission.status !== 'success') {
			return data(
				{ success: false },
				{
					headers: await createToastHeaders({
						description: 'There was an error cancelling the booking',
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
					description: 'Booking cancelled successfully',
					type: 'success',
				}),
			},
		)
	}

	switch (_action) {
		case 'create-review':
			return createReview(formData)
		case 'delete-schedule':
			return deleteSchedule(formData)
		case 'cancel-booking':
			return cancelBooking(formData)
		default:
			return data(
				{ success: false },
				{
					headers: await createToastHeaders({
						description: 'Invalid action',
						type: 'error',
					}),
				},
			)
	}
}

export default function DoctorRoute({ loaderData }: Route.ComponentProps) {
	const { isDoctor, isLoggedUser, user, userJoinedDisplay, overallRating } =
		loaderData
	const [selectedDate, setSelectedDate] = useState<Date | undefined>()
	const schedules = user.doctor?.schedules ?? []

	const scheduleTimes = schedules?.map((schedule) => ({
		id: schedule.id,
		startTime: schedule.startTime,
		endTime: schedule.endTime,
	}))

	function handleDateClick(date: Date | undefined) {
		if (!date) return
		setSelectedDate(date)
	}

	const upcomingDateSchedules = getUpcomingSchedules(schedules)

	const selectedDateSchedules = schedules.filter(
		(schedule) =>
			new Date(schedule.startTime).toDateString() ===
			selectedDate?.toDateString(),
	)

	const displayedSchedules = selectedDate
		? selectedDateSchedules
		: upcomingDateSchedules

	const specialties = user.doctor?.specialties.map(
		(specialty) => specialty.name,
	)
	const highlightedDate = displayedSchedules && displayedSchedules[0]?.startTime
	const userDisplayName = user.name ?? user.username
	return (
		<main className="container">
			<section className="flex-1">
				<Spacer size="3xs" />

				<div className="flex gap-6">
					{user.image ? (
						<Img
							src={getUserImgSrc(user.image?.objectKey)}
							alt={userDisplayName}
							className="h-52 w-52 rounded-full object-cover"
							width={832}
							height={832}
						/>
					) : (
						<div className="h-32 w-32 rounded-sm bg-primary-foreground shadow-sm">
							<Icon name="avatar" className="h-32 w-32 text-primary" />
						</div>
					)}

					<div className="w-full space-y-2">
						<div className="flex items-center justify-between">
							<h2 className="text-3xl font-extrabold md:text-5xl">
								{user.name ?? user.username}
							</h2>

							{isDoctor && isLoggedUser ? (
								<Button asChild variant="outline">
									<Link to="/profile/edit" className="flex items-center gap-2">
										<Icon name="pencil-2" />
										Profile Settings
									</Link>
								</Button>
							) : null}
						</div>
						{!isDoctor ? (
							<>
								<p className="flex items-center gap-2 text-sm text-accent-foreground">
									<Icon name="mail" />
									{user.email}
								</p>
							</>
						) : null}

						{isDoctor ? (
							<>
								<div
									className="text-brand flex items-center gap-2"
									title="specialty"
								>
									<div className="flex items-center rounded-lg border p-1.5">
										<Icon name="stethoscope" />
									</div>
									<ul className="flex items-center gap-4 text-primary">
										{specialties && specialties.length > 0 ? (
											specialties.map((specialty, index) => (
												<>
													<li key={index}>{specialty}</li>
													{index < specialties.length - 1 && (
														<span className="text-accent-foreground">|</span>
													)}
												</>
											))
										) : (
											<li>No specialties</li>
										)}
									</ul>
								</div>
								<div
									className="text-brand flex items-start gap-2"
									title="education"
								>
									<div className="flex items-center rounded-lg border p-1.5">
										<Icon name="graduation-cap" />
									</div>
									<ul className="text-accent-foreground">
										{user.doctor?.education.map((education) => (
											<li key={education.id}>
												{education.degree} | {education.institute}
												<span className="ml-1 text-sm">({education.year})</span>
											</li>
										))}
									</ul>
								</div>
							</>
						) : null}
					</div>
				</div>
				<Spacer size="md" />
				<p>{user.doctor?.bio}</p>
			</section>

			{isDoctor ? (
				<>
					<Spacer size="lg" />
					<section className="grid grid-cols-1 gap-8 lg:grid-cols-5">
						<div className="col-span-1 place-content-center p-0 lg:col-span-2 lg:items-start"></div>
						{/* <Calendar
							className="col-span-1 place-content-center p-0 lg:col-span-2 lg:items-start"
							onDayClick={handleDateClick}
							modifiers={{
								selectedDate: (date) =>
									!!selectedDate &&
									date.getDate() === selectedDate.getDate() &&
									date.getMonth() === selectedDate.getMonth() &&
									date.getFullYear() === selectedDate.getFullYear(),
								schedules: (date) =>
									scheduleTimes.some(
										(schedule) =>
											date.getDate() === schedule.date.getDate() &&
											date.getMonth() === schedule.date.getMonth() &&
											date.getFullYear() === schedule.date.getFullYear(),
									),
							}}
							components={{
								Day: (props: DayProps) => (
									<CustomCell
										scheduleTimes={scheduleTimes}
										highlightedDate={
											highlightedDate ? new Date(highlightedDate) : undefined
										}
										{...props}
									/>
								),
							}}
							formatters={{
								formatCaption: (date: Date) => format(date, 'MMMM yyyy'),
							}}
							mode="single"
						/> */}
						{displayedSchedules && isDoctor ? (
							<Schedules
								schedules={displayedSchedules}
								isOwner={isLoggedUser}
								isDoctor={isDoctor && true}
								username={user.username}
							/>
						) : null}
					</section>
				</>
			) : null}

			{isLoggedUser ? <BookedAppointments /> : null}

			{isDoctor && user.doctor?.userId ? (
				<>
					<Spacer size="lg" />
					<hr className="border-t border-gray-200 dark:border-gray-700" />
					<Spacer size="sm" />
					{/* <Reviews
						reviews={user.doctor?.reviews}
						doctorId={user.doctor?.userId}
						userId={user.id}
						totalReviews={user.doctor?._count?.reviews}
						overallRating={overallRating}
					/> */}
				</>
			) : null}
			<Spacer size="lg" />
		</main>
	)
}

type ScheduleProps = {
	schedules: TSchedule[]
	isDoctor: boolean
	isOwner: boolean
	username: string
}

const Schedules = ({
	schedules,
	isDoctor,
	isOwner,
	username,
}: ScheduleProps) => {
	return (
		<div className="col-span-1 lg:col-span-3">
			{schedules && schedules?.length > 0 && (
				<div className="relative flex items-center">
					<span className="h-0.5 w-full border"></span>
					<h5 className="mx-1 text-nowrap text-4xl font-bold text-secondary-foreground">
						{format(schedules[0]?.startTime ?? new Date(), 'dd MMMM, yyyy')}
					</h5>
					<span className="h-0.5 w-full border"></span>
				</div>
			)}
			<Spacer size="sm" />

			{schedules && schedules?.length === 0 ? (
				<p className="text-lg text-accent-foreground">No available schedules</p>
			) : null}

			<ul className="max-h-[40rem] space-y-4 overflow-y-auto">
				{schedules?.map((schedule) => (
					<ScheduleItem
						key={schedule.id}
						schedule={schedule}
						isDoctor={isDoctor}
						isOwner={isOwner}
						username={username}
					/>
				))}
			</ul>
			{isDoctor && isOwner ? (
				<div className="flex items-center">
					<Button asChild variant="default" className="mt-6">
						<Link to="/add/schedule">Create a new schedule plan</Link>
					</Button>
				</div>
			) : null}
		</div>
	)
}

const ScheduleItem = ({
	schedule,
	isOwner,
	isDoctor,
	username,
}: {
	schedule: TSchedule
	isOwner: boolean
	isDoctor: boolean
	username: string
}) => {
	const deleteFetcher = useFetcher()
	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, {
				schema: z.object({ scheduleId: z.string() }),
			})
		},
		shouldRevalidate: 'onSubmit',
	})
	const isDeleting = deleteFetcher.formData?.get('scheduleId') === schedule.id
	return (
		<li
			hidden={isDeleting}
			className="flex items-center rounded-md border transition-all"
		>
			<div className="h-full w-full px-4 py-6">
				<div className="flex items-center justify-between">
					<div className="flex items-start gap-2">
						<Icon name="map" className="h-8 w-8" />
						<div>
							<h6 className="flex items-end text-2xl font-bold leading-none">
								{schedule.location.name}
								<span className="text-xs font-normal">
									/{format(schedule.startTime, 'hh:mm a')} -{' '}
									{format(schedule.endTime, 'hh:mm a')}
								</span>
							</h6>
							<div className="mt-2 text-sm text-accent-foreground">
								{schedule.location.address}, {schedule.location.city},{' '}
								{schedule.location.state}, {schedule.location.zip}
							</div>
							<div className="mt-4">
								{!isOwner && (
									<Link
										to={`/profile/${username}/schedule/${schedule.id}`}
										className="flex w-max items-start rounded-md bg-amber-300 px-2 py-1 text-secondary"
									>
										Book Now
									</Link>
								)}
								{isOwner && isDoctor && (
									<div className="space-y-2">
										<div className="flex gap-2 text-sm">
											<button className="flex w-max items-start rounded-md border border-secondary-foreground bg-secondary px-2 py-1 text-secondary-foreground">
												<Link to={`/edit/schedule/${schedule.id}`}>
													Edit Schedule
												</Link>
											</button>
											<deleteFetcher.Form method="POST" {...getFormProps(form)}>
												<input
													{...getInputProps(fields.scheduleId, {
														type: 'hidden',
													})}
													value={schedule.id}
												/>
												<ErrorList errors={fields.scheduleId.errors} />
												<button
													name="_action"
													value="delete-schedule"
													type="submit"
													className="flex w-max items-start rounded-md border border-destructive bg-destructive px-2 py-1 text-destructive-foreground transition-all"
												>
													Remove Schedule
												</button>
											</deleteFetcher.Form>
										</div>
										<ErrorList errors={form.errors} />

										<p>Bookings: {schedule._count?.bookings}</p>
									</div>
								)}
							</div>
						</div>
					</div>
					<div>
						<div className="font-bold text-accent-foreground">
							Visit Fee: {schedule.visitFee}tk
						</div>
						<div className="text-secondary-foreground">
							Serial Fee: {schedule.serialFee}tk
						</div>
						<div className="text-sm text-secondary-foreground">
							Discount: {schedule.discountFee}tk
						</div>
					</div>
				</div>
			</div>
		</li>
	)
}

const BookedAppointments = () => {
	const { user } = useLoaderData<typeof loader>()
	const bookings = user.bookings
	const getAmount = (fee: number | null) => Number(fee) || 0
	function totalCost(
		serialFee: number | null,
		visitFee: number | null,
		discountFee: number | null,
	) {
		return (
			getAmount(serialFee) + getAmount(visitFee) + getAmount(discountFee) || 0
		)
	}

	return (
		<section className="mx-auto w-full">
			<Spacer size="lg" />
			<h2>Booked Appointments</h2>

			<Spacer size="sm" />

			{bookings.length === 0 ? (
				<p className="text-lg text-accent-foreground">
					Looks like you haven&apos;t booked any appointments yet.{' '}
					<Link
						to="/search"
						className="text-brand text-center text-lg underline"
					>
						Book now!
					</Link>
				</p>
			) : null}

			<div className="space-y-8">
				{bookings.map((booking) => {
					const isInThePast =
						new Date(booking.schedule.startTime) < new Date() &&
						new Date(booking.schedule.endTime) < new Date()
					return (
						<div key={booking.id} className="relative">
							<Card>
								<CardHeader className="flex flex-row items-center gap-4">
									<Avatar className="h-16 w-16 border">
										{booking.doctor.user.image ? (
											<Img
												src={getUserImgSrc(booking.doctor.user.image.objectKey)}
												alt={
													booking.doctor.user.name ||
													booking.doctor.user.username
												}
												className="h-16 w-16 rounded-full"
												width={256}
												height={256}
											/>
										) : (
											<Icon name="avatar" className="h-16 w-16" />
										)}
									</Avatar>
									<div className="flex-1">
										<Link
											to={`/profile/${booking.doctor.user.username}`}
											className="hover:text-cyan-400 hover:underline"
										>
											<CardTitle>
												{booking.doctor.user.name ||
													booking.doctor.user.username}
											</CardTitle>
										</Link>
										<p className="text-sm text-muted-foreground">
											Appointment on{' '}
											{format(
												new Date(booking.schedule.startTime),
												'MMMM d, yyyy',
											)}
										</p>
									</div>
									{isInThePast ? (
										<Button asChild variant="outline">
											<Link
												to={`/profile/${booking.doctor.user.username}`}
												className="flex w-max items-center gap-2 text-sm text-accent-foreground"
											>
												Leave a Review
											</Link>
										</Button>
									) : null}
									{!isInThePast &&
									!isScheduleHasMoreThanSixHours(booking.schedule) ? (
										<CancelBookingButton bookingId={booking.id} />
									) : null}
								</CardHeader>
								<CardContent>
									<div className="grid gap-4">
										<div className="flex items-center gap-2">
											<Icon
												name="calendar"
												className="h-4 w-4 text-muted-foreground"
											/>
											<span>
												<strong>Schedule Date: </strong>
												{format(
													new Date(booking.schedule.startTime),
													'EEEE, MMMM d, yyyy',
												)}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Icon
												name="clock"
												className="h-4 w-4 text-muted-foreground"
											/>
											<span>
												<strong>Schedule Time: </strong>
												{format(booking.schedule.startTime, 'hh:mm a')}
												{' - '}
												{format(booking.schedule.endTime, 'hh:mm a')}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Icon
												name="map"
												className="h-4 w-4 text-muted-foreground"
											/>
											<span>
												<strong>Location: </strong>
												{booking.schedule.location.name},{' '}
												{booking.schedule.location.address},{' '}
												{booking.schedule.location.city},{' '}
												{booking.schedule.location.state}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Icon
												name="money"
												className="h-4 w-4 text-muted-foreground"
											/>
											<span>
												<strong>Total Cost: </strong>
												{totalCost(
													booking.schedule.serialFee,
													booking.schedule.visitFee,
													booking.schedule.discountFee,
												)}
												tk
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Icon
												name="dollar-sign"
												className="h-4 w-4 text-muted-foreground"
											/>
											<span>
												<strong>Paid Amount: </strong>
												{booking.schedule.depositAmount || 0}tk tk
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Icon
												name="avatar"
												className="h-4 w-4 text-muted-foreground"
											/>
											<span>
												Booked on{' '}
												<strong className="underline">
													{format(
														new Date(booking.schedule.createdAt),
														'MMMM d, yyyy',
													)}
												</strong>
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					)
				})}
			</div>
		</section>
	)
}

function CancelBookingButton({ bookingId }: { bookingId: string }) {
	const deleteFetcher = useFetcher()
	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, {
				schema: z.object({ bookingId: z.string() }),
			})
		},
		shouldRevalidate: 'onSubmit',
	})

	return (
		<deleteFetcher.Form method="POST" {...getFormProps(form)}>
			<input
				{...getInputProps(fields.bookingId, { type: 'hidden' })}
				value={bookingId}
			/>
			<button
				name="_action"
				value="cancel-booking"
				type="submit"
				className="flex w-max items-start rounded-md border border-destructive bg-destructive px-2 py-1 text-destructive-foreground transition-all"
			>
				Cancel Booking
			</button>
		</deleteFetcher.Form>
	)
}
