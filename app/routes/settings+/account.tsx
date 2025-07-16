import { invariantResponse } from '@epic-web/invariant'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useUser } from '#app/utils/user.ts'
import { twoFAVerificationType } from './profile.two-factor.tsx'
import { data, Form, useFetcher } from 'react-router'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { NameSchema, UsernameSchema } from '#app/utils/user-validation.ts'
import { z } from 'zod'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { type Route } from './+types/account.ts'

const ProfileFormSchema = z.object({
	name: NameSchema.nullable().default(null),
	username: UsernameSchema,
})

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			image: {
				select: { objectKey: true },
			},
			_count: {
				select: {
					sessions: {
						where: {
							expirationDate: { gt: new Date() },
						},
					},
				},
			},
		},
	})

	const twoFactorVerification = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { type: twoFAVerificationType, target: userId } },
	})

	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})

	return {
		user,
		hasPassword: Boolean(password),
		isTwoFactorEnabled: Boolean(twoFactorVerification),
	}
}

const profileUpdateActionIntent = 'update-profile'

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	switch (intent) {
		case profileUpdateActionIntent: {
			return profileUpdateAction({ request, userId, formData })
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

type ProfileActionArgs = {
	request: Request
	userId: string
	formData: FormData
}

async function profileUpdateAction({ userId, formData }: ProfileActionArgs) {
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ProfileFormSchema.superRefine(async ({ username }, ctx) => {
			const existingUsername = await prisma.user.findUnique({
				where: { username },
				select: { id: true },
			})
			if (existingUsername && existingUsername.id !== userId) {
				ctx.addIssue({
					path: ['username'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this username',
				})
			}
		}),
	})
	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { username, name } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			name: name,
			username: username,
		},
	})

	return {
		result: submission.reply(),
	}
}

export default function AccountSettings({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'edit-profile',
		constraint: getZodConstraint(ProfileFormSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProfileFormSchema })
		},
		defaultValue: {
			username: loaderData.user.username,
			name: loaderData.user.name,
		},
	})
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Profile Information</CardTitle>
					<CardDescription>
						Update your personal details and contact information. This
						information will be used for your bookings and account verification.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<Form method="POST" {...getFormProps(form)}>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Field
									labelProps={{
										htmlFor: fields.username.id,
										children: 'Username',
									}}
									inputProps={getInputProps(fields.username, { type: 'text' })}
									errors={fields.username.errors}
								/>
							</div>
							<Field
								labelProps={{ htmlFor: fields.name.id, children: 'Name' }}
								inputProps={getInputProps(fields.name, { type: 'text' })}
								errors={fields.name.errors}
							/>
						</div>

						<ErrorList errors={form.errors} id={form.errorId} />

						<div className="flex justify-start">
							<StatusButton
								type="submit"
								name="intent"
								value={profileUpdateActionIntent}
								status={isPending ? 'pending' : (form.status ?? 'idle')}
								disabled={isPending}
							>
								Save changes
							</StatusButton>
						</div>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
