import { differenceInHours, isAfter } from 'date-fns'

export const DAYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
] as const

// returns all schedules that have not ended yet
export function getUpcomingSchedules<
	T extends { startTime: Date | string; endTime: Date | string },
>(schedules: T[]): T[] {
	const now = new Date()
	return schedules.filter((schedule) => {
		return new Date(schedule.endTime) > now
	})
}

// TODAY: 2022-01-01 time 01:00:00
// SCHEDULES: [
// 	{ startTime: '2022-01-01T00:00:00.000Z', endTime: '2022-01-01T01:00:00.000Z' },
// 	{ startTime: '2022-01-01T12:00:00.000Z', endTime: '2022-01-01T13:00:00.000Z' },
// 	{ startTime: '2022-01-02T00:00:00.000Z', endTime: '2022-01-02T01:00:00.000Z' },
// ]
// EXPECTED: { startTime: '2022-01-01T12:00:00.000Z', endTime: '2022-01-01T13:00:00.000Z' }
// since it's the next schedule after today 01:00:00
export function getNextDateSchedules<
	T extends { startTime: Date | string; endTime: Date | string },
>(schedules: T[]): T[] {
	if (schedules.length === 0) return []

	const now = new Date()
	const today = new Date()
	today.setHours(0, 0, 0, 0) // Start of today
	const tomorrow = new Date(today)
	tomorrow.setDate(today.getDate() + 1) // Start of tomorrow

	const upcomingSchedules = schedules.filter((schedule) => {
		const start = new Date(schedule.startTime)
		const end = new Date(schedule.endTime)

		// Only include schedules that:
		// 1. Start today or later
		// 2. Haven't ended yet
		// 3. Are not tomorrow or beyond (only today's upcoming schedules)
		return start >= today && end > now && start < tomorrow
	})

	return upcomingSchedules.sort((a, b) => {
		return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
	})
}
/**
 * Determines if a scheduled start time is more than 6 hours in the future
 * @param scheduleStartTime - The scheduled start time to check
 * @returns True if the schedule starts more than 6 hours from now
 */
export function isStartTimeMoreThanSixHoursAhead(
	scheduleStartTime: Date,
): boolean {
	const now = new Date()
	return (
		isAfter(scheduleStartTime, now) &&
		differenceInHours(scheduleStartTime, now) > 6
	)
}

// takes a time string like "2: 14" or "14: 00" and returns [2, 14] or [14, 0]
export function getHoursAndMinutes(time: Date) {
	const hour = time.getHours()
	const minute = time.getMinutes()
	return [hour, minute]
}
