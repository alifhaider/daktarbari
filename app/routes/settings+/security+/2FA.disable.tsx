import { Link, useFetcher } from 'react-router'
import { Alert, AlertTitle } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireRecentVerification } from '#app/routes/_auth+/verify.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/2FA.disable'
import { twoFAVerificationType } from './2FA.index'

export async function loader({ request }: Route.LoaderArgs) {
	await requireRecentVerification(request)
	const userId = await requireUserId(request)
	const verification = await prisma.verification.findUnique({
		where: { target_type: { type: twoFAVerificationType, target: userId } },
		select: { id: true },
	})

	const is2FAEnabled = Boolean(verification)
	if (!is2FAEnabled) {
		return redirectWithToast('/settings/security/2FA', {
			title: '2FA Not Enabled',
			type: 'error',
			description:
				'Two factor authentication is not currently enabled on your account.',
		})
	}
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	await requireRecentVerification(request)
	const userId = await requireUserId(request)
	await prisma.verification.delete({
		where: { target_type: { target: userId, type: twoFAVerificationType } },
	})
	return redirectWithToast('/settings/profile/2FA', {
		title: '2FA Disabled',
		description: 'Two factor authentication has been disabled.',
	})
}

export default function TwoFactorDisable() {
	const disable2FAFetcher = useFetcher<typeof action>()
	const dc = useDoubleCheck()
	return (
		<div className="max-w-2xl">
			<div className="mb-6">
				<div className="mb-2 flex items-center gap-2">
					<Icon name="shield-off" className="text-destructive h-6 w-6" />
					<h1 className="text-2xl font-bold">
						Disable Two-Factor Authentication
					</h1>
					<Badge variant="destructive" className="ml-2">
						Not Recommended
					</Badge>
				</div>
				<p className="text-muted-foreground">
					Remove the additional security layer from your account. This will make
					your account more vulnerable to unauthorized access.
				</p>
			</div>

			<div className="space-y-8">
				{/* Current Status */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Current Security Status</h2>

					<div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
						<div className="flex items-center gap-3">
							<Icon name="shield" className="h-5 w-5 text-green-600" />
							<div>
								<h3 className="font-semibold text-green-800 dark:text-green-200">
									Two-Factor Authentication Enabled
								</h3>
								<p className="text-sm text-green-700 dark:text-green-300">
									Your account is currently protected with 2FA using your
									authenticator app.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Security Risks Warning */}
				<div className="space-y-4">
					<h2 className="text-destructive text-lg font-semibold">
						Security Risks of Disabling 2FA
					</h2>

					<Alert className="border-destructive/50">
						<Icon name="triangle-alert" className="h-4 w-4" />
						<AlertTitle>
							<strong>Warning:</strong> Disabling two-factor authentication
							significantly reduces your account security.
						</AlertTitle>
					</Alert>

					<div className="space-y-3">
						<div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-lg border p-4">
							<Icon name="key" className="text-destructive mt-0.5 h-5 w-5" />
							<div>
								<h4 className="text-destructive font-semibold">
									Password-Only Protection
								</h4>
								<p className="text-muted-foreground text-sm">
									Your account will only be protected by your password, making
									it vulnerable if your password is compromised.
								</p>
							</div>
						</div>

						<div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-lg border p-4">
							<Icon
								name="triangle-alert"
								className="text-destructive mt-0.5 h-5 w-5"
							/>
							<div>
								<h4 className="text-destructive font-semibold">
									Increased Risk of Unauthorized Access
								</h4>
								<p className="text-muted-foreground text-sm">
									Attackers who obtain your password through phishing, data
									breaches, or other means will have full access to your
									account.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Alternative Solutions */}
				<div className="space-y-4">
					<h2 className="text-lg font-semibold">Consider These Alternatives</h2>

					<div className="bg-muted/50 rounded-lg p-4">
						<h3 className="mb-3 font-semibold">
							Before disabling 2FA, consider:
						</h3>
						<ul className="text-muted-foreground space-y-2 text-sm">
							<li className="flex items-start gap-2">
								<span className="text-primary">•</span>
								<span>
									<strong>Add a backup authenticator:</strong> Set up 2FA on
									multiple devices or apps
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary">•</span>
								<span>
									<strong>Use passkeys:</strong> Consider setting up passkeys as
									an alternative security method
								</span>
							</li>
							<li className="flex items-start gap-2">
								<span className="text-primary">•</span>
								<span>
									<strong>Contact support:</strong> If you're having issues with
									2FA, our support team can help
								</span>
							</li>
						</ul>
					</div>

					<div className="flex gap-2">
						<Button asChild variant="outline">
							<Link to="/settings/security/passkeys">
								<Icon name="key" className="mr-2 h-4 w-4" />
								Set Up Passkeys
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/help">
								<Icon name="shield" className="mr-2 h-4 w-4" />
								Contact Support
							</Link>
						</Button>
					</div>
				</div>

				{/* Disable Action */}
				<div className="border-destructive/20 space-y-4 border-t pt-4">
					<h2 className="text-destructive text-lg font-semibold">
						Disable Two-Factor Authentication
					</h2>

					<p className="text-muted-foreground text-sm">
						If you still want to proceed with disabling 2FA, you'll need to
						verify your identity and acknowledge the security risks.
					</p>
					<disable2FAFetcher.Form method="POST">
						<StatusButton
							variant="destructive"
							status={
								disable2FAFetcher.state === 'loading' ? 'pending' : 'idle'
							}
							{...dc.getButtonProps({
								className: 'mx-auto',
								name: 'intent',
								value: 'disable',
								type: 'submit',
							})}
						>
							<Icon name="shield-off" className="mr-2 h-4 w-4" />
							{dc.doubleCheck ? (
								<span>Are You sure?</span>
							) : (
								<span>I Understand the Risks - Disable 2FA</span>
							)}
						</StatusButton>
					</disable2FAFetcher.Form>
				</div>
			</div>
		</div>
	)
}
