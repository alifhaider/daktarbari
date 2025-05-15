import {
	type FieldMetadata,
	getFormProps,
	getInputProps,
	useForm,
} from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { format } from 'date-fns'
import { useState } from 'react'
import { data, Form, Link, type MetaFunction } from 'react-router'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { CheckboxField, ErrorList, Field } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '#app/components/ui/accordion.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Calendar } from '#app/components/ui/calendar.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Label } from '#app/components/ui/label.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { requireDoctor } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.tsx'
import {
	getMonthlyScheduleDates,
	getWeeklyScheduleDates,
	isOverlapping,
} from '#app/utils/schedule.server.ts'
import { DAYS } from '#app/utils/schedule.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { LocationCombobox } from '../resources+/location-combobox'
import { type Route } from './+types/add'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '#app/components/ui/sheet.tsx'

export const meta: MetaFunction = () => {
	return [{ title: 'Add Schedule / DB' }]
}

export async function loader({ request }: Route.LoaderArgs) {
	const doctor = await requireDoctor(request)
	return { userId: doctor.userId, username: doctor.user.username }
}

export enum ScheduleType {
	SINGLE_DAY = 'single_day',
	REPEAT_WEEKS = 'repeat_weeks',
}
export const DaysEnum = z.enum(DAYS)
export type DaysEnum = z.infer<typeof DaysEnum>

export const ScheduleSchema = z
	.object({
		locationId: z.string({ message: 'Select a location' }),
		userId: z.string({ message: 'User ID is required' }),
		username: z.string({ message: 'Username is required' }),
		scheduleType: z.nativeEnum(ScheduleType),
		oneDay: z.date().optional(),
		weeklyDays: z.array(DaysEnum).optional(),
		startTime: z.string({ message: 'Provide your schedule start time' }),
		endTime: z.string({ message: 'Provide your schedule end time' }),
		maxAppointment: z
			.number()
			.gt(0, { message: 'Maximum appointments must be greater than 0' }),
		repeatWeeks: z.boolean().optional(),
		repeatMonths: z.boolean().optional(),
		visitingFee: z.number({ message: 'Add visiting fee' }),
		serialFee: z.number({ message: 'Add schedule fee' }),
		discount: z.number().optional(),
	})
	.refine(
		(data) => {
			return !(data.startTime > data.endTime)
		},
		{
			message: 'Start time must be before the End time',
			path: ['startTime'],
		},
	)
	.superRefine((data, ctx) => {
		if (data.scheduleType === ScheduleType.SINGLE_DAY) {
			if (!data.oneDay) {
				ctx.addIssue({
					path: ['oneDay'],
					code: 'custom',
					message: 'Select a date for the schedule',
				})
			} else {
				const today = new Date()
				today.setHours(0, 0, 0, 0)

				const selectedDate = new Date(data.oneDay)
				selectedDate.setHours(0, 0, 0, 0)
				if (selectedDate < today) {
					ctx.addIssue({
						path: ['oneDay'],
						code: 'custom',
						message: 'Select a future date',
					})
				}
			}
		} else if (data.scheduleType === ScheduleType.REPEAT_WEEKS) {
			if (!data.weeklyDays?.length) {
				ctx.addIssue({
					path: ['weeklyDays'],
					code: 'custom',
					message: 'Select at least one day for the schedule',
				})
			}
		}
	})

export async function action({ request }: Route.ActionArgs) {
	await requireDoctor(request)
	console.log('submitting schedule')
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: () =>
			ScheduleSchema.transform(async (data, ctx) => {
				const weeklyDays = data.weeklyDays
				const isRepetiveMonth = data.repeatMonths ?? false
				const isRepetiveWeek = data.repeatWeeks ?? false
				const oneDay = data.oneDay
				const startTime = data.startTime
				const endTime = data.endTime
				const locationId = data.locationId

				const potentialSchedules = oneDay
					? getMonthlyScheduleDates(oneDay, startTime, endTime, isRepetiveMonth)
					: getWeeklyScheduleDates(
							weeklyDays,
							startTime,
							endTime,
							isRepetiveWeek,
						)

				if (potentialSchedules.length === 0) {
					ctx.addIssue({
						path: ['form'],
						code: 'custom',
						message: 'No valid schedules found',
					})
				}

				const newSchedules = potentialSchedules.map(
					({ startTime, endTime }) => ({
						startTime: new Date(startTime),
						endTime: new Date(endTime),
						locationId,
					}),
				)

				const existingSchedules = await prisma.schedule.findMany({
					where: {
						locationId,
						OR: newSchedules.map((schedule) => ({
							startTime: { lt: schedule.endTime },
							endTime: { gt: schedule.startTime },
						})),
					},
				})

				const nonOverlappingSchedules = newSchedules.filter(
					(newSchedule) =>
						!existingSchedules.some((existing) =>
							isOverlapping(existing, newSchedule),
						),
				)

				const createdSchedules = await prisma.schedule.createMany({
					data: nonOverlappingSchedules.map((schedule) => ({
						doctorId: data.userId,
						locationId,
						startTime: schedule.startTime,
						endTime: schedule.endTime,
						maxAppointments: data.maxAppointment,
						visitFee: data.visitingFee,
						serialFee: data.serialFee,
						discountFee: data.discount,
					})),
				})

				if (!createdSchedules) {
					ctx.addIssue({
						path: ['form'],
						code: 'custom',
						message: 'Could not create schedule',
					})
					return z.NEVER
				}

				const skippedCount =
					newSchedules.length - nonOverlappingSchedules.length
				const message =
					skippedCount > 0
						? `Created ${createdSchedules.count} schedules. ${skippedCount} schedules were skipped due to conflicts.`
						: `Successfully created ${createdSchedules.count} schedules.`

				return {
					...data,
					schedule: createdSchedules,
					message,
					createdCount: createdSchedules.count,
				}
			}),
		async: true,
	})

	if (submission.status !== 'success') {
		const formErrors = submission.error?.form
		return data(
			submission.reply({
				formErrors: formErrors ?? ['Could not create schedule'],
			}),
		)
	}
	const { username } = submission.value
	return redirectWithToast(`/profile/${username}`, {
		title: 'Schedule created successfully',
		description: submission.value.message,
	})
}

export default function AddSchedule({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { userId, username } = loaderData

	const [scheduleType, setScheduleType] = useState<ScheduleType>(
		ScheduleType.REPEAT_WEEKS,
	)
	const [date, setDate] = useState<Date>()

	const [form, fields] = useForm({
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ScheduleSchema })
		},
		shouldRevalidate: 'onSubmit',
	})

	return (
		<>
			<div className="mx-auto max-w-7xl">
				<h2 className="text-2xl leading-none font-semibold tracking-tight">
					Add Schedule
				</h2>
				<HelpText />
				<Spacer size="sm" />
				<Form method="post" className="space-y-8" {...getFormProps(form)}>
					<div className="grid grid-cols-1 gap-12 align-top md:grid-cols-2">
						<input
							{...getInputProps(fields.userId, { type: 'hidden' })}
							value={userId}
						/>
						{/* this is to make the navigation after successful creation */}
						<input
							{...getInputProps(fields.username, { type: 'hidden' })}
							value={username}
						/>
						<LocationCombobox field={fields.locationId} />
						<div className="space-y-1">
							<Label htmlFor="scheduleType">Schedule Type</Label>
							<Select
								defaultValue={scheduleType}
								{...getInputProps(fields.scheduleType, { type: 'hidden' })}
								onValueChange={(value) =>
									setScheduleType(value as ScheduleType)
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={ScheduleType.SINGLE_DAY}>
										One Day
									</SelectItem>
									<SelectItem value={ScheduleType.REPEAT_WEEKS}>
										Repeat Weekly
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<div className="flex items-center gap-8">
								<Field
									labelProps={{ children: 'Start time', className: 'mb-1' }}
									inputProps={{
										defaultValue: '10:00',
										...getInputProps(fields.startTime, { type: 'time' }),
									}}
									errors={fields.startTime.errors}
								/>
								<Field
									labelProps={{ children: 'End time', className: 'mb-1' }}
									inputProps={{
										defaultValue: '17:00',
										...getInputProps(fields.endTime, { type: 'time' }),
									}}
									errors={fields.endTime.errors}
								/>
							</div>
							<Field
								labelProps={{ children: 'Maximum Appointments per day' }}
								inputProps={{
									defaultValue: 10,
									...getInputProps(fields.maxAppointment, { type: 'number' }),
								}}
								errors={fields.maxAppointment.errors}
							/>
						</div>
						<div className="flex flex-col gap-2">
							{scheduleType === ScheduleType.SINGLE_DAY ? (
								<>
									<Label htmlFor="date" className="mb-1">
										Date
									</Label>
									<input
										{...getInputProps(fields.oneDay, { type: 'hidden' })}
										value={date ? format(date, 'yyyy-MM-dd') : ''}
									/>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant={'outline'}
												className={cn(
													'mb-2 w-[240px] justify-start text-left font-normal',
													!date && 'text-muted-foreground',
												)}
											>
												<Icon name="calendar" className="mr-2 h-4 w-4" />
												{date ? format(date, 'PPP') : <span>Pick a date</span>}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={date}
												onSelect={setDate}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<ErrorList errors={fields.oneDay.errors} />

									<RepeatCheckbox
										field={fields.repeatMonths}
										label="Repeat every month"
									/>
								</>
							) : null}
							{scheduleType === ScheduleType.REPEAT_WEEKS ? (
								<>
									<Label className="text-sm font-bold">Days</Label>

									<fieldset>
										<ul className="grid grid-cols-3 gap-x-4 gap-y-2">
											{DAYS.map((day) => (
												<li key={day} className="flex space-x-2">
													<CheckboxField
														labelProps={{
															className: 'text-sm font-bold text-primary',
															htmlFor: fields.weeklyDays.id,
															children: day,
														}}
														buttonProps={getInputProps(fields.weeklyDays, {
															type: 'checkbox',
															value: day,
														})}
														errors={fields.weeklyDays.errors}
													/>
												</li>
											))}
										</ul>
										<div className="pt-1">
											<ErrorList errors={fields.weeklyDays.errors} />
										</div>
									</fieldset>
									<RepeatCheckbox
										field={fields.repeatWeeks}
										label="Repeat every week"
									/>
								</>
							) : null}

							<p className="text-secondary-foreground mt-2 text-sm">
								<ul className="list-disc space-y-2">
									<li>
										<strong>Note: </strong> By checking the repeat option, this
										schedule will be repeated for the selected days.
									</li>
									<li>
										For weekly schedules, 52 individual schedules will be
										generated.
									</li>
									<li>
										For monthly schedules, 12 individual schedules will be
										generated.
									</li>
								</ul>
							</p>
						</div>
						<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
							<Field
								labelProps={{ children: 'Visiting Fee' }}
								inputProps={{
									placeholder: '2000tk',
									...getInputProps(fields.visitingFee, { type: 'number' }),
								}}
								errors={fields.visitingFee.errors}
							/>

							<Field
								labelProps={{ children: 'Serial Fee' }}
								inputProps={{
									placeholder: '1000tk',
									...getInputProps(fields.serialFee, { type: 'number' }),
								}}
								errors={fields.serialFee.errors}
							/>

							<Field
								labelProps={{ children: 'Discount' }}
								inputProps={{
									defaultValue: 0,
									...getInputProps(fields.discount, { type: 'number' }),
								}}
								errors={fields.discount.errors}
							/>
						</div>
					</div>

					<div className="mt-12 flex items-center justify-center gap-4 lg:gap-8">
						<Button type="submit">Create Schedule</Button>
						<Sheet>
							<SheetTrigger>Open</SheetTrigger>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>Are you absolutely sure?</SheetTitle>
									<SheetDescription>
										This action cannot be undone. This will permanently delete
										your account and remove your data from our servers.
									</SheetDescription>
								</SheetHeader>
							</SheetContent>
						</Sheet>
					</div>

					<div className="mt-4 flex items-center justify-center">
						<ErrorList errors={form.errors} />
					</div>
				</Form>
			</div>
			<Spacer size="lg" />
		</>
	)
}
type CheckboxProps = {
	field: FieldMetadata
	label: string
}

function HelpText() {
	return (
		<div className="text-secondary-foreground mt-6 max-w-5xl space-y-1 text-sm">
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value="item-1">
					<AccordionTrigger className="text-lg">
						How create schedule works?
					</AccordionTrigger>
					<AccordionContent className="space-y-2">
						<p>
							A schedule is a set of days and times when you are available for
							appointments. You can create multiple schedules for different
							locations.
						</p>
						<p>
							For example, you can{' '}
							<strong className="text-base">
								create a schedule for your office location and another schedule
								for your home location.
							</strong>
						</p>
						<p>
							Each schedule can have{' '}
							<strong className="text-base">
								{' '}
								different days, times, and maximum appointments per day.
							</strong>
						</p>
						<p>
							When you create a schedule, patients can book appointments with
							you during the times you have set. In between{' '}
							<strong className="text-base">Start Time</strong> and{' '}
							<strong className="text-base">End Time</strong> are the times when
							you are available for appointments.
						</p>
						<p>
							Once you create a schedule, you can view and edit it on your{' '}
							<strong className="text-base">profile page.</strong>
						</p>
						<p>
							While creating a schedule you need to provide the following
							information:
						</p>
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	)
}

// TODO: mac has a problem with the checkbox
//       it doesn't display the checkbox with appropriate styles in initoal render
//       Probably a bug in the browser cache
function RepeatCheckbox({ field, label }: CheckboxProps) {
	return (
		<div className="items-top flex space-x-2">
			<CheckboxField
				labelProps={{
					htmlFor: field.id,
					children: label,
				}}
				buttonProps={getInputProps(field, { type: 'checkbox' })}
				className="rounded-full capitalize"
				errors={field.errors}
			/>
			<span className="text-sm">{label}</span>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
