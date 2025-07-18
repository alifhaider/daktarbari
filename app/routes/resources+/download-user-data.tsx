import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getDomainUrl, getUserImgSrc } from '#app/utils/misc.tsx'
import { type Route } from './+types/download-user-data.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		// this is one of the *few* instances where you can use "include" because
		// the goal is to literally get *everything*. Normally you should be
		// explicit with "select". We're using select for images because we don't
		// want to send back the entire blob of the image. We'll send a URL they can
		// use to download it instead.
		include: {
			image: {
				select: {
					id: true,
					createdAt: true,
					updatedAt: true,
					objectKey: true,
				},
			},
			// notes: {
			// 	include: {
			// 		images: {
			// 			select: {
			// 				id: true,
			// 				createdAt: true,
			// 				updatedAt: true,
			// 				objectKey: true,
			// 			},
			// 		},
			// 	},
			// },
			password: false, // <-- intentionally omit password
			sessions: true,
			roles: true,
		},
	})

	const domain = getDomainUrl(request)

	return Response.json({
		user: {
			...user,
			image: user.image
				? {
						...user.image,
						url: domain + getUserImgSrc(user.image.objectKey),
					}
				: null,
			// notes: user.notes.map((note) => ({
			// 	...note,
			// 	images: note.images.map((image) => ({
			// 		...image,
			// 		url: domain + getNoteImgSrc(image.objectKey),
			// 	})),
			// })),
		},
	})
}
