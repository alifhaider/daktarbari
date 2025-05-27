import { invariantResponse } from '@epic-web/invariant'
import jsPDF from 'jspdf'
import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { type MetaFunction } from 'react-router'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/confirm-booking'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Confirm Booking / DB' },
		{ name: 'description', content: 'Confirm booking from DaktarBari' },
	]
}

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserId(request)
	const booking = await prisma.booking.findUnique({
		select: {
			id: true,
			name: true,
			phone: true,
			note: true,
			status: true,
			createdAt: true,
			schedule: {
				select: {
					startTime: true,
					endTime: true,
					serialFee: true,
					discountFee: true,
					depositAmount: true,
					visitFee: true,
					location: {
						select: {
							name: true,
							address: true,
							city: true,
							state: true,
							zip: true,
						},
					},
				},
			},
			doctor: {
				include: {
					specialties: {
						select: {
							id: true,
							name: true,
						},
					},
					user: {
						select: {
							id: true,
							name: true,
							username: true,
							email: true,
						},
					},
				},
			},
		},
		where: {
			id: params.scheduleId,
		},
	})

	invariantResponse(booking, 'Booking not found', { status: 404 })

	return { booking } as const
}

export default function ConfirmBooking({ loaderData }: Route.ComponentProps) {
	const { booking } = loaderData
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

	const generateInvoicePDF = async () => {
		setIsGeneratingPDF(true)

		try {
			const doc = new jsPDF()

			// Header
			doc.setFontSize(20)
			doc.setTextColor(40, 40, 40)
			doc.text('MEDICAL APPOINTMENT INVOICE', 20, 30)

			// Invoice details
			doc.setFontSize(12)
			doc.text(`Invoice #: ${booking.id}`, 20, 50)
			doc.text(`Date: ${booking.createdAt.toLocaleDateString()}`, 20, 60)
			doc.text(`Status: ${booking.status?.toUpperCase()}`, 20, 70)

			// Patient Information
			doc.setFontSize(14)
			doc.text('PATIENT INFORMATION', 20, 90)
			doc.setFontSize(10)
			doc.text(`Name: ${booking.name}`, 20, 105)
			doc.text(`Phone: ${booking.phone}`, 20, 125)
			doc.text(`Email: ${booking.note}`, 20, 115)

			// Doctor Information
			doc.setFontSize(14)
			doc.text('DOCTOR INFORMATION', 20, 145)
			doc.setFontSize(10)
			doc.text(
				`Name: ${booking.doctor.user.name ?? booking.doctor.user.username}`,
				20,
				160,
			)
			doc.text(
				`Specialization: ${booking.doctor.specialties.join(', ')}`,
				20,
				170,
			)
			doc.text(`Email: ${booking.doctor.user.email}`, 20, 180)

			// Appointment Details
			doc.setFontSize(14)
			doc.text('APPOINTMENT DETAILS', 20, 200)
			doc.setFontSize(10)
			doc.text(
				`Date: ${booking.schedule.startTime.toLocaleDateString()}`,
				20,
				215,
			)
			doc.text(
				`Time: ${booking.schedule.startTime.toLocaleTimeString()} - ${booking.schedule.endTime.toLocaleTimeString()}`,
				20,
				225,
			)
			doc.text(`Location: ${booking.schedule.location.name}`, 20, 235)
			doc.text(
				`Address: ${booking.schedule.location.address}, ${booking.schedule.location.city}, ${booking.schedule.location.state} ${booking.schedule.location.zip}`,
				20,
				245,
			)

			// Billing Information
			doc.setFontSize(14)
			doc.text('BILLING INFORMATION', 20, 265)
			doc.setFontSize(10)
			doc.text(`Serial Fee: $${booking.schedule.serialFee}`, 20, 280)
			doc.text(`Discount: -$${booking.schedule.discountFee}`, 20, 290)
			doc.text(`Visit Fee: $${booking.schedule.visitFee}`, 20, 300)
			doc.text(`Deposit Paid: $${booking.schedule.depositAmount}`, 20, 310)

			// Total
			doc.setFontSize(12)
			doc.text(`TOTAL AMOUNT: $${booking.schedule.visitFee}`, 20, 325)
			doc.text(
				`REMAINING BALANCE: $${(booking.schedule.visitFee ?? 0) - (booking.schedule.depositAmount ?? 0)}`,
				20,
				335,
			)

			// Footer
			doc.setFontSize(8)
			doc.text('Thank you for choosing our medical services.', 20, 360)
			doc.text('Please bring this invoice to your appointment.', 20, 370)

			// Save the PDF
			doc.save(`invoice-${booking.id}.pdf`)
		} catch (error) {
			console.error('Error generating PDF:', error)
		} finally {
			setIsGeneratingPDF(false)
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="container mx-auto max-w-4xl px-4">
				{/* Success Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
						<Icon name="check" className="h-8 w-8 text-green-600" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900">
						Booking Confirmed!
					</h1>
					<p className="mt-2 text-gray-600">
						Your appointment has been successfully scheduled
					</p>
				</div>

				<div className="grid gap-6 lg:grid-cols-2">
					{/* Booking Details */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="h-5 w-5" />
								Appointment Details
							</CardTitle>
							<CardDescription>Booking ID: {booking.id}</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-3">
								<Icon name="clock" className="h-8 w-8 text-green-600" />
								<div>
									<p className="font-medium">
										{booking.schedule.startTime.toLocaleTimeString()}
									</p>
									<p className="text-sm text-gray-600">
										{booking.schedule.startTime.toLocaleTimeString()} -{' '}
										{booking.schedule.endTime.toLocaleTimeString()}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<Icon name="map-pin" className="h-4 w-4 text-gray-500" />
								<div>
									<p className="font-medium">
										{booking.schedule.location.name}
									</p>
									<p className="text-sm text-gray-600">
										{booking.schedule.location.address}
										<br />
										{booking.schedule.location.city},{' '}
										{booking.schedule.location.state}{' '}
										{booking.schedule.location.zip}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<Icon name="avatar" className="h-4 w-4 text-gray-500" />
								<div>
									<p className="font-medium">
										{booking.doctor.user.name ?? booking.doctor.user.username}
									</p>
									<p className="text-sm text-gray-600">
										{booking.doctor.specialties.length > 0 && (
											<div className="flex items-center gap-1">
												<Icon
													name="stethoscope"
													className="text-primary h-3 w-3"
												/>
												<ul className="text-muted-foreground flex items-center gap-1 text-xs">
													{booking.doctor.specialties.map((specialty) => (
														<li
															key={specialty.id}
															className="bg-muted text-accent-foreground rounded-md px-1 py-0.5 text-xs"
														>
															{specialty.name}
														</li>
													))}
												</ul>
											</div>
										)}
									</p>
								</div>
							</div>

							<div className="flex gap-2">
								<Badge variant="default">Confirmed</Badge>
								<Badge variant="default">Paid</Badge>
							</div>
						</CardContent>
					</Card>

					{/* Patient Information */}
					<Card>
						<CardHeader>
							<CardTitle>Patient Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="text-sm font-medium text-gray-500">Name</p>
								<p className="font-medium">{booking.name}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500">Phone</p>
								<p className="font-medium">{booking.phone}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500">Note</p>
								<p className="font-medium">{booking.note}</p>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Billing Information */}
				<Card className="mt-6">
					<CardHeader>
						<CardTitle>Billing Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="flex justify-between">
								<span>Serial Fee</span>
								<span>${booking.schedule.serialFee}</span>
							</div>
							<div className="flex justify-between text-green-600">
								<span>Discount Applied</span>
								<span>-${booking.schedule.discountFee}</span>
							</div>
							<div className="flex justify-between">
								<span>Visit Fee</span>
								<span>${booking.schedule.visitFee}</span>
							</div>
							<div className="flex justify-between text-blue-600">
								<span>Deposit Paid</span>
								<span>${booking.schedule.depositAmount}</span>
							</div>
							<Separator />
							<div className="flex justify-between font-semibold">
								<span>Total Amount</span>
								<span>${booking.schedule.visitFee}</span>
							</div>
							<div className="flex justify-between font-semibold text-orange-600">
								<span>Remaining Balance</span>
								<span>
									$
									{(booking.schedule.visitFee ?? 0) -
										(booking.schedule.depositAmount ?? 0)}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Action Buttons */}
				<div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
					<Button
						onClick={generateInvoicePDF}
						disabled={isGeneratingPDF}
						className="flex items-center gap-2"
					>
						{isGeneratingPDF ? (
							<>
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								Generating PDF...
							</>
						) : (
							<>
								<Icon name="download" className="h-4 w-4" />
								Download Invoice PDF
							</>
						)}
					</Button>

					<Button variant="outline" className="flex items-center gap-2">
						<Icon name="file-text" className="h-4 w-4" />
						Email Confirmation
					</Button>
				</div>

				{/* Important Notes */}
				<Card className="mt-6 border-blue-200 bg-blue-50">
					<CardContent className="pt-6">
						<h3 className="mb-2 font-semibold text-blue-900">
							Important Notes:
						</h3>
						<ul className="space-y-1 text-sm text-blue-800">
							<li>
								• Please arrive 15 minutes before your scheduled appointment
								time
							</li>
							<li>• Bring a valid ID and insurance card</li>
							<li>
								• The remaining balance of $
								{(booking.schedule.visitFee ?? 0) -
									(booking.schedule.depositAmount ?? 0)}{' '}
								is due at the time of service
							</li>
							<li>• Cancellations must be made at least 24 hours in advance</li>
						</ul>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
