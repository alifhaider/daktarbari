import { Img } from 'openimg/react'
import { useRef } from 'react'
import { Link, Form } from 'react-router'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { useOptionalUser, useUser } from '#app/utils/user.ts'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	DropdownMenuItem,
} from './ui/dropdown-menu'
import { Icon } from './ui/icon'

export function UserDropdown() {
	const user = useOptionalUser()
	const doctor = false
	const formRef = useRef<HTMLFormElement>(null)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button asChild variant="secondary">
					<Icon name="hamburger-menu" className="text-body-md" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="end">
					{doctor ? (
						<DropdownMenuItem asChild>
							<Link prefetch="intent" to="/dashboard">
								<Icon className="text-body-md" name="dashboard">
									Dashboard
								</Icon>
							</Link>
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem asChild>
							<Link prefetch="intent" to="/doctors/join">
								<Icon className="text-body-md" name="doctor">
									Become a Doctor
								</Icon>
							</Link>
						</DropdownMenuItem>
					)}
					{user ? (
						<>
							<DropdownMenuItem asChild>
								<Link prefetch="intent" to={`/users/${user.username}`}>
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
									<Icon className="text-body-md" name="avatar">
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

					<DropdownMenuItem asChild>
						<Link to="/works">
							<Icon className="text-body-md" name="avatar">
								How it works
							</Icon>
						</Link>
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
