import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { getNextDateSchedules } from './schedule'

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
