import { Link } from 'react-router'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { type Route } from './+types/index.ts'

export const meta: Route.MetaFunction = () => [{ title: 'Daktar Bari' }]

export default function Index() {
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
					<h2 className="text-3xl font-extrabold md:text-5xl">
						Search for Top-Rated Doctors
					</h2>
					<p className="mt-6 w-3/4">
						Browse through a comprehensive list of certified and experienced
						doctors across various specialties. Read patient reviews and ratings
						to choose the best healthcare professional for your needs.
					</p>
					{/* <ul className="mt-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
						{users.map(({ id, username, doctor, fullName }) => (
							<UserCard
								key={id}
								username={username}
								doctor={doctor}
								fullName={fullName}
							/>
						))}
					</ul> */}

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
						<Button className="mt-10">Book Appointment Now</Button>
					</div>
					<div className="flex-1">
						<img src="/images/health.png" alt="health" />
					</div>
				</div>
			</section>
		</main>
	)
}
