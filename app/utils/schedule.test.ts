import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getNextDateSchedules } from './schedule'
import {
	getMonthlyScheduleDates,
	getWeeklyScheduleDates,
	isValidTime,
} from './schedule.server'
import { addDays, set } from 'date-fns'

const FIXED_NOW = new Date('2023-10-01T12:00:00Z') // Fixed date for testing Sunday, Oct 1, 2023, 12:00 PM UTC

beforeAll(() => {
	vi.useFakeTimers()
	vi.setSystemTime(FIXED_NOW)
})

afterAll(() => {
	vi.useRealTimers() // ← This is crucial!
})

const pastSchedules = [
	{
		id: '1',
		startTime: new Date(new Date(FIXED_NOW).getTime() - 86400000), // Yesterday
		endTime: new Date(new Date(FIXED_NOW).getTime() - 82800000), // Yesterday
	},
	{
		id: '2',
		startTime: new Date(new Date(FIXED_NOW).getTime() - 172800000), // day before yesterday
		endTime: new Date(new Date(FIXED_NOW).getTime() - 172800000), // day before yesterday
	},
]

const todaySchedulesWithPassedEndTime = [
	{
		id: '3',
		startTime: new Date(FIXED_NOW.getTime() - 3600000), // 1 hour ago
		endTime: new Date(FIXED_NOW.getTime() - 1800000), // 30 minutes ago
	},
	{
		id: '4',
		startTime: new Date(FIXED_NOW.getTime() - 10800000), // 3 hours ago
		endTime: new Date(FIXED_NOW.getTime() - 7200000), // 2 hours ago
	},
]

const futureFirstSchedule = {
	id: '5',
	startTime: new Date(FIXED_NOW.getTime()), // Now
	endTime: new Date(FIXED_NOW.getTime() + 7200000), // 2 hours from now
}

const futureSecondSchedule = {
	id: '6',
	startTime: new Date(FIXED_NOW.getTime() + 7200000), // 2 hours from now
	endTime: new Date(FIXED_NOW.getTime() + 10800000), // 3 hours from now
}

const todayUpcomingSchedules = [futureFirstSchedule, futureSecondSchedule]
const dayAfterTomorrowSchedule = [
	{
		id: '7',
		startTime: new Date(FIXED_NOW.getTime() + 172800000), // Day after tomorrow
		endTime: new Date(FIXED_NOW.getTime() + 172800000 + 7200000), // Day after tomorrow
	},
]

const futureUnSortedSchedules = [
	...dayAfterTomorrowSchedule,
	...todayUpcomingSchedules,
]

describe('getNextDateSchedules', () => {
	it('should return [] if there are no schedules', () => {
		expect(getNextDateSchedules([])).toEqual([])
	})

	it('should return [] if there are no upcoming schedules', () => {
		expect(getNextDateSchedules(pastSchedules)).toEqual([])
		expect(getNextDateSchedules(todaySchedulesWithPassedEndTime)).toEqual([])
	})

	it(`should return next day schedules if today’s schedules are passed their end time`, () => {
		const result = getNextDateSchedules([
			...todaySchedulesWithPassedEndTime,
			...todayUpcomingSchedules,
			...dayAfterTomorrowSchedule,
		])
		expect(result).toEqual(todayUpcomingSchedules) // todayUpcomingSchedules are the next schedules
	})

	it('should return sorted schedules by time', () => {
		const result = getNextDateSchedules([
			futureSecondSchedule,
			futureFirstSchedule,
		])
		expect(result).toEqual([futureFirstSchedule, futureSecondSchedule])
	})

	it('should return sorted schedules by date', () => {
		const result = getNextDateSchedules(futureUnSortedSchedules)
		expect(result).toEqual(todayUpcomingSchedules)
	})
})

describe('isValidTime', () => {
	it('should return false if time is invalid', () => {
		expect(isValidTime('25:00')).toBe(false)
		expect(isValidTime('12:60')).toBe(false)
		expect(isValidTime('abc')).toBe(false)
		expect(isValidTime('12')).toBe(false)
		expect(isValidTime('')).toBe(false)
		expect(isValidTime('12:0')).toBe(false)
		expect(isValidTime('12:0:0')).toBe(false)
		expect(isValidTime('12:00:00')).toBe(false)
		expect(isValidTime('12:00:00')).toBe(false)
	})

	it('should return true if time is valid', () => {
		expect(isValidTime('14:00')).toBe(true)
		expect(isValidTime('23:59')).toBe(true)
	})
})

describe('getMonthlyScheduleDates', () => {
	it('should return empty array if the date or starttime or endtime is not provided', () => {
		const result = getMonthlyScheduleDates(new Date(), '', '', false)
		expect(result).toEqual([])
		const result2 = getMonthlyScheduleDates(new Date(), '3:14', '27:18', false)
		expect(result2).toEqual([])
		const result3 = getMonthlyScheduleDates(new Date(), '', '', false)
		expect(result3).toEqual([])
	})

	it('should return empty array if the endTime is before startTime', () => {
		const result = getMonthlyScheduleDates(new Date(), '14:00', '13:00', false)
		expect(result).toEqual([])
	})

	it('should return one schedule if isRepetitiveMonth is false', () => {
		const result = getMonthlyScheduleDates(
			new Date('2023-10-01'),
			'14:00',
			'15:00',
			false,
		)
		expect(result).toEqual([
			{
				startTime: new Date(2023, 9, 1, 14, 0), // Oct = 9 (0-based)
				endTime: new Date(2023, 9, 1, 15, 0),
			},
		])
	})

	it('should return 12 schedules if isRepetitiveMonth is true', () => {
		const result = getMonthlyScheduleDates(
			new Date('2023-10-01'),
			'14:00',
			'15:00',
			true,
		)

		const expected = Array.from({ length: 12 }, (_, i) => {
			const year = 2023 + Math.floor((i + 9) / 12) // handle year rollover
			const month = (i + 9) % 12 // 0-indexed month
			return {
				startTime: new Date(year, month, 1, 14, 0),
				endTime: new Date(year, month, 1, 15, 0),
			}
		})

		expect(result).toEqual(expected)
	})
})

describe('getWeeklyScheduleDates', () => {
	it('should return empty array if the date or starttime or endtime is not provided', () => {
		const result = getWeeklyScheduleDates([], '', '', false)
		expect(result).toEqual([])
		const result2 = getWeeklyScheduleDates(['sunday'], '3:14', '27:18', false)
		expect(result2).toEqual([])
		const result3 = getWeeklyScheduleDates(['monday'], '', '12:9', false)
		expect(result3).toEqual([])
	})

	it('should return one schedule if isRepetitiveWeek is false', () => {
		const result = getWeeklyScheduleDates(['sunday'], '14:00', '15:00', false)
		expect(result).toEqual([
			{
				startTime: new Date(
					FIXED_NOW.getFullYear(),
					FIXED_NOW.getMonth(),
					8, // next FIXED_NOW.getDay() + 1
					14,
					0,
				),
				endTime: new Date(
					FIXED_NOW.getFullYear(),
					FIXED_NOW.getMonth(),
					8,
					15,
					0,
				),
			},
		])
	})

	it('should return 7 schedules if isRepetitiveWeek is false', () => {
		const result = getWeeklyScheduleDates(
			['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
			'14:00',
			'15:00',
			false,
		)

		console.log('result', result)

		// exclude saturday

		expect(result[0]?.endTime).toEqual(
			new Date(
				FIXED_NOW.getFullYear(),
				FIXED_NOW.getMonth(),
				2, // next FIXED_NOW.getDay() + 1
				15,
				0,
			),
		)

		expect(result[result.length - 1]?.startTime).toEqual(
			new Date(FIXED_NOW.getFullYear(), FIXED_NOW.getMonth(), 8, 14, 0), // next sunday for FIXED_NOW
		)
	})

	it('should return 52 schedules if isRepetitiveWeek is true', () => {
		const result = getWeeklyScheduleDates(['sunday'], '14:00', '15:00', true)

		expect(result).toHaveLength(52) // 52 weeks in a year
		expect(result[0]).toEqual({
			startTime: new Date(
				FIXED_NOW.getFullYear(),
				FIXED_NOW.getMonth(),
				8,
				14,
				0,
			), // next sunday for FIXED_NOW
			endTime: new Date(
				FIXED_NOW.getFullYear(),
				FIXED_NOW.getMonth(),
				8,
				15,
				0,
			),
		})
		const lastDate = new Date(addDays(FIXED_NOW, 364))
		expect(result[51]).toEqual({
			startTime: set(new Date(lastDate), {
				hours: 14,
				minutes: 0,
			}),
			endTime: set(new Date(lastDate), {
				hours: 15,
				minutes: 0,
			}),
		})

		result.forEach((schedule) => {
			expect(schedule.startTime.getDay()).toBe(0) // 0 = Sunday
			expect(schedule.endTime.getDay()).toBe(0)
		})

		result.forEach((schedule) => {
			expect(schedule.startTime.getHours()).toBe(14)
			expect(schedule.startTime.getMinutes()).toBe(0)
			expect(schedule.endTime.getHours()).toBe(15)
			expect(schedule.endTime.getMinutes()).toBe(0)
		})

		for (let i = 1; i < result.length; i++) {
			const prevDate = result[i - 1]?.startTime
			const currentDate = result[i]?.startTime

			if (!prevDate || !currentDate) {
				throw new Error('Invalid date comparison')
			}

			const diffInDays =
				(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)

			expect(diffInDays).toBeCloseTo(7, 0)
		}
	})

	it('should handle daylight saving time changes correctly', () => {
		// Set fixed date just before DST change (dates vary by region)
		const preDstDate = new Date('2023-03-10T12:00:00Z') // Before US DST change
		vi.setSystemTime(preDstDate)

		const result = getWeeklyScheduleDates(['sunday'], '02:30', '03:30', true)

		// Find schedules that cross DST boundary
		const dstTransitionSchedules = result.filter((s) => {
			const preDst = new Date(s.startTime.getFullYear(), 2, 1) // March 1
			const postDst = new Date(s.startTime.getFullYear(), 3, 1) // April 1
			return s.startTime >= preDst && s.startTime <= postDst
		})

		// Verify times are maintained correctly
		dstTransitionSchedules.forEach((schedule) => {
			expect(schedule.startTime.getHours()).toBe(2)
			expect(schedule.endTime.getHours()).toBe(3)
		})
	})

	it('should maintain correct ordering for multiple days in week', () => {
		const result = getWeeklyScheduleDates(
			['wednesday', 'monday', 'friday'],
			'09:00',
			'17:00',
			false,
		)

		// Verify ordering matches input days
		expect(result[0]?.startTime.getDay()).toBe(1) // Monday
		expect(result[1]?.startTime.getDay()).toBe(3) // Wednesday
		expect(result[2]?.startTime.getDay()).toBe(5) // Friday
	})

	it('should produce consistent results across timezones', () => {
		const testInTimezone = (tz: string) => {
			const originalTZ = process.env.TZ
			process.env.TZ = tz
			const result = getWeeklyScheduleDates(
				['tuesday'],
				'23:00',
				'01:00',
				false,
			)
			process.env.TZ = originalTZ
			return result
		}

		const nyResult = testInTimezone('America/New_York')
		const londonResult = testInTimezone('Europe/London')
		const tokyoResult = testInTimezone('Asia/Tokyo')

		// All should represent the same UTC time
		expect(nyResult[0]?.startTime.toISOString()).toEqual(
			londonResult[0]?.startTime.toISOString(),
		)
		expect(nyResult[0]?.startTime.toISOString()).toEqual(
			tokyoResult[0]?.startTime.toISOString(),
		)
	})
	it('should handle invalid day names gracefully', () => {
		// @ts-expect-error - Testing invalid input
		expect(getWeeklyScheduleDates(['notaday'], '09:00', '17:00')).toEqual([])
		// @ts-expect-error - Testing invalid input
		expect(getWeeklyScheduleDates([null], '09:00', '17:00')).toEqual([])
	})

	it('should return empty array when daysArray is empty', () => {
		expect(getWeeklyScheduleDates([], '09:00', '17:00')).toEqual([])
	})

	it('should generate 52 weekly schedules when isRepetitive=true', () => {
		const FIXED_DATE = new Date('2023-01-01T12:00:00Z') // Any fixed date
		vi.setSystemTime(FIXED_DATE)

		const result = getWeeklyScheduleDates(['monday'], '09:00', '10:00', true)

		// Basic count verification
		expect(result).toHaveLength(52)

		// Verify first and last dates are approximately 1 year apart
		const firstDate = result[0]?.startTime
		const lastDate = result[51]?.startTime
		if (!firstDate || !lastDate) {
			throw new Error('Invalid date comparison')
		}
		const yearDiff = lastDate.getFullYear() - firstDate.getFullYear()

		// Typically will be 0 or 1 depending on start date
		expect(yearDiff).toBeLessThanOrEqual(1)

		// More accurate duration check (51 weeks ≈ 357 days)
		const dayDiff =
			(lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
		expect(dayDiff).toBeCloseTo(357, 0) // Allowing slight variance for DST
	})
})
