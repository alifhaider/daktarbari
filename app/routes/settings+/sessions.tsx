import { invariantResponse } from '@epic-web/invariant'
import { useFetcher } from 'react-router'
import { Spacer } from '#app/components/spacer.tsx'
import { Alert, AlertTitle } from '#app/components/ui/alert.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId, sessionKey } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { type Route } from './+types/sessions'

const signOutOfSessionsActionIntent = 'sign-out-of-sessions'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
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

	return { numberOfActiveSessions: user._count.sessions }
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	invariantResponse(
		sessionId,
		'You must be authenticated to sign out of other sessions',
	)
	await prisma.session.deleteMany({
		where: {
			userId,
			id: { not: sessionId },
		},
	})
	return { status: 'success' } as const
}

export default function Sessions({ loaderData }: Route.ComponentProps) {
	const dc = useDoubleCheck()
	const fetcher = useFetcher()

	const otherSessionsCount = loaderData.numberOfActiveSessions - 1

	return (
		<div className="max-w-4xl">
			<div className="mb-6">
				<div className="mb-2 flex items-center gap-2">
					<Icon name="monitor" className="h-6 w-6" />
					<h1 className="text-2xl font-bold">Active Sessions</h1>
				</div>
				<p className="text-muted-foreground">
					Manage your active login sessions across all devices. Sign out of
					sessions you don't recognize.
				</p>
			</div>

			<div className="space-y-6">
				<Alert>
					<Icon name="shield" className="h-4 w-4" />
					<AlertTitle>
						{otherSessionsCount > 0
							? `You have ${otherSessionsCount} other active session(s).`
							: "This is your only active session. You're currently signed in from this device only."}
					</AlertTitle>
				</Alert>

				{otherSessionsCount > 0 ? (
					<div className="space-y-4">
						<Spacer size="4xs" />
						<h2 className="font-semibold">Other Active Sessions</h2>
						<p className="text-muted-foreground">
							You have {otherSessionsCount} other active sessions. Signing out
							will log you out from all other devices.
						</p>
						<fetcher.Form method="POST">
							<StatusButton
								{...dc.getButtonProps({
									type: 'submit',
									name: 'intent',
									value: signOutOfSessionsActionIntent,
								})}
								variant={dc.doubleCheck ? 'destructive' : 'default'}
								status={
									fetcher.state !== 'idle'
										? 'pending'
										: (fetcher.data?.status ?? 'idle')
								}
							>
								<Icon name="log-out" className="mr-2 h-4 w-4" />
								{dc.doubleCheck
									? 'Are You Sure'
									: `Sign out of ${otherSessionsCount} sessions`}
							</StatusButton>
						</fetcher.Form>
					</div>
				) : (
					<div className="space-y-4">
						<h2 className="font-semibold">Other Active Sessions</h2>
						<p className="text-muted-foreground">
							This is your only active session. You are not signed in from any
							other devices.
						</p>
					</div>
				)}

				<Spacer size="4xs" />
				<div className="bg-muted/50 rounded-lg p-4">
					<h3 className="mb-2 font-semibold">Security Tips</h3>
					<ul className="text-muted-foreground space-y-1 text-sm">
						<li>
							• Regularly review your active sessions for suspicious activity.
						</li>
						<li>
							• Use strong, unique passwords and enable two-factor
							authentication.
						</li>
						<li>• Avoid signing in from public or shared computers.</li>
					</ul>
				</div>
			</div>
		</div>
	)
}
