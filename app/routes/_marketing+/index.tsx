import { getLocations } from '@prisma/client/sql'
import { motion } from 'framer-motion'
import { Image } from 'openimg/react'
import { Form, Link } from 'react-router'
import healthImg from '#app/assets/images/health.png'
import Reminder from '#app/components/reminder.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '#app/components/ui/carousel.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types'

export const meta: Route.MetaFunction = () => [{ title: 'Daktar Bari' }]

const fadeInUp = {
	initial: { opacity: 0, y: 60 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6 },
}

const staggerContainer = {
	animate: {
		transition: {
			staggerChildren: 0.1,
		},
	},
}

// const faqs = [
// 	{
// 		question: 'How do I book an appointment?',
// 		answer:
// 			"Simply search for doctors by specialty or location, select your preferred doctor and available time slot, then confirm your booking. You'll receive a confirmation with all details.",
// 	},
// 	{
// 		question: 'What are the consultation fees?',
// 		answer:
// 			"Consultation fees vary by doctor and specialty. You pay only 90% of the doctor's fee - we deduct our 10% service charge from the doctor's payment, not from you.",
// 	},
// 	{
// 		question: 'Can I cancel or reschedule my appointment?',
// 		answer:
// 			'Yes, you can cancel or reschedule appointments up to 2 hours before the scheduled time through your dashboard or by calling our support team.',
// 	},
// 	{
// 		question: 'How do doctors set their schedules?',
// 		answer:
// 			'Doctors can create flexible schedules - weekly recurring (e.g., every Saturday-Monday), monthly recurring, or one-time appointments. They have full control over their availability.',
// 	},
// 	{
// 		question: 'Is my medical information secure?',
// 		answer:
// 			'Absolutely. We use bank-level encryption and follow strict medical privacy standards to protect all your personal and medical information.',
// 	},
// ]

export async function loader() {
	const locations = await prisma.$queryRawTyped(getLocations())
	return { locations }
}

export default function Index({ loaderData }: Route.ComponentProps) {
	return (
		<main className="font-poppins grid h-full place-items-center">
			<Spacer size="xs" />
			<section className="mx-auto flex flex-col gap-10 md:container md:flex-row">
				<div className="grid items-center gap-12 px-2 md:px-3 lg:grid-cols-2">
					<motion.div
						initial="initial"
						animate="animate"
						variants={staggerContainer}
					>
						<motion.h1
							className="mb-6 text-4xl font-bold lg:text-6xl"
							variants={fadeInUp}
						>
							Your Health, <br />
							<span className="from-brand to-brand/70 ml-16 bg-gradient-to-r bg-clip-text text-transparent md:ml-32">
								Our Priority
							</span>
						</motion.h1>
						<motion.p
							className="text-muted-foreground mb-8 max-w-2xl text-xl"
							variants={fadeInUp}
						>
							Connect with qualified doctors across Bangladesh. Book
							appointments easily, manage your health records, and get the care
							you deserve.
						</motion.p>
						<motion.div
							className="flex flex-col gap-4 sm:flex-row"
							variants={fadeInUp}
						>
							<Button
								asChild
								size="lg"
								className="bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand))]/80 shadow-lg hover:from-[hsl(var(--brand))]/90 hover:to-[hsl(var(--brand))]/70"
							>
								<Link to="/search">
									<Icon name="magnifying-glass" className="mr-2 h-5 w-5" />
									Find a Doctor
								</Link>
							</Button>
						</motion.div>
					</motion.div>

					<motion.div
						className="relative"
						initial="initial"
						animate="animate"
						variants={fadeInUp}
					>
						<Image
							src="/img/hero-img.jpg"
							alt="Healthcare professionals and patients"
							width={600}
							height={500}
							className="rounded-2xl shadow-2xl"
						/>
					</motion.div>
				</div>
			</section>

			<section className="bg-primary-foreground mt-20 w-full px-8 py-20">
				<div className="container">
					<h2 className="text-brand text-3xl font-extrabold md:text-5xl">
						Search for Top-Rated Doctors
					</h2>
					<p className="mt-6 w-3/4">
						Browse through a comprehensive list of certified and experienced
						doctors across various specialties. Read patient reviews and ratings
						to choose the best healthcare professional for your needs.
					</p>

					<div className="mt-8 flex items-center justify-center">
						<Button asChild>
							<Link to="/search">View All Doctors</Link>
						</Button>
					</div>
				</div>
			</section>

			<section className="space-y-6 py-20 md:container">
				<h4 className="font-bold">Browse by Locations</h4>
				<Carousel
					opts={{
						align: 'start',
					}}
					className="mx-auto w-full"
				>
					<CarouselContent>
						{loaderData.locations.map((location) => (
							<CarouselItem
								key={location.id}
								className="md:basis-1/3 lg:basis-1/5"
							>
								<Form action="/search" method="GET">
									<input type="hidden" value={location.id} name="locationId" />
									<button type="submit">
										<Card>
											<CardContent className="flex aspect-square flex-col items-center pb-6">
												<Image
													width={200}
													height={200}
													src={location.images?.[0] ?? 'as'}
													className="flex-1"
												/>
												<span className="font-semibold">{location.name}</span>
											</CardContent>
										</Card>
									</button>
								</Form>
							</CarouselItem>
						))}
					</CarouselContent>
					<CarouselPrevious />
					<CarouselNext />
				</Carousel>
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
						<Image width={500} height={500} src={healthImg} alt="health" />
					</div>
				</div>
			</section>

			<Spacer size="xs" />
			<Reminder />
		</main>
	)
}
