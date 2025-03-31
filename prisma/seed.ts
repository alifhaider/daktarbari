import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { MOCK_CODE_GITHUB } from '#app/utils/providers/constants'
import { createPassword, createUser, getUserImages } from '#tests/db-utils.ts'
import { insertGitHubUser } from '#tests/mocks/github.ts'

const mock_specialties = [
	'Cardiologist',
	'Dermatologist',
	'Endocrinologist',
	'Gastroenterologist',
	'Hematologist',
	'Nephrologist',
	'Neurologist',
	'Oncologist',
	'Ophthalmologist',
	'Otolaryngologist',
	'Pediatrician',
	'Physiatrist',
	'Psychiatrist',
	'Pulmonologist',
	'Radiologist',
	'Rheumatologist',
	'Urologist',
]

const institutes = [
	{
		degree: 'MBBS',
		institute: 'Dhaka Medical College',
		year: '2010',
	},
	{
		degree: 'MD',
		institute: 'National Institute of Cardiovascular Diseases',
		year: '2015',
	},
	{
		degree: 'FCPS',
		institute: 'Bangabandhu Sheikh Mujib Medical University',
		year: '2017',
	},
	{
		degree: 'MRCP',
		institute: 'Royal College of Physicians',
		year: '2019',
	},
	{
		degree: 'FRCP',
		institute: 'Royal College of Physicians',
		year: '2021',
	},
]

const locations = [
	{
		name: 'Square Hospital',
		address: '18/F West Panthapath, Dhaka 1205',
		city: 'Dhaka',
		state: 'Dhaka',
		zip: '1205',
	},
	{
		name: 'Apollo Hospital',
		address: 'Plot: 81, Block: E, Bashundhara R/A, Dhaka 1229',
		city: 'Dhaka',
		state: 'Dhaka',
		zip: '1229',
	},
	{
		name: 'United Hospital',
		address: 'Plot 15, Road 71, Gulshan, Dhaka 1212',
		city: 'Dhaka',
		state: 'Dhaka',
		zip: '1212',
	},
	{
		name: 'Labaid Hospital',
		address: 'House- 01, Road- 04, Dhanmondi, Dhaka 1205',
		city: 'Dhaka',
		state: 'Dhaka',
		zip: '1205',
	},
	{
		name: 'Ibn Sina Hospital',
		address: 'House 48, Road 9/A, Dhanmondi, Dhaka 1209',
		city: 'Dhaka',
		state: 'Dhaka',
		zip: '1209',
	},
]

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Clean up database...')
	await prisma.booking.deleteMany()
	await prisma.schedule.deleteMany()
	await prisma.doctorSpecialty.deleteMany()
	await prisma.scheduleLocation.deleteMany()
	await prisma.education.deleteMany()
	await prisma.review.deleteMany()
	await prisma.doctor.deleteMany()
	await prisma.user.deleteMany()
	await prisma.password.deleteMany()

	console.timeEnd('🧹 Clean up database...')

	const totalUsers = 10
	const totalDoctors = 5
	const totalAppointments = 10
	const totalScheduleLocations = 3
	const totalSchedules = 10
	const totalReviews = 10
	console.time(`👤 Created ${totalUsers} users...`)
	const userImages = await getUserImages()

	const users = await Promise.all(
		Array.from({ length: totalUsers }).map(async (_, index) => {
			const userData = createUser()
			const user = await prisma.user.create({
				select: { id: true },
				data: {
					...userData,
					password: { create: createPassword(userData.username) },
					roles: { connect: { name: 'user' } },
				},
			})

			// Upload user profile image
			const userImage = userImages[index % userImages.length]
			if (userImage) {
				await prisma.userImage.create({
					data: {
						userId: user.id,
						objectKey: userImage.objectKey,
					},
				})
			}

			return user
		}),
	)
	console.timeEnd(`👤 Created ${totalUsers} users...`)

	// create 5 doctors among the users

	console.time('👨‍⚕️ Creating doctors...')
	const doctors = await Promise.all(
		Array.from({ length: totalDoctors }).map(async (_, index) => {
			const doctor = await prisma.doctor.create({
				data: {
					bio: faker.person.bio(),
					userId: users[index]!.id,
					balance: Math.floor(Math.random() * 1000),
					currency: faker.finance.currencyName(),
					homeAddress: faker.address.streetAddress(),
					specialties: {
						createMany: {
							data: Array.from({
								length: Math.floor(Math.random() * 3) + 1,
							}).map(() => ({
								name: mock_specialties[
									Math.floor(Math.random() * mock_specialties.length)
								]!,
							})),
						},
					},
					rating: Math.floor(Math.random() * 5),
					education: {
						createMany: {
							data: Array.from({
								length: Math.floor(Math.random() * 3) + 1,
							}).map(() => ({
								degree:
									institutes[Math.floor(Math.random() * institutes.length)]!
										.degree,
								institute:
									institutes[Math.floor(Math.random() * institutes.length)]!
										.institute,
								year: institutes[Math.floor(Math.random() * institutes.length)]!
									.year,
							})),
						},
					},
				},
			})
			return doctor
		}),
	)
	console.timeEnd('👨‍⚕️ Creating doctors...')

	console.time('👨‍⚕️ Creating scheduleLocations...')
	const scheduleLocations = await Promise.all(
		Array.from({ length: totalScheduleLocations }).map(async (_, index) => {
			const scheduleLocation = await prisma.scheduleLocation.create({
				data: {
					name: locations[index % locations.length]!.name,
					address: locations[index % locations.length]!.address,
					city: locations[index % locations.length]!.city,
					state: locations[index % locations.length]!.state,
					zip: locations[index % locations.length]!.zip,
				},
			})
			return scheduleLocation
		}),
	)
	console.timeEnd('👨‍⚕️ Creating scheduleLocations...')

	console.time('👨‍⚕️ Creating schedules...')
	const schedules = await Promise.all(
		Array.from({ length: totalSchedules }).map(async (_, index) => {
			const date = faker.date.soon({ days: 40 })
			date.setUTCHours(0, 0, 0, 0)

			// set start and end time same day with start hours between 8am to 5pm
			// and end hours between 9am to 6pm
			const startTime = faker.date.between({
				from: Date.now(),
				to: date.setUTCHours(8, 0, 0, 0),
			})
			const endTime = faker.date.between({
				from: startTime,
				to: date.setUTCHours(17, 0, 0, 0),
			})

			const visitFee = Math.floor(Math.random() * 1000)
			const serialFee = Math.floor(Math.random() * 1000)
			// 10% of the total fee as discount
			const discountFee = Math.floor(Number(visitFee + serialFee) / 10)
			const depositAmount = Math.floor(
				Number(visitFee + serialFee - discountFee) / 10,
			)

			const schedule = await prisma.schedule.create({
				data: {
					doctorId: doctors[index % totalDoctors]!.userId,
					startTime,
					endTime,
					locationId: scheduleLocations[index % totalScheduleLocations]!.id,
					maxAppointments: Math.floor(Math.random() * 10),
					serialFee,
					visitFee,
					depositAmount,
					discountFee,
				},
			})
			return schedule
		}),
	)
	console.timeEnd('👨‍⚕️ Creating schedules...')

	//filter doctors from users
	const doctorsUserIds = doctors.map((doctor) => doctor.userId)
	const filteredUsers = users.filter(
		(user) => !doctorsUserIds.includes(user.id),
	)

	console.time('👨‍⚕️ Creating bookings...')
	await Promise.all(
		Array.from({ length: totalAppointments }).map(async (_, index) => {
			const schedule = schedules[Math.floor(Math.random() * totalSchedules)]!
			const appointment = await prisma.booking.create({
				data: {
					status: 'PENDING',
					scheduleId: schedule.id,
					userId: filteredUsers[index % filteredUsers.length]!.id,
					doctorId: schedule.doctorId,
					name: faker.person.fullName(),
					phone: faker.phone.number(),
					note: faker.lorem.sentence(),
				},
			})
			return appointment
		}),
	)
	console.timeEnd('👨‍⚕️ Creating bookings...')

	console.time('🌱 Seeding reviews...')
	await Promise.all(
		Array.from({ length: totalReviews }).map(async (_, index) => {
			const review = await prisma.review.create({
				data: {
					rating: Math.floor(Math.random() * 5),
					comment: faker.lorem.sentence(),
					userId: filteredUsers[index % filteredUsers.length]!.id,
					doctorId: doctors[Math.floor(Math.random() * totalDoctors)]!.userId,
				},
			})
			return review
		}),
	)
	console.timeEnd('🌱 Seeding reviews...')

	console.time(`🐨 Created admin user "alif"`)

	const alifImages = {
		alifUser: { objectKey: 'user/kody.png' },
		cuteKoala: {
			altText: 'an adorable koala cartoon illustration',
			objectKey: 'kody-notes/cute-koala.png',
		},
		koalaEating: {
			altText: 'a cartoon illustration of a koala in a tree eating',
			objectKey: 'kody-notes/koala-eating.png',
		},
		koalaCuddle: {
			altText: 'a cartoon illustration of koalas cuddling',
			objectKey: 'kody-notes/koala-cuddle.png',
		},
		mountain: {
			altText: 'a beautiful mountain covered in snow',
			objectKey: 'kody-notes/mountain.png',
		},
		koalaCoder: {
			altText: 'a koala coding at the computer',
			objectKey: 'kody-notes/koala-coder.png',
		},
		koalaMentor: {
			altText:
				'a koala in a friendly and helpful posture. The Koala is standing next to and teaching a woman who is coding on a computer and shows positive signs of learning and understanding what is being explained.',
			objectKey: 'kody-notes/koala-mentor.png',
		},
		koalaSoccer: {
			altText: 'a cute cartoon koala kicking a soccer ball on a soccer field ',
			objectKey: 'kody-notes/koala-soccer.png',
		},
	}

	const githubUser = await insertGitHubUser(MOCK_CODE_GITHUB)

	const alif = await prisma.user.create({
		select: { id: true },
		data: {
			email: 'alif@daktarbari.dev',
			username: 'alif',
			name: 'Alif Haider',
			password: { create: createPassword('222222') },
			connections: {
				create: {
					providerName: 'github',
					providerId: String(githubUser.profile.id),
				},
			},
			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})

	await prisma.userImage.create({
		data: {
			userId: alif.id,
			objectKey: alifImages.alifUser.objectKey,
		},
	})

	console.timeEnd(`🐨 Created admin user "alif"`)
}

console.timeEnd(`🌱 Database has been seeded`)

seed()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

// we're ok to import from the test directory in this file
/*
eslint
	no-restricted-imports: "off",
*/
