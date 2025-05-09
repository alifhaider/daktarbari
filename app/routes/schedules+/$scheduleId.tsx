import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { format } from 'date-fns'
import { data, Form, Link, type MetaFunction } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Field, TextareaField } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$scheduleId'

const BookingFormSchema = z.object({
	doctorId: z.string({ message: 'Doctor ID is required' }),
	userId: z.string({ message: 'User ID is required' }),
	username: z.string({ message: 'Username is required' }),
	scheduleId: z.string({ message: 'Schedule ID is required' }),
	name: z.string({ message: 'Name is required' }),
	phone: z.string({ message: 'Phone is required' }),
	note: z.string().optional(),
})

export const meta: MetaFunction = () => {
	return [
		{ title: 'Book / CH' },
		{ name: 'description', content: 'Book appointment from CareHub' },
	]
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const scheduleId = params.scheduleId
	invariant(scheduleId, 'Schedule ID is required')
	const schedule = await prisma.schedule.findUnique({
		where: { id: scheduleId },
		include: {
			doctor: {
				include: {
					user: { select: { id: true, username: true, name: true } },

					_count: { select: { bookings: true } },
				},
			},
		},
	})

	const canBeBooked =
		schedule && schedule.maxAppointments > schedule.doctor._count.bookings
	return { schedule, userId, canBeBooked } as const
}

export async function action({ request }: Route.ActionArgs) {
	await requireUserId(request)
	const formData = await request.formData()
	const submission = parseWithZod(formData, {
		schema: BookingFormSchema,
	})

	if (submission.status !== 'success') {
		return data(
			submission.reply({ formErrors: ['Could not complete booking'] }),
		)
	}

	// TODO: Send a confirmation email

	const { doctorId, userId, scheduleId, phone, note, username } =
		submission.value

	await prisma.booking.create({
		data: {
			doctorId,
			userId,
			scheduleId,
			phone,
			note,
		},
	})

	return redirectWithToast(safeRedirect(`/doctors/${username}`), {
		title: 'Congratulations! Doctor Appointment Scheduled Successfully.',
		description: 'You will receive a confirmation email shortly.',
	})
}

export default function Booking({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { schedule, userId, canBeBooked } = loaderData

	const [form, fields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: BookingFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})
	if (!schedule) return <p>Schedule not found</p>

	if (!canBeBooked) {
		return (
			<div className="container">
				<Spacer size="lg" />
				<Card className="mx-auto w-full max-w-2xl">
					<CardHeader>
						<CardTitle className="text-2xl font-bold">
							Schedule Not Available
						</CardTitle>
						<CardDescription>
							This schedule is no longer available for booking.
						</CardDescription>
						<Button asChild variant="outline" className="mt-4">
							<Link to=".." className="text-cyan-500 underline">
								Go Back
							</Link>
						</Button>
					</CardHeader>
				</Card>
				<Spacer size="lg" />
			</div>
		)
	}

	const scheduleStartTime = format(schedule.startTime, 'hh:mm a')
	const scheduleEndTime = format(schedule.endTime, 'hh:mm a')

	const doctorName = schedule.doctor.user.name ?? schedule.doctor.user.username

	// Monday, June 12, 2023
	const formattedDate = format(
		new Date(schedule.startTime),
		'EEEE, MMMM d, yyyy',
	)

	const totalCost =
		(schedule.visitFee ?? 0) +
		(schedule.serialFee ?? 0) -
		(schedule.discountFee ?? 0)
	const remainingAmount = Math.abs(totalCost - (schedule.depositAmount ?? 0))

	return (
		<div className="container">
			<Spacer size="xs" />
			<Card className="mx-auto w-full max-w-2xl">
				<Form method="POST" {...getFormProps(form)}>
					<CardHeader>
						<CardTitle className="text-2xl font-bold">
							Book Your Appointment
						</CardTitle>
						<CardDescription>
							Complete the form below to book your appointment with{' '}
							<Link
								rel="noreferrer"
								target="_blank"
								className="text-cyan-500 underline"
								to={`/profile/${schedule.doctor.user.username}`}
							>
								{doctorName}
							</Link>
							.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="bg-primary/5 mb-6 rounded-lg p-4">
							<div className="mb-2 flex items-center">
								<Icon name="avatar" className="text-primary mr-2 h-5 w-5" />
								<span className="font-semibold">{doctorName}</span>
							</div>
							<div className="mb-2 flex items-center">
								<Icon name="calendar" className="text-primary mr-2 h-5 w-5" />
								<span>{formattedDate}</span>
							</div>
							<div className="flex items-center">
								<Icon name="clock" className="text-primary mr-2 h-5 w-5" />
								<span>
									{scheduleStartTime} - {scheduleEndTime}
								</span>
							</div>
						</div>

						{/* Cost Breakdown Section */}
						<div className="bg-secondary/10 mb-6 rounded-lg p-4">
							<h3 className="mb-3 flex items-center text-lg font-semibold">
								<Icon name="coins" className="text-primary mr-2 h-5 w-5" />
								Cost Breakdown
							</h3>
							<div className="space-y-2">
								<div className="flex justify-between">
									<span>Visit Fee:</span>
									<span>{schedule.visitFee?.toFixed(2)} tk</span>
								</div>
								<div className="flex justify-between">
									<span>Serial Fee:</span>
									<span>{schedule.serialFee?.toFixed(2)} tk</span>
								</div>
								<div className="flex justify-between text-green-600">
									<span>Discount:</span>
									<span>-{schedule.discountFee?.toFixed(2)} tk</span>
								</div>
								<div className="text-brand flex justify-between border-t pt-2 font-semibold">
									<span>Total:</span>
									<span>{totalCost.toFixed(2)} tk</span>
								</div>
								<div className="text-primary flex justify-between border-t pt-2">
									<span>Deposit:</span>
									<span className="flex items-center gap-1">
										{' '}
										{schedule.depositAmount?.toFixed(2)} tk
									</span>
								</div>
								<div className="text-primary flex justify-between border-t pt-2">
									<span>Remaining:</span>
									<span className="flex items-center gap-1">
										{' '}
										{remainingAmount.toFixed(2)} tk
									</span>
								</div>
							</div>
						</div>

						<hr />
						<div className="space-y-4">
							<p className="py-2 text-sm">
								Please, add{' '}
								<strong className="underline">
									your or the patient&apos;s
								</strong>{' '}
								information below:
							</p>

							{/* BOOKING FORM */}
							<input
								{...getInputProps(fields.username, { type: 'hidden' })}
								value={schedule.doctor.user.username ?? ''}
							/>

							<input
								{...getInputProps(fields.doctorId, { type: 'hidden' })}
								value={schedule.doctorId}
							/>

							<input
								{...getInputProps(fields.userId, { type: 'hidden' })}
								value={userId}
							/>

							<input
								{...getInputProps(fields.scheduleId, { type: 'hidden' })}
								value={schedule.id}
							/>

							<div className="grid grid-cols-2 gap-4">
								<Field
									labelProps={{ children: 'Name' }}
									inputProps={{
										...getInputProps(fields.name, { type: 'text' }),
									}}
									errors={fields.name.errors}
								/>

								<Field
									labelProps={{ children: 'Phone' }}
									inputProps={{
										...getInputProps(fields.phone, { type: 'tel' }),
									}}
									errors={fields.phone.errors}
								/>
							</div>
							<div className="space-y-2"></div>
							<div className="space-y-2">
								<TextareaField
									labelProps={{ children: 'Additional Notes' }}
									textareaProps={{
										...getInputProps(fields.note, { type: 'text' }),
									}}
									errors={fields.note.errors}
								/>
							</div>
						</div>
						<p className="text-xs">
							<strong>Note: </strong>You will be charged{' '}
							{schedule.depositAmount?.toFixed(2)} tk deposit now. The remaining
							amount will be charged at the clinic.
						</p>
					</CardContent>
					<CardFooter>
						<Button className="w-full cursor-pointer" type="submit">
							Confirm Booking (Pay {schedule.depositAmount?.toFixed(2)} tk
							Deposit)
						</Button>
					</CardFooter>
				</Form>
			</Card>

			<Spacer size="lg" />
		</div>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => <p>Schedule not found</p>,
			}}
		/>
	)
}
