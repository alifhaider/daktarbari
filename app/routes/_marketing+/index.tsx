import { getLocations } from '@prisma/client/sql'
import { motion } from 'framer-motion'
import { Img } from 'openimg/react'
import { Form, Link } from 'react-router'
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
import { getLocationImgSrc } from '#app/utils/misc.tsx'
import { type Route } from './+types'

export const meta: Route.MetaFunction = () => [{ title: 'Daktar Bari' }]

const fadeInUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.3, ease: 'easeInOut' },
}

const staggerContainer = {
	animate: {
		transition: {
			staggerChildren: 0.01,
			staggerDirection: 1,
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
		<>
			<section className="container mx-auto mt-10 flex flex-col gap-10 md:flex-row md:px-8">
				<div className="flex w-full flex-col items-center justify-between gap-12 md:flex-row">
					<motion.div
						initial="initial"
						animate="animate"
						className="w-full"
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
								className="bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand))]/80 font-semibold shadow-lg shadow-[hsl(var(--brand))]/20 hover:from-[hsl(var(--brand))]/90 hover:to-[hsl(var(--brand))]/70 hover:shadow-[hsl(var(--brand))]/30"
							>
								<Link to="/search">
									<Icon name="magnifying-glass" className="mr-2 h-5 w-5" />
									Find a Doctor
								</Link>
							</Button>
						</motion.div>
					</motion.div>

					<motion.div
						className="relative flex h-full w-full items-center justify-end"
						initial="initial"
						animate="animate"
						variants={fadeInUp}
					>
						<Img
							src="/img/hero-img.svg"
							alt="Healthcare professionals and patients"
							width={600}
							height="auto"
							className="rounded-2xl object-cover"
							isAboveFold
						/>
					</motion.div>
				</div>
			</section>

			<section className="bg-primary-foreground mt-20 w-full py-20">
				<div className="container mx-auto md:px-8">
					<h2 className="text-brand text-3xl font-extrabold md:text-5xl">
						Search for Top-Rated Doctors
					</h2>
					<p className="mt-6 md:w-3/4">
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

			<section className="container mx-auto py-10 md:px-8">
				<h4 className="font-bold">Browse by Locations</h4>
				<Carousel
					opts={{
						align: 'start',
					}}
					className="mx-auto"
				>
					<CarouselContent className="-ml-4 py-4">
						{loaderData.locations.map((location) => {
							console.log(location)
							return (
								<CarouselItem
									key={location.id}
									className="aspect-square h-full w-full basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/5"
								>
									<Form action="/search" method="GET">
										<input
											type="hidden"
											value={location.id}
											name="locationId"
										/>
										<button
											type="submit"
											className="h-full w-full cursor-pointer"
										>
											<Card className="flex">
												<CardContent className="flex flex-col items-start px-0 pb-6">
													<Img
														width="100%"
														fit="cover"
														height="auto"
														src={getLocationImgSrc(location.imageObjectKey)}
														className="w-full flex-1 rounded-t-md object-cover"
														isAboveFold
													/>
													<div className="mt-4 w-full space-y-1 px-2 text-start">
														<h6 className="font-semibold">{location.name}</h6>

														<span className="text-muted-foreground text-body-2xs line-clamp-1">
															{location.address}
														</span>

														<span className="text-muted-foreground text-body-2xs">
															Available{' '}
															<strong>
																{location.totalDoctors} Doctors
															</strong>{' '}
														</span>
													</div>
												</CardContent>
											</Card>
										</button>
									</Form>
								</CarouselItem>
							)
						})}
					</CarouselContent>
					<CarouselPrevious />
					<CarouselNext />
				</Carousel>
			</section>

			<section className="container mx-auto py-10 md:px-8">
				<h4 className="font-bold">Browse by Categories</h4>
				<Carousel
					opts={{
						align: 'start',
					}}
					className="mx-auto"
				>
					<CarouselContent className="-ml-4 py-4">
						{loaderData.locations.map((location) => {
							console.log(location)
							return (
								<CarouselItem
									key={location.id}
									className="h-full w-full basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/5"
								>
									<Form action="/search" method="GET">
										<input
											type="hidden"
											value={location.id}
											name="locationId"
										/>
										<button
											type="submit"
											className="h-full w-full cursor-pointer"
										>
											<Card className="flex">
												<CardContent className="flex flex-col items-start px-0 pb-6">
													<Img
														width="100%"
														fit="cover"
														height="auto"
														src={getLocationImgSrc(location.imageObjectKey)}
														className="w-full flex-1 rounded-t-md object-cover"
														isAboveFold
													/>
													<div className="mt-4 w-full space-y-1 px-2 text-start">
														<h6 className="font-semibold">{location.name}</h6>

														<span className="text-muted-foreground text-body-2xs line-clamp-1">
															{location.address}
														</span>

														<span className="text-muted-foreground text-body-2xs">
															Available{' '}
															<strong>
																{location.totalDoctors} Doctors
															</strong>{' '}
														</span>
													</div>
												</CardContent>
											</Card>
										</button>
									</Form>
								</CarouselItem>
							)
						})}
					</CarouselContent>
					<CarouselPrevious />
					<CarouselNext />
				</Carousel>
			</section>

			<section className="container space-y-6 py-20 md:px-8">
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
						<Img
							width={500}
							height="auto"
							src="/img/booking.svg"
							alt="health"
							className="h-full w-full"
							isAboveFold
						/>
					</div>
				</div>
			</section>

			<Spacer size="xs" />
			<Reminder />
		</>
	)
}
