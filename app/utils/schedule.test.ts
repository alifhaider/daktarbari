import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getNextDateSchedules } from './schedule'
import { getMonthlyScheduleDates, isValidTime } from './schedule.server'

const FIXED_NOW = new Date('2023-10-01T12:00:00Z') // Fixed date for testing

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
	})

	it('should return true if time is valid', () => {
		expect(isValidTime('14:00')).toBe(true)
		expect(isValidTime('12:0')).toBe(true)
		expect(isValidTime('12:0:0')).toBe(true)
		expect(isValidTime('12:00:00')).toBe(true)
		expect(isValidTime('12:00:00')).toBe(true)
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

	it('should return one schedule if isRepetitiveMonth is false', () => {
		const result = getMonthlyScheduleDates(
			new Date('2023-10-01'),
			'14:00',
			'15:00',
			false,
		)
		expect(result).toEqual([
			{
				startTime: new Date('2023-10-01T14:00:00.000Z'),
				endTime: new Date('2023-10-01T15:00:00.000Z'),
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
		expect(result).toEqual(
			Array.from({ length: 12 }, (_, i) => ({
				startTime: new Date(
					`2023-${(i + 10).toString().padStart(2, '0')}-01T14:00:00.000Z`,
				),
				endTime: new Date(
					`2023-${(i + 10).toString().padStart(2, '0')}-01T15:00:00.000Z`,
				),
			})),
		)
	})
})
