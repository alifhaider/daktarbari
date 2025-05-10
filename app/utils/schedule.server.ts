import { addMonths, addDays } from 'date-fns'
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

export function isValidTime(time: string): boolean {
	const [hours, minutes] = time.split(':').map(Number)
	//check undefined or NaN
	if (hours === undefined || minutes === undefined) return false
	if (isNaN(hours) || isNaN(minutes)) return false
	if (hours < 0 || hours > 23) return false
	if (minutes < 0 || minutes > 59) return false
	return true
}

export function getMonthlyScheduleDates(
	date?: Date,
	startTime?: string,
	endTime?: string,
	isRepetitiveMonth?: boolean,
) {
	if (
		!date ||
		!startTime ||
		!endTime ||
		!isValidTime(startTime) ||
		!isValidTime(endTime)
	) {
		return []
	}

	console.log({ date, startTime, endTime, isRepetitiveMonth })

	// Parse the time components from the strings
	const [startHours, startMinutes] = startTime.split(':').map(Number)
	const [endHours, endMinutes] = endTime.split(':').map(Number)

	if (
		startHours === undefined ||
		startMinutes === undefined ||
		endHours === undefined ||
		endMinutes === undefined
	) {
		return []
	}

	// Create base date with the time components
	const baseStartDate = new Date(date)
	baseStartDate.setUTCHours(startHours, startMinutes, 0, 0)

	const baseEndDate = new Date(date)
	baseEndDate.setUTCHours(endHours, endMinutes, 0, 0)

	// If not repetitive, just return the single date
	if (!isRepetitiveMonth) {
		return [
			{
				startTime: baseStartDate,
				endTime: baseEndDate,
			},
		]
	}

	// For repetitive monthly schedules, generate for the next 12 months
	const schedules: { startTime: Date; endTime: Date }[] = []
	const currentYear = date.getFullYear()
	const currentMonth = date.getMonth()
	const dayOfMonth = date.getDate()

	for (let i = 0; i < 12; i++) {
		const month = currentMonth + i
		const year = currentYear + Math.floor(month / 12)
		const adjustedMonth = month % 12

		// Create the date for this month
		const startDate = new Date(year, adjustedMonth, dayOfMonth)
		startDate.setHours(startHours, startMinutes, 0, 0)

		const endDate = new Date(year, adjustedMonth, dayOfMonth)
		endDate.setHours(endHours, endMinutes, 0, 0)

		console.log(startDate, endDate, dayOfMonth)

		// Handle cases where the date might be invalid (e.g., Feb 31)
		if (
			startDate.getUTCDate() === dayOfMonth &&
			endDate.getUTCDate() === dayOfMonth
		) {
			schedules.push({
				startTime: startDate,
				endTime: endDate,
			})
		}
	}

	return schedules
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
