import { startRegistration } from '@simplewebauthn/browser'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'
import { Form, useRevalidator } from 'react-router'
import { z } from 'zod'
import { Spacer } from '#app/components/spacer.tsx'
import { Alert, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/passkeys'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const passkeys = await prisma.passkey.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			deviceType: true,
			createdAt: true,
		},
	})
	return { passkeys }
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'delete') {
		const passkeyId = formData.get('passkeyId')
		if (typeof passkeyId !== 'string') {
			return Response.json(
				{ status: 'error', error: 'Invalid passkey ID' },
				{ status: 400 },
			)
		}

		await prisma.passkey.delete({
			where: {
				id: passkeyId,
				userId, // Ensure the passkey belongs to the user
			},
		})
		return Response.json({ status: 'success' })
	}

	return Response.json(
		{ status: 'error', error: 'Invalid intent' },
		{ status: 400 },
	)
}

const RegistrationOptionsSchema = z.object({
	options: z.object({
		rp: z.object({
			id: z.string(),
			name: z.string(),
		}),
		user: z.object({
			id: z.string(),
			name: z.string(),
			displayName: z.string(),
		}),
		challenge: z.string(),
		pubKeyCredParams: z.array(
			z.object({
				type: z.literal('public-key'),
				alg: z.number(),
			}),
		),
		authenticatorSelection: z
			.object({
				authenticatorAttachment: z
					.enum(['platform', 'cross-platform'])
					.optional(),
				residentKey: z
					.enum(['required', 'preferred', 'discouraged'])
					.optional(),
				userVerification: z
					.enum(['required', 'preferred', 'discouraged'])
					.optional(),
				requireResidentKey: z.boolean().optional(),
			})
			.optional(),
	}),
}) satisfies z.ZodType<{ options: PublicKeyCredentialCreationOptionsJSON }>

export default function PasskeysPage({ loaderData }: Route.ComponentProps) {
	const revalidator = useRevalidator()
	const [error, setError] = useState<string | null>(null)

	async function handlePasskeyRegistration() {
		try {
			setError(null)
			const resp = await fetch('/webauthn/registration')
			const jsonResult = await resp.json()
			const parsedResult = RegistrationOptionsSchema.parse(jsonResult)

			const regResult = await startRegistration({
				optionsJSON: parsedResult.options,
			})

			const verificationResp = await fetch('/webauthn/registration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(regResult),
			})

			if (!verificationResp.ok) {
				throw new Error('Failed to verify registration')
			}

			void revalidator.revalidate()
		} catch (err) {
			console.error('Failed to create passkey:', err)
			setError('Failed to create passkey. Please try again.')
		}
	}

	return (
		<div className="max-w-4xl">
			<div className="mb-6">
				<div className="mb-2 flex items-center gap-2">
					<Icon name="key" className="h-6 w-6" />
					<h1 className="text-2xl font-bold">Manage Passkeys</h1>
				</div>
				<p className="text-muted-foreground">
					Passkeys provide a secure, passwordless way to sign in using
					biometrics or security keys.
				</p>
			</div>

			<div className="space-y-6">
				<Alert>
					<Icon name="info" className="h-4 w-4" />
					<AlertTitle>
						Passkeys use your device's built-in security features like Face ID,
						Touch ID, or Windows Hello for authentication.
					</AlertTitle>
				</Alert>

				<Spacer size="4xs" />

				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Your Passkeys</h2>
					<form action={handlePasskeyRegistration}>
						<Button type="submit">
							<Icon name="plus" className="mr-2 h-4 w-4" />
							Register New Passkey
						</Button>
					</form>
				</div>
				{error ? (
					<div className="bg-destructive/15 text-destructive rounded-lg p-4">
						{error}
					</div>
				) : null}

				<ul className="space-y-3">
					{loaderData.passkeys.map((passkey) => (
						<li
							key={passkey.id}
							className="flex items-center justify-between rounded-lg border p-4"
						>
							<div className="flex items-center gap-3">
								<Icon name="lock-closed" />

								<div>
									<h4 className="font-semibold">
										{passkey.deviceType === 'platform'
											? 'Device'
											: 'Security Key'}
									</h4>
									<div className="text-muted-foreground flex items-center gap-2 text-sm">
										<span>
											Registered{' '}
											{formatDistanceToNow(new Date(passkey.createdAt))} ago
										</span>
										<span>•</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Badge variant="outline">Active</Badge>
								<Form method="POST">
									<input type="hidden" name="passkeyId" value={passkey.id} />
									<Button
										type="submit"
										name="intent"
										value="delete"
										variant="destructive"
										size="sm"
										className="flex items-center gap-2"
									>
										<Icon name="trash">Delete</Icon>
									</Button>
								</Form>
							</div>
						</li>
					))}
				</ul>

				{loaderData.passkeys.length === 0 && (
					<div className="bg-muted/50 rounded-lg border py-8 text-center">
						<Icon
							name="key"
							className="text-muted-foreground mx-auto mb-4 h-12 w-12"
						/>
						<h3 className="mb-2 text-lg font-semibold">
							No passkeys registered
						</h3>
						<p className="text-muted-foreground mb-4">
							Register your first passkey to enable secure, passwordless
							authentication.
						</p>
						<Button className="mt-4">
							<Icon name="plus" className="mr-2 h-4 w-4" />
							Register Your First Passkey
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
