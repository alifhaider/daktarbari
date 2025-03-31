import { invariantResponse } from '@epic-web/invariant'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/$username'

export const meta = ({ data }: Route.MetaArgs) => {
	return [
		{ title: `${data?.user.username} / CH` },
		{ name: 'description', content: `CareHub ${data?.user.username} Profile!` },
	]
}

export async function loader({ request, params }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const page = url.searchParams.get('page')
	const user = await prisma.user.findFirst({
		select: {
			id: true,
			name: true,
			username: true,
			createdAt: true,
			image: { select: { id: true, objectKey: true } },
			doctor: {
				include: {
					_count: {
						select: { reviews: true },
					},
					specialties: { select: { id: true, name: true } },
					education: {
						select: {
							id: true,
							degree: true,
							institute: true,
							year: true,
						},
					},
					schedules: {
						include: {
							_count: {
								select: { bookings: true },
							},
							location: {
								select: {
									id: true,
									address: true,
									name: true,
									city: true,
									state: true,
									zip: true,
								},
							},
						},
					},
					reviews: {
						skip: page ? (parseInt(page) - 1) * 5 : 0,
						take: 5,
						select: {
							id: true,
							rating: true,
							comment: true,
							user: {
								select: {
									username: true,
									name: true,
								},
							},
							createdAt: true,
						},
					},
				},
			},
			bookings: {
				include: {
					schedule: {
						select: {
							createdAt: true,
							startTime: true,
							endTime: true,
							location: {
								select: {
									name: true,
									address: true,
									city: true,
									state: true,
									zip: true,
								},
							},
							depositAmount: true,
							serialFee: true,
							visitFee: true,
							discountFee: true,
						},
					},
				},
			},
		},
		where: {
			username: params.username,
		},
	})

	invariantResponse(user, 'User not found', { status: 404 })

	return { user, userJoinedDisplay: user.createdAt.toLocaleDateString() }
}

export default function DoctorRoute({ loaderData }: Route.ComponentProps) {
	const user = loaderData.user
	return <pre>{JSON.stringify(user, null, 2)}</pre>
}
