import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { data, Form, redirect, Link } from 'react-router'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Alert, AlertTitle } from '#app/components/ui/alert.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	checkIsCommonPassword,
	getPasswordHash,
	requireUserId,
	verifyUserPassword,
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { PasswordSchema } from '#app/utils/user-validation.ts'
import { type Route } from './+types/password'

const ChangePasswordForm = z
	.object({
		currentPassword: PasswordSchema,
		newPassword: PasswordSchema,
		confirmNewPassword: PasswordSchema,
	})
	.superRefine(({ confirmNewPassword, newPassword }, ctx) => {
		if (confirmNewPassword !== newPassword) {
			ctx.addIssue({
				path: ['confirmNewPassword'],
				code: z.ZodIssueCode.custom,
				message: 'The passwords must match',
			})
		}
	})

async function requirePassword(userId: string) {
	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})
	if (!password) {
		throw redirect('/settings/security/password/create')
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	await requirePassword(userId)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	await requirePassword(userId)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		async: true,
		schema: ChangePasswordForm.superRefine(
			async ({ currentPassword, newPassword }, ctx) => {
				if (currentPassword && newPassword) {
					const user = await verifyUserPassword({ id: userId }, currentPassword)
					if (!user) {
						ctx.addIssue({
							path: ['currentPassword'],
							code: z.ZodIssueCode.custom,
							message: 'Incorrect password.',
						})
					}
					const isCommonPassword = await checkIsCommonPassword(newPassword)
					if (isCommonPassword) {
						ctx.addIssue({
							path: ['newPassword'],
							code: 'custom',
							message: 'Password is too common',
						})
					}
				}
			},
		),
	})
	if (submission.status !== 'success') {
		return data(
			{
				result: submission.reply({
					hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { newPassword } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				update: {
					hash: await getPasswordHash(newPassword),
				},
			},
		},
	})

	return redirectWithToast(
		'/settings/account',
		{
			type: 'success',
			title: 'Password Changed',
			description: 'Your password has been changed.',
		},
		{ status: 302 },
	)
}

export default function ChangePasswordPage({
	actionData,
}: Route.ComponentProps) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'password-change-form',
		constraint: getZodConstraint(ChangePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ChangePasswordForm })
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="max-w-2xl">
			<div className="mb-6">
				<div className="mb-2 flex items-center gap-2">
					<Icon name="key" className="h-6 w-6" />
					<h1 className="text-2xl font-bold">Change Password</h1>
				</div>
				<p className="text-muted-foreground">
					Update your password to keep your account secure. Choose a strong
					password that you haven't used elsewhere.
				</p>
			</div>
			<Form method="POST" {...getFormProps(form)} className="space-y-4">
				<Alert>
					<Icon name="info" className="h-4 w-4" />
					<AlertTitle>
						Your password must be at least 8 characters long and include a mix
						of letters, numbers, and symbols.
					</AlertTitle>
				</Alert>

				<div>
					<Field
						labelProps={{ children: 'Current Password' }}
						inputProps={{
							...getInputProps(fields.currentPassword, { type: 'password' }),
							autoComplete: 'current-password',
							placeholder: 'Enter your current password',
						}}
						errors={fields.currentPassword.errors}
					/>
					<Field
						labelProps={{ children: 'New Password' }}
						inputProps={{
							...getInputProps(fields.newPassword, { type: 'password' }),
							autoComplete: 'new-password',
							placeholder: 'Enter your new password',
						}}
						errors={fields.newPassword.errors}
					/>
					<Field
						labelProps={{ children: 'Confirm New Password' }}
						inputProps={{
							...getInputProps(fields.confirmNewPassword, {
								type: 'password',
							}),
							placeholder: 'Confirm your new password',
							autoComplete: 'new-password',
						}}
						errors={fields.confirmNewPassword.errors}
					/>
				</div>
				<ErrorList id={form.errorId} errors={form.errors} />

				<div className="bg-muted/50 rounded-lg p-4">
					<h3 className="mb-2 font-semibold">Password Requirements:</h3>
					<ul className="text-muted-foreground space-y-1 text-sm">
						<li>• At least 8 characters long</li>
						<li>• Contains uppercase and lowercase letters</li>
						<li>• Includes at least one number</li>
						<li>• Has at least one special character (!@#$%^&*)</li>
					</ul>
				</div>

				<div className="grid w-full grid-cols-2 gap-6">
					<Button variant="secondary" asChild>
						<Link to="..">Cancel</Link>
					</Button>
					<StatusButton
						type="submit"
						className="font-semibold"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
					>
						Change Password
					</StatusButton>
				</div>
			</Form>
		</div>
	)
}
