import { addMonths, set, nextDay, addWeeks, type Day } from 'date-fns'
import { DAYS } from './schedule'

export const REPEAT_WEEKS = 52
export const REPEAT_MONTHS = 12

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

export function isValidTime(time: string): boolean {
	return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)
}

export function getWeeklyScheduleDates(
	daysArray?: TDay[],
	startTime?: string,
	endTime?: string,
	isRepetitive = false,
): { startTime: Date; endTime: Date }[] {
	// Early return for invalid inputs
	if (
		!daysArray ||
		daysArray.length === 0 ||
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

	const today = new Date()
	const schedules: { startTime: Date; endTime: Date }[] = []

	// Convert day names to date-fns day indices (0 = Sunday, 6 = Saturday)
	const dayIndices = daysArray.map((day) => {
		const index = DAYS.indexOf(day)
		if (index === -1) return
		return index
	})

	if (dayIndices.length === 0) return []

	if (!isRepetitive) {
		// Get all requested days in the current week
		return dayIndices
			.map((dayIndex) => {
				const startDate = set(nextDay(today, dayIndex as Day), {
					hours: startHours,
					minutes: startMinutes ?? 0,
					seconds: 0,
					milliseconds: 0,
				})
				const endDate = set(startDate, {
					hours: endHours,
					minutes: endMinutes ?? 0,
				})
				return { startTime: startDate, endTime: endDate }
			})
			.filter(({ startTime, endTime }) => validateDates(startTime, endTime))
			.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
	}

	// For repetitive weekly schedules, generate for the next 12 weeks
	for (let week = 0; week < 52; week++) {
		dayIndices.forEach((dayIndex) => {
			const baseDate = addWeeks(today, week)
			const startDate = set(nextDay(baseDate, dayIndex as Day), {
				hours: startHours,
				minutes: startMinutes ?? 0,
				seconds: 0,
				milliseconds: 0,
			})
			const endDate = set(startDate, {
				hours: endHours,
				minutes: endMinutes ?? 0,
			})

			if (validateDates(startDate, endDate)) {
				schedules.push({
					startTime: startDate,
					endTime: endDate,
				})
			}
		})
	}

	return schedules.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
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
