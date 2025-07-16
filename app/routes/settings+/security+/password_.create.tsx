import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { data, Form, Link, redirect } from 'react-router'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Alert, AlertTitle } from '#app/components/ui/alert.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	checkIsCommonPassword,
	getPasswordHash,
	requireUserId,
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { PasswordAndConfirmPasswordSchema } from '#app/utils/user-validation.ts'
import { type Route } from './+types/password_.create'

const CreatePasswordForm = PasswordAndConfirmPasswordSchema

async function requireNoPassword(userId: string) {
	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})
	if (password) {
		throw redirect('/settings/security/password')
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	await requireNoPassword(userId)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	await requireNoPassword(userId)
	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		async: true,
		schema: CreatePasswordForm.superRefine(async ({ password }, ctx) => {
			const isCommonPassword = await checkIsCommonPassword(password)
			if (isCommonPassword) {
				ctx.addIssue({
					path: ['password'],
					code: 'custom',
					message: 'Password is too common',
				})
			}
		}),
	})
	if (submission.status !== 'success') {
		return data(
			{
				result: submission.reply({
					hideFields: ['password', 'confirmPassword'],
				}),
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { password } = submission.value

	await prisma.user.update({
		select: { username: true },
		where: { id: userId },
		data: {
			password: {
				create: {
					hash: await getPasswordHash(password),
				},
			},
		},
	})

	return redirect(`/settings/profile`, { status: 302 })
}

export default function PasswordCreate({ actionData }: Route.ComponentProps) {
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'password-create-form',
		constraint: getZodConstraint(CreatePasswordForm),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreatePasswordForm })
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
						labelProps={{ children: 'New Password' }}
						inputProps={{
							...getInputProps(fields.password, { type: 'password' }),
							autoComplete: 'new-password',
							placeholder: 'Enter your new password',
						}}
						errors={fields.password.errors}
					/>
					<Field
						labelProps={{ children: 'Confirm New Password' }}
						inputProps={{
							...getInputProps(fields.confirmPassword, {
								type: 'password',
							}),
							placeholder: 'Confirm your new password',
							autoComplete: 'new-password',
						}}
						errors={fields.confirmPassword.errors}
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
						Create Password
					</StatusButton>
				</div>
			</Form>
		</div>
	)
}
