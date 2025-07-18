import { useRef } from 'react'
import { Link, Form } from 'react-router'
import { ThemeSwitch } from '#app/routes/resources+/theme-switch.tsx'
import { type Theme } from '#app/utils/theme.server.ts'
import { useOptionalUser } from '#app/utils/user.ts'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	DropdownMenuItem,
} from './ui/dropdown-menu'
import { Icon } from './ui/icon'
import { Separator } from './ui/separator'

export function UserDropdown({
	userPreference,
}: {
	userPreference?: Theme | null
}) {
	const user = useOptionalUser()
	const doctor = false
	const formRef = useRef<HTMLFormElement>(null)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="secondary"
					className="flex gap-0.5 px-2 py-0.5"
					size="sm"
				>
					<Icon name="menu" className="text-body-md h-4 w-4" />
					<Icon name="avatar" className="text-body-md h-4 w-4" />
					<span className="sr-only">User menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent
					sideOffset={8}
					align="end"
					className="space-y-1 py-2"
				>
					{user ? (
						<>
							<DropdownMenuItem asChild>
								<Link prefetch="intent" to={`/profiles/${user.username}`}>
									<Icon className="text-body-md" name="avatar">
										Profile
									</Icon>
								</Link>
							</DropdownMenuItem>
							<Form action="/logout" method="POST" ref={formRef}>
								<DropdownMenuItem asChild>
									<button type="submit" className="w-full">
										<Icon className="text-body-md" name="exit">
											Logout
										</Icon>
									</button>
								</DropdownMenuItem>
							</Form>
						</>
					) : (
						<>
							<DropdownMenuItem asChild>
								<Link prefetch="intent" to="/login">
									<Icon className="text-body-md" name="log-in">
										Login
									</Icon>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link prefetch="intent" to="/signup">
									<Icon className="text-body-md" name="avatar">
										Signup
									</Icon>
								</Link>
							</DropdownMenuItem>
						</>
					)}

					{doctor ? (
						<DropdownMenuItem asChild>
							<Link prefetch="intent" to="/dashboard">
								<Icon className="text-body-md" name="layout-dashboard">
									Dashboard
								</Icon>
							</Link>
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem asChild>
							<Link prefetch="intent" to="/doctors/join">
								<Icon className="text-body-md" name="stethoscope">
									Become a Doctor
								</Icon>
							</Link>
						</DropdownMenuItem>
					)}

					<Separator className="my-2" />

					<DropdownMenuItem asChild>
						<Link to="/works">
							<Icon className="text-body-md" name="brain-cog">
								How it works
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link to="/help">
							<Icon className="text-body-md" name="headset">
								Contact Support
							</Icon>
						</Link>
					</DropdownMenuItem>

					<Separator className="my-2" />

					<DropdownMenuItem asChild>
						<ThemeSwitch userPreference={userPreference} />
					</DropdownMenuItem>

					{/* <DropdownMenuItem asChild>
						<Link
							to={`/users/${user.username}`}
							// this is for progressive enhancement
							onClick={(e) => e.preventDefault()}
							className="flex items-center gap-2"
						>
							<Img
								className="h-8 w-8 rounded-full object-cover"
								alt={user.name ?? user.username}
								src={getUserImgSrc(user.image?.objectKey)}
								width={256}
								height={256}
							/>
							<span className="text-body-sm font-bold">
								{user.name ?? user.username}
							</span>
						</Link>
					</DropdownMenuItem> */}
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}
