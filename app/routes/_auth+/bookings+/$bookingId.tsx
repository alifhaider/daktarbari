import { invariantResponse } from '@epic-web/invariant'
import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'
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
import { type Route } from './+types/$bookingId'

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
			id: params.bookingId,
		},
	})

	invariantResponse(booking, 'Booking not found', { status: 404 })

	return { booking } as const
}

export default function ConfirmBooking({ loaderData }: Route.ComponentProps) {
	const { booking } = loaderData
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

	const visitFee = booking.schedule.visitFee ?? 0
	const serialFee = booking.schedule.serialFee ?? 0
	const discountFee = booking.schedule.discountFee ?? 0
	const depositAmount = booking.schedule.depositAmount ?? 0
	const totalAmount = visitFee + serialFee - discountFee
	const due = totalAmount - depositAmount
	const status = booking.status?.toLocaleLowerCase() ?? 'pending'

	const generateInvoicePDF = async () => {
		setIsGeneratingPDF(true)

		try {
			const doc = new jsPDF()

			// Add logo (if you have one)
			// const logoUrl = '/logo.png';
			// const logoData = await fetch(logoUrl).then(res => res.arrayBuffer());
			// doc.addImage(logoData, 'PNG', 10, 10, 30, 30);

			// Colors
			const primaryColor = [41, 128, 185] as const
			const secondaryColor = [52, 73, 94] as const
			const destructiveColor = [231, 76, 60] as const

			// Header
			doc.setFontSize(20)
			doc.setTextColor(...primaryColor)
			doc.setFont('helvetica', 'bold')
			doc.text('DAKTARBARI', 105, 20, { align: 'center' })

			doc.setFontSize(14)
			doc.setTextColor(...secondaryColor)
			doc.text('APPOINTMENT INVOICE', 105, 30, { align: 'center' })

			// Divider line
			doc.setDrawColor(...primaryColor)
			doc.setLineWidth(0.5)
			doc.line(20, 35, 190, 35)

			// Invoice Info (right aligned)
			doc.setFontSize(10)
			doc.setTextColor(40, 40, 40)
			doc.setFont('helvetica', 'normal')
			doc.text(`Invoice #: ${booking.id}`, 180, 45, { align: 'right' })
			doc.text(
				`Date: ${new Date(booking.createdAt).toLocaleDateString()}`,
				180,
				50,
				{ align: 'right' },
			)
			doc.text(`Status: ${booking.status?.toUpperCase()}`, 180, 55, {
				align: 'right',
			})

			// Patient and Doctor Info (two columns)
			doc.setFontSize(12)
			doc.setTextColor(...secondaryColor)
			doc.setFont('helvetica', 'bold')
			doc.text('PATIENT INFORMATION', 20, 70)
			doc.text('DOCTOR INFORMATION', 110, 70)

			doc.setFontSize(10)
			doc.setTextColor(40, 40, 40)
			doc.setFont('helvetica', 'normal')

			// Patient column
			doc.text(`Name: ${booking.name || 'N/A'}`, 20, 80)
			doc.text(`Phone: ${booking.phone || 'N/A'}`, 20, 85)
			doc.text(`Note: ${booking.note || 'N/A'}`, 20, 90)

			// Doctor column
			doc.text(
				`Name: ${booking.doctor.user.name || booking.doctor.user.username}`,
				110,
				80,
			)
			doc.text(
				`Specialties: ${booking.doctor.specialties.map((specialty) => specialty.name).join(', ') || 'N/A'}`,
				110,
				85,
			)
			doc.text(`Email: ${booking.doctor.user.email}`, 110, 90)

			// Appointment Details
			doc.setFontSize(12)
			doc.setTextColor(...secondaryColor)
			doc.setFont('helvetica', 'bold')
			doc.text('APPOINTMENT DETAILS', 20, 110)

			doc.setFontSize(10)
			doc.setTextColor(40, 40, 40)
			doc.setFont('helvetica', 'normal')

			const startTime = new Date(booking.schedule.startTime)
			const endTime = new Date(booking.schedule.endTime)

			doc.text(`Date: ${startTime.toLocaleDateString()}`, 20, 120)
			doc.text(
				`Time: ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
				20,
				125,
			)
			doc.text(`Location: ${booking.schedule.location.name}`, 20, 130)
			doc.text(
				`Address: ${[
					booking.schedule.location.address,
					booking.schedule.location.city,
					booking.schedule.location.state,
					booking.schedule.location.zip,
				]
					.filter(Boolean)
					.join(', ')}`,
				20,
				135,
			)

			// Billing Table
			doc.setFontSize(12)
			doc.setTextColor(...secondaryColor)
			doc.setFont('helvetica', 'bold')
			doc.text('BILLING DETAILS', 20, 155)

			// Table data
			const billingItems = [
				{ description: 'Serial Fee', amount: serialFee || 0 },
				{
					description: 'Discount',
					amount: -(booking.schedule.discountFee || 0),
				},
				{ description: 'Visit Fee', amount: visitFee || 0 },
				{
					description: 'Deposit Paid',
					amount: -(depositAmount || 0),
				},
			]
			// AutoTable for billing items
			autoTable(doc, {
				startY: 160,
				head: [['Description', 'Amount']],
				body: [
					...billingItems.map((item) => [
						item.description,
						`${item.amount.toFixed(2)}tk`,
					]),
					[
						{ content: 'TOTAL AMOUNT', styles: { fontStyle: 'bold' } },
						{
							content: `${totalAmount.toFixed(2)}tk`,
							styles: { fontStyle: 'bold' },
						},
					],
					[
						{
							content: 'REMAINING BALANCE',
							styles: { fontStyle: 'bold', textColor: [...destructiveColor] },
						},
						{
							content: `${due.toFixed(2)}tk`,
							styles: { fontStyle: 'bold', textColor: [...destructiveColor] },
						},
					],
				],
				theme: 'grid',
				headStyles: {
					fillColor: [...primaryColor],
					textColor: 255,
					fontStyle: 'bold',
				},
				columnStyles: {
					0: { cellWidth: 'auto' },
					1: { cellWidth: 40, halign: 'right' },
				},
				margin: { left: 20 },
			})

			// Footer
			doc.setFontSize(10)
			doc.setTextColor(100, 100, 100)
			doc.text(
				'Thank you for choosing our medical services.',
				20,
				(doc as any).lastAutoTable.finalY + 10,
			)
			doc.text(
				'Please bring this invoice to your appointment.',
				20,
				(doc as any).lastAutoTable.finalY + 20,
			)
			doc.text(
				'For any questions, please contact support@daktarbari.com',
				20,
				(doc as any).lastAutoTable.finalY + 25,
			)

			// Page border
			doc.setDrawColor(200, 200, 200)
			doc.setLineWidth(0.5)
			doc.rect(5, 5, 200, 287) // A4 size: 210x297, with 5mm margin

			// Save the PDF
			doc.save(`DaktarBari-Invoice-${booking.id}.pdf`)
		} catch (error) {
			console.error('Error generating PDF:', error)
		} finally {
			setIsGeneratingPDF(false)
		}
	}

	return (
		<div className="min-h-screen py-8">
			<div className="container mx-auto max-w-4xl px-4">
				{/* Success Header */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
						<Icon name="check" className="h-8 w-8 text-green-600" />
					</div>
					<h1 className="text-accent-foreground text-3xl font-bold">
						Booking Confirmed!
					</h1>
					<p className="text-primary mt-2">
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
										{booking.schedule.startTime.toLocaleDateString()}
									</p>
									<p className="text-accent-foreground text-sm">
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
									<p className="text-secondary text-sm">
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
								<div className="space-y-1">
									<p className="font-medium">
										{booking.doctor.user.name ?? booking.doctor.user.username}
									</p>
									<p className="text-secondary text-sm">
										{booking.doctor.specialties.length > 0 && (
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
										)}
									</p>
								</div>
							</div>

							<div className="flex gap-2">
								<Badge
									className="capitalize"
									variant={`${status === 'pending' ? 'secondary' : 'default'}`}
								>
									{status}
								</Badge>
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
								<p className="font-semibold">{booking.name}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500">Phone</p>
								<p className="font-semibold">{booking.phone}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-gray-500">Note</p>
								<p className="font-semibold">{booking.note}</p>
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
								<span>{serialFee}tk</span>
							</div>
							<div className="flex justify-between text-green-600">
								<span>Discount Applied</span>
								<span>-{discountFee}tk</span>
							</div>
							<div className="flex justify-between">
								<span>Visit Fee</span>
								<span>{visitFee}tk</span>
							</div>
							<div className="flex justify-between text-blue-600">
								<span>Deposit Paid</span>
								<span>{depositAmount}tk</span>
							</div>
							<Separator />
							<div className="flex justify-between font-semibold">
								<span>Total Amount</span>
								<span>{totalAmount}tk</span>
							</div>
							<Separator />
							<div className="flex justify-between font-semibold text-orange-600">
								<span>Due</span>
								<span>{due}tk</span>
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
				<Card className="bg-accent border-accent-foreground mt-6">
					<CardContent className="pt-6">
						<h3 className="text-accent-foreground mb-2 font-semibold">
							Important Notes:
						</h3>
						<ul className="text-accent-foreground space-y-1 text-sm">
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
