import { addMonths, addDays, set } from 'date-fns'
import { getHoursAndMinutes } from './schedule'

export const REPEAT_WEEKS = 52
export const REPEAT_MONTHS = 12

export const DAYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
] as const
export type TDay = (typeof DAYS)[number]

export function getMonthlyScheduleDates(
	date?: Date,
	startTime?: string,
	endTime?: string,
	isRepetitiveMonth?: boolean,
): { startTime: Date; endTime: Date }[] {
	// Early return for invalid inputs
	if (
		!date ||
		!startTime ||
		!endTime ||
		!isValidTime(startTime) ||
		!isValidTime(endTime)
	) {
		return []
	}

	const [startHours, startMinutes] = parseTime(startTime)
	const [endHours, endMinutes] = parseTime(endTime)

	// Handle invalid time parsing
	if (startHours === null || endHours === null) return []

	// Create base dates
	const baseStart = setTime(new Date(date), startHours, startMinutes ?? 0)
	const baseEnd = setTime(new Date(date), endHours, endMinutes ?? 0)

	if (!isRepetitiveMonth) {
		return validateDates(baseStart, baseEnd)
			? [{ startTime: baseStart, endTime: baseEnd }]
			: []
	}

	// Generate repetitive schedules
	return Array.from({ length: 12 }, (_, i) => {
		const newDate = addMonths(date, i)
		const start = setTime(newDate, startHours, startMinutes ?? 0)
		const end = setTime(newDate, endHours, endMinutes ?? 0)
		return { startTime: start, endTime: end }
	}).filter(({ startTime, endTime }) => validateDates(startTime, endTime))
}

// Helper functions
function parseTime(time: string): [number | null, number | null] {
	const [hours, minutes] = time.split(':').map(Number)
	// Validate hours and minutes
	if (
		hours === undefined ||
		minutes === undefined ||
		isNaN(hours) ||
		isNaN(minutes)
	)
		return [null, null]
	return [
		Number.isInteger(hours) && hours >= 0 && hours < 24 ? hours : null,
		Number.isInteger(minutes) && minutes >= 0 && minutes < 60 ? minutes : null,
	]
}

function setTime(date: Date, hours: number, minutes: number): Date {
	return set(date, { hours, minutes, seconds: 0, milliseconds: 0 })
}

function validateDates(start: Date, end: Date): boolean {
	return start.getTime() <= end.getTime()
}

function addMonths(date: Date, months: number): Date {
	const result = new Date(date)
	result.setMonth(result.getMonth() + months)

	// Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
	if (result.getDate() !== date.getDate()) {
		result.setDate(0) // Set to last day of previous month
	}
	return result
}

export function isValidTime(time: string): boolean {
	return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)
}

export function getWeeklyScheduleDates(
	daysArray?: TDay[],
	startTime,
	endTime,
	isRepetive = false,
) {
	if (!daysArray?.length) return []
	const today = new Date()

	// Function to find the next occurrences for a given weekday name
	const getOccurrences = (dayName: string) => {
		const dayIndex = DAYS.indexOf(dayName.toLocaleLowerCase())
		const occurrences = []
		let currentDate = today

		// Check if today matches the target day
		if (currentDate.getDay() === dayIndex) {
			occurrences.push(currentDate)
		}

		// Generate future occurrences
		const targetOccurrences = isRepetive ? REPEAT_WEEKS : 1
		while (occurrences.length < targetOccurrences) {
			currentDate = addDays(currentDate, 1)

			if (currentDate.getDay() === dayIndex) {
				occurrences.push(new Date(currentDate)) // Add occurrence
			}

			// Safety check to avoid infinite loop
			if (occurrences.length > 366) {
				console.error('Infinite loop detected')
				break
			}
		}

		return occurrences
	}

	// Generate all occurrences for the input days
	const allOccurrences = daysArray.flatMap((dayName) => getOccurrences(dayName))

	// Remove duplicates, sort, and format the dates
	const uniqueDates = Array.from(
		new Set(allOccurrences.map((date) => date.getTime())),
	)
		.sort((a, b) => a - b)
		.map((date) => new Date(date))

	return uniqueDates
}

export function isOverlapping(
	existing: { startTime: Date; endTime: Date; locationId: string },
	newSchedule: { startTime: Date; endTime: Date; locationId: string },
): boolean {
	// First check if locations match
	if (existing.locationId !== newSchedule.locationId) return false

	// Check for time overlap
	return (
		newSchedule.startTime < existing.endTime &&
		newSchedule.endTime > existing.startTime
	)
}

export function checkOverlapSchedule<
	T extends { startTime: Date | string; endTime: Date | string },
>(
	scheduleDates: Date[],
	schedules: T[],
	startTime: Date | string,
	endTime: Date | string,
) {
	return scheduleDates.map((date) => {
		// Get the schedules for the current date
		const schedulesForDate = schedules.filter((schedule) => {
			return (
				schedule.date.toISOString().slice(0, 10) ===
				new Date(date).toISOString().slice(0, 10)
			)
		})

		// Convert the times to Date objects for comparison
		const [formStartHour, formStartMin] = getHoursAndMinutes(startTime)
		const [formEndHour, formEndMin] = getHoursAndMinutes(endTime)

		// Create time objects with the correct day
		const formStartTime = new Date(
			new Date(date).setHours(formStartHour, formStartMin, 0, 0),
		)
		const formEndTime = new Date(
			new Date(date).setHours(formEndHour, formEndMin, 0, 0),
		)

		// Check for overlaps
		const isOverlapped = schedulesForDate.some((schedule) => {
			const [scheduleStartHour, scheduleStartMin] = schedule.startTime
				.split(':')
				.map(Number)
			const [scheduleEndHour, scheduleEndMin] = schedule.endTime
				.split(':')
				.map(Number)

			const scheduleStartTime = new Date(
				new Date(schedule.date).setHours(
					scheduleStartHour,
					scheduleStartMin,
					0,
					0,
				),
			)
			const scheduleEndTime = new Date(
				new Date(schedule.date).setHours(scheduleEndHour, scheduleEndMin, 0, 0),
			)

			return (
				(formStartTime >= scheduleStartTime &&
					formStartTime <= scheduleEndTime) || // Form start time overlaps
				(formEndTime >= scheduleStartTime && formEndTime <= scheduleEndTime) // Form end time overlaps
			)
		})

		return isOverlapped
	})
}
