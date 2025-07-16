import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { getTOTPAuthUri } from '@epic-web/totp'
import * as QRCode from 'qrcode'
import React from 'react'
import { data, Form, redirect, useNavigation } from 'react-router'
import { z } from 'zod'
import { ErrorList, OTPField } from '#app/components/forms.tsx'
import { Alert, AlertDescription } from '#app/components/ui/alert.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { isCodeValid } from '#app/routes/_auth+/verify.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getDomainUrl, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/2FA.verify'
import { twoFAVerificationType } from './2FA.index'

const CancelSchema = z.object({ intent: z.literal('cancel') })
const VerifySchema = z.object({
	intent: z.literal('verify'),
	code: z.string().min(6).max(6),
})

const ActionSchema = z.discriminatedUnion('intent', [
	CancelSchema,
	VerifySchema,
])

export const twoFAVerifyVerificationType = '2fa-verify'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const verification = await prisma.verification.findUnique({
		where: {
			target_type: { type: twoFAVerifyVerificationType, target: userId },
		},
		select: {
			id: true,
			algorithm: true,
			secret: true,
			period: true,
			digits: true,
		},
	})
	if (!verification) {
		return redirect('/settings/security/2FA')
	}
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { email: true },
	})
	const issuer = new URL(getDomainUrl(request)).host
	const otpUri = getTOTPAuthUri({
		...verification,
		accountName: user.email,
		issuer,
	})
	const qrCode = await QRCode.toDataURL(otpUri)
	return { otpUri, qrCode }
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: () =>
			ActionSchema.superRefine(async (data, ctx) => {
				if (data.intent === 'cancel') return null
				const codeIsValid = await isCodeValid({
					code: data.code,
					type: twoFAVerifyVerificationType,
					target: userId,
				})
				if (!codeIsValid) {
					ctx.addIssue({
						path: ['code'],
						code: z.ZodIssueCode.custom,
						message: `Invalid code`,
					})
					return z.NEVER
				}
			}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	switch (submission.value.intent) {
		case 'cancel': {
			await prisma.verification.deleteMany({
				where: { type: twoFAVerifyVerificationType, target: userId },
			})
			return redirect('/settings/profile/two-factor')
		}
		case 'verify': {
			await prisma.verification.update({
				where: {
					target_type: { type: twoFAVerifyVerificationType, target: userId },
				},
				data: { type: twoFAVerificationType },
			})
			return redirectWithToast('/settings/profile/two-factor', {
				type: 'success',
				title: 'Enabled',
				description: 'Two-factor authentication has been enabled.',
			})
		}
	}
}

export default function TwoFactorVerify({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const navigation = useNavigation()
	const [copied, setCopied] = React.useState(false)

	const isPending = useIsPending()
	const pendingIntent = isPending ? navigation.formData?.get('intent') : null

	const [form, fields] = useForm({
		id: 'verify-form',
		constraint: getZodConstraint(ActionSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ActionSchema })
		},
	})
	const lastSubmissionIntent = fields.intent.value

	const handleCopy = async () => {
		await navigator.clipboard.writeText(loaderData.otpUri)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const url = new URL(loaderData.otpUri)
	const secret = url.searchParams.get('secret')
	return (
		<div className="max-w-2xl">
			<div className="mb-6">
				<div className="mb-2 flex items-center gap-2">
					<Icon name="shield" className="h-6 w-6" />
					<h1 className="text-2xl font-bold">
						Enable Two-Factor Authentication
					</h1>
				</div>
				<p className="text-muted-foreground">
					Secure your account with an additional layer of protection
				</p>
			</div>

			<div className="space-y-8">
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Badge
							variant="outline"
							className="flex h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
						>
							1
						</Badge>
						<h2 className="text-lg font-semibold">Scan QR Code</h2>
					</div>

					<div className="bg-muted/30 rounded-lg p-6">
						<div className="flex flex-col items-center space-y-4">
							<div className="border-border flex h-64 w-64 items-center justify-center rounded-lg border-2 bg-white">
								<img
									alt="qr code"
									src={loaderData.qrCode}
									className="h-56 w-56"
								/>
							</div>
							<p className="text-muted-foreground max-w-md text-center text-sm">
								Scan this QR code with your authenticator app such as Google
								Authenticator, Authy, or 1Password.
							</p>
						</div>
					</div>
				</div>

				{/* Step 2: Manual Entry */}
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Badge
							variant="outline"
							className="flex h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
						>
							2
						</Badge>
						<h2 className="text-lg font-semibold">
							Can't scan? Enter manually
						</h2>
					</div>

					<div className="bg-muted/30 rounded-lg p-4">
						<p className="text-muted-foreground mb-3 text-sm">
							If you cannot scan the QR code, you can manually add this account
							to your authenticator app using this code:
						</p>
						<div className="bg-background flex items-center gap-2 rounded border p-3 font-mono text-sm">
							<code className="flex-1 break-all">{secret}</code>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleCopy}
								className="h-8 w-8 p-0"
							>
								{copied ? (
									<Icon name="check" className="h-4 w-4" />
								) : (
									<Icon name="copy" className="h-4 w-4" />
								)}
							</Button>
						</div>
					</div>
				</div>

				{/* Step 3: Verification */}
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Badge
							variant="outline"
							className="flex h-6 w-6 items-center justify-center rounded-full p-0 text-xs"
						>
							3
						</Badge>
						<h2 className="text-lg font-semibold">Enter verification code</h2>
					</div>

					<div className="space-y-4">
						<p className="text-muted-foreground text-sm">
							Once you've added the account, enter the 6-digit code from your
							authenticator app below.
						</p>
						<Form method="POST" {...getFormProps(form)} className="flex-1">
							<div className="flex items-center justify-center">
								<OTPField
									labelProps={{
										htmlFor: fields.code.id,
										children: 'Code',
									}}
									inputProps={{
										...getInputProps(fields.code, { type: 'text' }),
										autoFocus: true,
										autoComplete: 'one-time-code',
									}}
									errors={fields.code.errors}
								/>
							</div>
							<div className="min-h-[32px] px-4 pt-1 pb-3">
								<ErrorList id={form.errorId} errors={form.errors} />
							</div>
							<div className="flex justify-between gap-4">
								<StatusButton
									className="w-full"
									status={
										pendingIntent === 'verify'
											? 'pending'
											: lastSubmissionIntent === 'verify'
												? (form.status ?? 'idle')
												: 'idle'
									}
									type="submit"
									name="intent"
									value="verify"
								>
									Submit
								</StatusButton>
								<StatusButton
									className="w-full"
									variant="secondary"
									status={
										pendingIntent === 'cancel'
											? 'pending'
											: lastSubmissionIntent === 'cancel'
												? (form.status ?? 'idle')
												: 'idle'
									}
									type="submit"
									name="intent"
									value="cancel"
									disabled={isPending}
								>
									Cancel
								</StatusButton>
							</div>
						</Form>
					</div>
				</div>

				{/* Important Notice */}
				<Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
					<Icon name="shield" className="h-4 w-4" />
					<AlertDescription>
						<span>
							<strong>Important:</strong>{' '}
							<span>
								Once you enable 2FA, you will need to enter a code from your
								authenticator app every time you log in or perform important
								actions.
							</span>
						</span>
						<strong className="mt-1 block">
							Do not lose access to your authenticator app, or you will lose
							access to your account.
						</strong>
					</AlertDescription>
				</Alert>
			</div>
		</div>
	)
}
