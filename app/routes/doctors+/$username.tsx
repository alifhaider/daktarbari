import {
	getFormProps,
	getInputProps,
	type Intent,
	useForm,
} from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { format, isPast } from 'date-fns'
import { Img } from 'openimg/react'
import React, { useEffect, useRef, useState } from 'react'
import { type DayProps } from 'react-day-picker'
import { data, Form, Link, useFetcher, useNavigation } from 'react-router'
import { z } from 'zod'
import { ErrorList, TextareaField } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Avatar } from '#app/components/ui/avatar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Calendar, CustomCell } from '#app/components/ui/calendar.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { getDoctor, getUserId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import {
	getUpcomingSchedules,
	isStartTimeMoreThanSixHoursAhead,
} from '#app/utils/schedule.ts'
import { createToastHeaders } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$username'

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

export const SelectedDateContext = React.createContext<{
	selected?: Date
	setSelected?: React.Dispatch<React.SetStateAction<Date | undefined>>
}>({})

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
					_count: { select: { reviews: true } },
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
							_count: { select: { bookings: true } },
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
							user: { select: { username: true, name: true } },
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
									image: { select: { objectKey: true } },
								},
							},
						},
					},
					schedule: {
						select: {
							createdAt: true,
							startTime: true,
							endTime: true,
							maxAppointments: true,
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
		where: { username: params.username },
	})

	invariantResponse(user, 'User not found', { status: 404 })
	const loggedInUserId = await getUserId(request)
	const isOwner = loggedInUserId === user.id
	const isDoctor = !!user.doctor
	const totalReviewsCount = user.doctor?._count?.reviews
	const totalRating = user.doctor?.reviews.reduce(
		(acc, review) => acc + review.rating,
		0,
	)
	const overallRating =
		totalReviewsCount && totalRating && totalReviewsCount > 0
			? Math.round((totalRating / totalReviewsCount) * 10) / 10
			: 0

	return {
		user,
		userJoinedDisplay: user.createdAt.toLocaleDateString(),
		isOwner,
		loggedInUserId,
		isDoctor,
		schedules: user.doctor?.schedules ?? [],
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
				{ success: false, result: submission.reply() },
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
			{ success: true, result: submission.reply() },
			{
				headers: await createToastHeaders({
					description: 'Thanks for sharing your feedback!',
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
				{ success: false, result: submission.reply() },
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
			{ success: true, result: submission.reply() },
			{
				headers: await createToastHeaders({
					description: 'Your schedule is no longer available',
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
				{ success: false, result: submission.reply() },
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
			{ success: true, result: submission.reply() },
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
				{ success: false, result: {} },
				{
					headers: await createToastHeaders({
						description: 'Invalid action',
						type: 'error',
					}),
				},
			)
	}
}

export default function DoctorRoute({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const {
		isDoctor,
		isOwner,
		user,
		userJoinedDisplay,
		overallRating,
		schedules,
	} = loaderData
	const [selectedDate, setSelectedDate] = useState<Date | undefined>()

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
						<div className="bg-primary-foreground h-32 w-32 rounded-sm shadow-xs">
							<Icon name="avatar" className="text-primary h-32 w-32" />
						</div>
					)}

					<div className="w-full space-y-2">
						<div className="flex items-center justify-between">
							<h2 className="text-3xl font-extrabold md:text-5xl">
								{user.name ?? user.username}
							</h2>

							{isDoctor && isOwner ? (
								<Button asChild variant="outline">
									<Link
										to="/settings/profile"
										className="flex items-center gap-2"
									>
										<Icon name="pencil-2" />
										Profile Settings
									</Link>
								</Button>
							) : null}
						</div>
						{!isDoctor ? (
							<p className="text-accent-foreground flex items-center gap-2 text-sm">
								<Icon name="mail" />
								{user.email}
							</p>
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
									<ul className="text-primary flex items-center gap-4">
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
						<h2 className="col-span-1 text-3xl font-bold lg:col-span-5">
							{isOwner ? 'Your Schedules' : "Doctor's Schedules"}
						</h2>
						<div className="col-span-1 place-content-center p-0 lg:col-span-2 lg:items-start">
							<SelectedDateContext.Provider
								value={{ selected: selectedDate, setSelected: setSelectedDate }}
							>
								<Calendar
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
													date.getDate() === schedule.startTime.getDate() &&
													date.getMonth() === schedule.startTime.getMonth() &&
													date.getFullYear() ===
														schedule.startTime.getFullYear(),
											),
									}}
									components={{
										Day: (props: DayProps) => (
											<CustomCell
												scheduleTimes={scheduleTimes}
												highlightedDate={
													highlightedDate
														? new Date(highlightedDate)
														: undefined
												}
												{...props}
											/>
										),
									}}
									formatters={{
										formatCaption: (date: Date) => format(date, 'MMMM yyyy'),
									}}
									mode="single"
								/>
							</SelectedDateContext.Provider>
						</div>
						{displayedSchedules && isDoctor ? (
							<Schedules
								schedules={displayedSchedules}
								isOwner={isOwner}
								username={user.username}
							/>
						) : null}
					</section>
				</>
			) : null}

			{isOwner ? (
				<BookedAppointments actionData={actionData} loaderData={loaderData} />
			) : null}

			{isDoctor ? (
				<>
					<Spacer size="lg" />
					<hr className="border-t border-gray-200 dark:border-gray-700" />
					<Spacer size="sm" />
					<Reviews
						reviews={user.doctor?.reviews}
						doctorId={user.id}
						actionData={actionData}
						userId={loaderData.loggedInUserId}
						totalReviews={user.doctor?._count?.reviews}
						overallRating={overallRating}
					/>
				</>
			) : null}
			<Spacer size="lg" />
		</main>
	)
}

type ScheduleProps = {
	schedules: Route.ComponentProps['loaderData']['schedules']
	isOwner: boolean
	username: string
	actionData?: Route.ComponentProps['actionData']
}

const Schedules = ({
	schedules,
	isOwner,
	username,
	actionData,
}: ScheduleProps) => {
	const scheduleDate = format(
		schedules[0]?.startTime ?? new Date(),
		'dd MMMM, yyyy',
	)
	return (
		<div className="col-span-1 lg:col-span-3">
			{schedules && schedules?.length > 0 && (
				<div className="relative flex items-center">
					<span className="h-0.5 w-full border"></span>
					<h5 className="text-secondary-foreground mx-1 text-4xl font-bold text-nowrap">
						{scheduleDate}
					</h5>
					<span className="h-0.5 w-full border"></span>
				</div>
			)}
			<CardDescription>
				{schedules.length} schedule(s) active on {scheduleDate}
			</CardDescription>
			<Spacer size="3xs" />

			{schedules && schedules?.length === 0 ? (
				<p className="text-accent-foreground text-lg">No available schedules</p>
			) : null}

			<ul className="max-h-[40rem] space-y-8 overflow-y-auto">
				{schedules?.map((schedule) => (
					<ScheduleItem
						key={schedule.id}
						actionData={actionData}
						schedule={schedule}
						isOwner={isOwner}
						username={username}
					/>
				))}
			</ul>
			{isOwner ? (
				<div className="flex items-center">
					<Button asChild size="default" className="mt-6">
						<Link to="/schedules/add">Create a new schedule plan</Link>
					</Button>
				</div>
			) : null}
		</div>
	)
}

const ScheduleItem = ({
	schedule,
	isOwner,
	actionData,
}: {
	actionData: Route.ComponentProps['actionData']
	schedule: Route.ComponentProps['loaderData']['schedules'][number]
	isOwner: boolean
	username: string
}) => {
	const deleteFetcher = useFetcher()
	const [form, fields] = useForm({
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, {
				schema: z.object({ scheduleId: z.string() }),
			})
		},
		shouldRevalidate: 'onSubmit',
	})
	const isDeleting = deleteFetcher.formData?.get('scheduleId') === schedule.id

	const getTimeOfDay = (timeString: Date) => {
		const hour = new Date(timeString).getHours()
		if (hour < 12) return 'Morning'
		if (hour < 17) return 'Afternoon'
		return 'Evening'
	}

	const getTimeOfDayStyles = (timeOfDay: string) => {
		switch (timeOfDay) {
			case 'Morning':
				return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900'
			case 'Afternoon':
				return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900'
			case 'Evening':
				return 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900'
			default:
				return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
		}
	}

	const timeOfDayStyles = getTimeOfDayStyles(getTimeOfDay(schedule.startTime))
	const timeOfDay = getTimeOfDay(schedule.startTime)

	const totalFee =
		(schedule.serialFee ?? 0) +
		(schedule.visitFee ?? 0) -
		(schedule.discountFee ?? 0)

	const availabilityPercentage =
		100 - (schedule._count.bookings / schedule.maxAppointments) * 100

	console.log('availabilityPercentage', availabilityPercentage)

	return (
		<li
			hidden={isDeleting}
			className="overflow-hidden rounded-sm border shadow-md transition-all hover:shadow-lg"
		>
			<div className="bg-accent/50 dark:bg-accent/20 flex items-start justify-between border-b p-3">
				<div>
					<h3 className="text-primary font-semibold">
						{schedule.location.name}
					</h3>
					<div className="text-muted-foreground mt-0.5 flex items-center text-xs">
						<Icon name="map-pin" className="mr-1 h-3 w-3" />
						{schedule.location.address}
					</div>
				</div>

				<div className="flex flex-col items-end gap-1">
					<Badge
						variant="outline"
						className={`px-2 py-0.5 text-xs font-medium ${timeOfDayStyles}`}
					>
						{timeOfDay}
					</Badge>
					<Badge
						variant="outline"
						className="bg-primary/10 text-primary dark:bg-primary/20"
					>
						{schedule._count.bookings}/{schedule.maxAppointments}
					</Badge>
				</div>
			</div>

			<div className="bg-muted/50 dark:bg-muted/20 flex items-center border-b p-3">
				<Icon name="clock" className="text-muted-foreground mr-2 h-3.5 w-3.5" />
				<div className="text-sm font-medium">
					{format(schedule.startTime, 'hh:mm a')} -{' '}
					{format(schedule.endTime, 'hh:mm a')}
				</div>
			</div>

			<div className="p-3">
				<div className="flex flex-wrap gap-2 text-sm">
					<div className="min-w-[180px] flex-1">
						<div className="mb-1 flex items-center justify-between">
							<span className="text-muted-foreground text-xs">Date:</span>
							<span className="text-xs font-medium">
								{format(schedule.startTime, 'dd MMMM, yyyy')}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-xs">
								Availability:
							</span>
							<div className="flex items-center gap-1">
								<div className="bg-muted h-1.5 w-16 rounded-full">
									<div
										className={`h-1.5 rounded-full ${availabilityPercentage < 50 ? 'bg-red-500' : 'bg-green-500'}`}
										style={{
											width: `${availabilityPercentage}%`,
										}}
									></div>
								</div>
								<span className="text-xs font-medium">
									{schedule.maxAppointments - schedule._count.bookings} left
								</span>
							</div>
						</div>
					</div>

					{/* Compact fee section */}
					<div className="flex min-w-[180px] flex-1 gap-2">
						<div className="grid w-full grid-cols-2 gap-2">
							<div className="bg-muted/50 dark:bg-muted/20 rounded border p-1.5 text-center">
								<p className="text-muted-foreground text-[10px]">Serial</p>
								<p className="font-bold">{schedule.serialFee} tk</p>
							</div>
							<div className="bg-muted/50 dark:bg-muted/20 rounded border p-1.5 text-center">
								<p className="text-muted-foreground text-[10px]">Visit</p>
								<p className="font-bold">{schedule.visitFee} tk</p>
							</div>
						</div>
						<div className="grid w-full grid-cols-2 gap-2">
							<div className="bg-muted/50 dark:bg-muted/20 rounded border p-1.5 text-center">
								<p className="text-muted-foreground text-[10px]">Discount</p>
								<p className="font-bold">{schedule.discountFee} tk</p>
							</div>
							<div className="bg-muted/50 dark:bg-muted/20 rounded border p-1.5 text-center">
								<p className="text-muted-foreground text-[10px]">total</p>
								<p className="font-bold">{totalFee} tk</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-muted/50 dark:bg-muted/20 border-t p-2">
				{isOwner ? (
					<div className="space-y-2">
						<div className="flex w-full gap-2">
							<Button asChild variant="outline" size="sm" className="flex-1">
								<Link to={`/edit/schedule/${schedule.id}`}>
									<Icon name="pencil-2" className="mr-1 h-3 w-3" />
									Edit
								</Link>
							</Button>
							<deleteFetcher.Form
								method="POST"
								{...getFormProps(form)}
								className="flex-1"
							>
								<input
									{...getInputProps(fields.scheduleId, {
										type: 'hidden',
									})}
									value={schedule.id}
								/>
								<ErrorList errors={fields.scheduleId.errors} />
								<Button
									name="_action"
									value="delete-schedule"
									variant="destructive"
									size="sm"
									type="submit"
									className="w-full flex-1"
								>
									<Icon name="trash" className="mr-1 h-3 w-3" />
									Remove
								</Button>
							</deleteFetcher.Form>
						</div>
						<ErrorList errors={form.errors} />
					</div>
				) : (
					<>
						{schedule._count.bookings >= schedule.maxAppointments ? (
							<Button
								disabled
								variant="outline"
								size="sm"
								className="bg-accent/50 text-accent-foreground w-full"
							>
								<Icon name="calendar-check" className="mr-1 h-3 w-3" />
								Booked Out
							</Button>
						) : (
							<Button
								asChild
								size="sm"
								className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
							>
								<Link
									to={`/schedules/${schedule.id}`}
									className={`${schedule._count.bookings >= schedule.maxAppointments ? 'pointer-events-none cursor-not-allowed' : null}`}
								>
									<Icon name="calendar-check" className="mr-1 h-3 w-3" />
									Book Now
								</Link>
							</Button>
						)}
					</>
				)}
			</div>
		</li>
	)
}

const BookedAppointments = ({
	actionData,
	loaderData,
}: {
	actionData: Route.ComponentProps['actionData']
	loaderData: Route.ComponentProps['loaderData']
}) => {
	const bookings = loaderData.user.bookings
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
			<Spacer size="md" />
			<h2 className="text-2xl font-bold">Your Appointments</h2>
			<Spacer size="4xs" />
			<hr />
			<Spacer size="4xs" />

			{bookings.length === 0 ? (
				<p className="text-accent-foreground text-lg">
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
					const isInThePast = isPast(new Date(booking.schedule.startTime))
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
										<p className="text-muted-foreground text-sm">
											Appointment on{' '}
											<strong>
												{format(
													new Date(booking.schedule.startTime),
													'MMMM d, yyyy',
												)}
											</strong>
										</p>
									</div>
									{isInThePast ? (
										<Button asChild variant="outline">
											<Link
												reloadDocument
												to={`/doctors/${booking.doctor.user.username}#write-review`}
												className="text-accent-foreground flex w-max items-center gap-2 text-sm"
											>
												Leave a Review
											</Link>
										</Button>
									) : null}
									{!isInThePast &&
									!isStartTimeMoreThanSixHoursAhead(
										booking.schedule.startTime,
									) ? (
										<CancelBookingButton
											bookingId={booking.id}
											actionData={actionData}
										/>
									) : null}
								</CardHeader>
								<CardContent>
									<div className="grid gap-2 text-sm">
										<div className="flex items-center gap-2">
											<Icon
												name="clock"
												className="text-muted-foreground h-4 w-4"
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
												className="text-muted-foreground h-4 w-4"
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
												name="dollar-sign"
												className="text-muted-foreground h-4 w-4"
											/>
											<span>
												Paid Amount:{' '}
												<strong>
													{booking.schedule.depositAmount || 0}tk of{' '}
													{totalCost(
														booking.schedule.serialFee,
														booking.schedule.visitFee,
														booking.schedule.discountFee,
													)}
													tk
												</strong>
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Icon
												name="avatar"
												className="text-muted-foreground h-4 w-4"
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

function CancelBookingButton({
	bookingId,
	actionData,
}: {
	bookingId: string
	actionData: Route.ComponentProps['actionData']
}) {
	const deleteFetcher = useFetcher()
	const [form, fields] = useForm({
		lastResult: actionData?.result,
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
				className="border-destructive bg-destructive text-destructive-foreground flex w-max items-start rounded-md border px-2 py-1 transition-all"
			>
				Cancel Booking
			</button>
		</deleteFetcher.Form>
	)
}

type ReviewProps = {
	doctorId: string
	userId: string | null
	totalReviews: number | undefined
	overallRating: number
	actionData: Route.ComponentProps['actionData']
	reviews:
		| {
				user: {
					username: string
					name: string | null
				}
				id: string
				createdAt: Date
				rating: number
				comment: string
		  }[]
		| undefined
}

const Reviews = ({
	reviews,
	doctorId,
	userId,
	totalReviews,
	actionData,
	overallRating,
}: ReviewProps) => {
	const $form = useRef<HTMLFormElement>(null)
	let navigation = useNavigation()
	const [form, fields] = useForm({
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ReviewSchema })
		},
		shouldRevalidate: 'onSubmit',
	})

	useEffect(
		function resetFormOnSuccess() {
			if (navigation.state === 'idle' && actionData?.success) {
				$form.current?.reset()
			}
		},
		[navigation.state, actionData],
	)

	if (!reviews) return null

	return (
		<section>
			<h4 className="text-sm font-extrabold">RATINGS AND REVIEWS</h4>

			<div>
				<p className="flex items-center gap-2 text-6xl font-extrabold">
					{overallRating || 0}
					<span>
						<Icon name="star" className="h-6 w-6 fill-cyan-400 text-cyan-400" />
					</span>
				</p>

				<p className="mt-1 text-sm">
					&#40;
					{totalReviews} {Number(totalReviews) > 1 ? 'Ratings' : 'Rating'}&#41;
				</p>
			</div>

			<Spacer size="xs" />

			<h6 className="text-secondary-foreground text-sm font-extrabold uppercase">
				Reviews from patients
			</h6>
			<Spacer size="3xs" />
			{reviews.length === 0 ? (
				<p className="text-accent-foreground text-sm">
					No reviews yet. Be the first to share your experience!
				</p>
			) : null}
			<ul className="max-w-4xl py-2">
				{reviews.map((review) => (
					<li
						key={review.id}
						className="flex items-start gap-4 border-b py-6 first:pt-0"
					>
						<div className="flex-1 space-y-4">
							<div className="flex gap-2">
								{Array.from({ length: 5 }, (_, i) => (
									<span key={i}>
										<Icon
											name="star"
											className={`h-5 w-5 text-gray-300 ${review.rating > i ? 'fill-cyan-400 text-cyan-400' : ''}`}
										/>
									</span>
								))}
							</div>
							<p className="font-montserrat text-secondary-foreground text-xs font-semibold">
								{review.user.name || review.user.username}
								<span className="text-muted-foreground ml-2 text-[11px] font-medium">
									{format(review.createdAt, 'MMMM d, yyyy')}
								</span>
							</p>

							<p className="text-secondary-foreground text-sm">
								{review.comment}
							</p>
						</div>
					</li>
				))}
			</ul>

			<Spacer size="md" />
			<div className="flex max-w-4xl items-center justify-center">
				<Button asChild size="default">
					<Link to="/reviews">See More</Link>
				</Button>
			</div>

			<Spacer size="md" />
			<h6 className="text-secondary-foreground text-lg font-extrabold uppercase">
				Write a Review
			</h6>
			<Spacer size="3xs" />
			{!userId ? (
				<p className="text-secondary-foreground text-sm">
					Please{' '}
					<Link to="/login" className="text-brand underline">
						Login
					</Link>{' '}
					to write a review.
				</p>
			) : (
				<section id="write-review">
					<Form method="post" {...getFormProps(form)} ref={$form}>
						<input
							{...getInputProps(fields.doctorId, { type: 'hidden' })}
							value={doctorId}
						/>
						<input
							{...getInputProps(fields.userId, { type: 'hidden' })}
							value={userId || ''} // Ensure userId is a string, even if null
						/>
						<Label htmlFor={fields.rating.id} className="text-sm font-semibold">
							Rating
						</Label>
						<div className="flex gap-2">
							{[1, 2, 3, 4, 5].map((star) => (
								<label key={star} className="cursor-pointer">
									<input
										{...getInputProps(fields.rating, { type: 'radio' })}
										value={star}
										className="peer sr-only"
									/>
									<Icon
										name="star"
										className={`h-8 w-8 ${star <= Number(fields.rating.value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'} transition-colors duration-150`}
									/>
								</label>
							))}
						</div>
						<ErrorList errors={fields.rating.errors} />
						<Spacer size="3xs" />

						<TextareaField
							labelProps={{ htmlFor: fields.comment.id, children: 'Comment' }}
							textareaProps={{
								...getInputProps(fields.comment, { type: 'text' }),
								autoComplete: 'off',
								rows: 4,
							}}
							errors={fields.comment.errors}
						/>
						<Button type="submit" name="_action" value="create-review">
							Submit
						</Button>
					</Form>
					<ErrorList errors={form.errors} />
				</section>
			)}
		</section>
	)
}
