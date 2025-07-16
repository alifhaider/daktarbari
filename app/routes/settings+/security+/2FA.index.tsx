import { generateTOTP } from '@epic-web/totp'
import { Link, redirect, useFetcher } from 'react-router'
import { Alert, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type VerificationTypes } from '#app/routes/_auth+/verify.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { twoFAVerifyVerificationType } from '../profile.two-factor.verify'
import { type Route } from './+types/2FA.index'

export const twoFAVerificationType = '2fa' satisfies VerificationTypes

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const verification = await prisma.verification.findUnique({
		where: { target_type: { type: twoFAVerificationType, target: userId } },
		select: { id: true },
	})
	return { is2FAEnabled: Boolean(verification) }
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const { otp: _otp, ...config } = await generateTOTP()
	const verificationData = {
		...config,
		type: twoFAVerifyVerificationType,
		target: userId,
	}
	await prisma.verification.upsert({
		where: {
			target_type: { target: userId, type: twoFAVerifyVerificationType },
		},
		create: verificationData,
		update: verificationData,
	})
	return redirect('/settings/security/2FA/verify')
}

export default function TwoFactorPage({ loaderData }: Route.ComponentProps) {
	const enable2FAFetcher = useFetcher<typeof action>()

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Icon name="shield" className="h-5 w-5" />
						Two-Factor Authentication
						{loaderData.is2FAEnabled && (
							<Badge variant="secondary" className="ml-2">
								Enabled
							</Badge>
						)}
					</CardTitle>

					<CardDescription className="text-muted-foreground">
						Add an extra layer of security to your account by requiring a
						verification code in addition to your password.
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					{!loaderData.is2FAEnabled ? (
						<>
							<Alert variant="destructive" className="w-max">
								<Icon name="triangle-alert" className="h-4 w-4" />
								<AlertTitle>
									Two-factor authentication is currently{' '}
									<strong>disabled</strong>. Your account is less secure without
									2FA.
								</AlertTitle>
							</Alert>

							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<Icon
										name="shield-check"
										className="mt-0.5 h-5 w-5 text-green-600"
									/>
									<div>
										<h3 className="font-semibold">Enhanced Security</h3>
										<p className="text-muted-foreground text-sm">
											Protect your account even if your password is compromised.
										</p>
									</div>
								</div>

								<div className="flex items-start gap-3">
									<Icon
										name="smartphone"
										className="mt-0.5 h-5 w-5 text-blue-600"
									/>
									<div>
										<h3 className="font-semibold">Authenticator App</h3>
										<p className="text-muted-foreground text-sm">
											Use{' '}
											<a className="underline" href="https://1password.com/">
												1Password
											</a>{' '}
											app to generate codes.
										</p>
									</div>
								</div>
							</div>
							<enable2FAFetcher.Form method="POST">
								<StatusButton
									type="submit"
									name="intent"
									value="enable"
									status={
										enable2FAFetcher.state === 'loading' ? 'pending' : 'idle'
									}
								>
									Enable Two-Factor Authentication
								</StatusButton>
							</enable2FAFetcher.Form>
						</>
					) : (
						<>
							<Alert className="w-max">
								<Icon name="shield-check" className="h-4 w-4" />
								<AlertTitle>
									Two-factor authentication is <strong>enabled</strong>. Your
									account is protected with an additional security layer.
								</AlertTitle>
							</Alert>

							<div className="space-y-4">
								<div className="rounded-lg border p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<Icon name="smartphone" className="h-5 w-5" />
											<div>
												<h3 className="font-semibold">Authenticator App</h3>
												<p className="text-muted-foreground text-sm">
													Configured on your mobile device
												</p>
											</div>
										</div>
										<Badge variant="outline">Active</Badge>
									</div>
								</div>

								<div className="flex gap-2">
									<Button asChild variant="destructive">
										<Link to="disable">Disable Two-Factor Authentication</Link>
									</Button>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
