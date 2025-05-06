import { Link } from 'react-router'
import Reminder from '#app/components/reminder.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { type Route } from './+types'

export const meta: Route.MetaFunction = () => [{ title: 'Daktar Bari' }]

export async function loader() {
	const doctors = await prisma.doctor.findMany({
		select: {
			_count: {
				select: {
					schedules: true,
				},
			},
			bio: true,
			rating: true,
			specialties: {
				select: {
					id: true,
					name: true,
				},
			},
			user: {
				select: {
					name: true,
					username: true,
					image: {
						select: {
							objectKey: true,
						},
					},
				},
			},
		},
		skip: Math.floor(Math.random() * 1),
		take: 8,
	})
	return { doctors }
}

export default function Index({ loaderData }: Route.ComponentProps) {
	const { doctors } = loaderData
	console.log(doctors)
	return (
		<main className="font-poppins grid h-full place-items-center">
			<Spacer size="xs" />
			<section className="mx-auto flex flex-col gap-10 md:container md:flex-row">
				<div className="space-y-6">
					<h1 className="text-4xl font-extrabold md:text-6xl">
						Find and Book Your Doctor&apos;s Appointment
					</h1>
					<p className="mt-6 font-medium">
						Take control of your health with our user-friendly platform. Search
						for doctors in your area, check their availability, and book
						appointments—all in one place.
					</p>

					<p className="font-medium">
						Schedule appointments with just a few clicks. Our streamlined
						booking system ensures you can find an available slot that fits your
						schedule without any hassle.
					</p>
				</div>
				<img
					className="h-80 w-full max-w-5xl rounded-2xl"
					src="https://i.ibb.co.com/jG6D6bY/Screenshot-92.png"
					alt="Doctor Appointment"
				/>
			</section>
			<section className="mt-20 w-full bg-primary-foreground px-8 py-20">
				<div className="container">
					<h2 className="text-brand text-3xl font-extrabold md:text-5xl">
						Search for Top-Rated Doctors
					</h2>
					<p className="mt-6 w-3/4">
						Browse through a comprehensive list of certified and experienced
						doctors across various specialties. Read patient reviews and ratings
						to choose the best healthcare professional for your needs.
					</p>
					<ul className="mt-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
						{doctors.map(({ specialties, user, rating, bio, _count }) => (
							<li className="h-full" key={user.username}>
								<div className="flex h-full flex-col justify-between rounded-lg border bg-background py-4 hover:shadow-lg">
									<div className="relative mx-auto h-20 w-20 rounded-sm bg-secondary">
										<img
											src={getUserImgSrc(user.image?.objectKey)}
											alt={user.name ?? user.username}
											className="h-full w-full rounded-sm object-cover"
										/>
										<div className="absolute -bottom-1 left-1/2 flex w-max -translate-x-1/2 items-center justify-center gap-0.5 rounded-md bg-secondary-foreground px-1 text-xs text-background shadow-lg">
											<Icon
												name="star"
												className="h-3 w-3 text-primary-foreground"
											/>
											{rating}
										</div>
									</div>
									<Link
										to={`/doctors/${user.username}`}
										className="group mt-2 flex items-end justify-center px-4"
									>
										<h3 className="text-lg font-semibold group-hover:underline">
											{user.name ?? user.username}
										</h3>
									</Link>
									<ul className="mt-4 flex flex-wrap justify-between text-sm">
										{specialties.map((specialty) => (
											<li
												key={specialty.id}
												className="flex items-center gap-1 px-4"
											>
												<div className="h-2 w-2 rounded-full bg-amber-300"></div>
												{specialty.name}
											</li>
										))}
									</ul>

									<p className="mt-4 px-4 text-sm">{bio}</p>

									<p className="mt-4 px-4 text-sm">
										<strong>Total schedules:</strong> {_count.schedules}
									</p>
									<Button asChild className="mx-4 mt-4">
										<Link to={`/doctors/${user.username}`}>
											Check Schedules
										</Link>
									</Button>
								</div>
							</li>
						))}
					</ul>

					<div className="mt-8 flex items-center justify-center">
						<Button asChild>
							<Link to="/search">View All Doctors</Link>
						</Button>
					</div>
				</div>
			</section>

			<section className="space-y-6 py-20 md:container">
				<h2 className="text-3xl font-extrabold md:text-5xl">
					Simple and Fast Booking Process
				</h2>
				<div className="flex flex-col-reverse md:flex-row">
					<div className="w-full md:w-2/3">
						<p className="mt-6 md:w-3/4">
							Schedule appointments with just a few clicks. Our streamlined
							booking system ensures you can find an available slot that fits
							your schedule without any hassle.
						</p>
						<p className="mt-6 md:w-3/4">
							Whether you&apos;re at home or on the go, our platform is fully
							responsive and accessible from any device. Book appointments
							whenever and wherever it&apos;s convenient for you.
						</p>
						<p className="mt-6 md:w-3/4">
							Keep track of your upcoming appointments, reschedule or cancel if
							needed, and receive reminders—all from your personalized
							dashboard.
						</p>
						<Button asChild className="mt-10">
							<Link to="/search">Book appointment now</Link>
						</Button>
					</div>
					<div className="flex-1">
						<img src="/images/health.png" alt="health" />
					</div>
				</div>
			</section>

			<Spacer size="xs" />
			<Reminder />
		</main>
	)
}
