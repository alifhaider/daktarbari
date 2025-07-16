import { Link, Outlet, useLocation } from 'react-router'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '#app/components/ui/breadcrumb.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { type IconName } from '@/icon-name'

const navigationItems = [
	{
		title: 'Account',
		items: [
			{
				title: 'Profile Information',
				href: '/settings/account',
				icon: 'user',
				description: 'Update your personal details',
			},
		],
	},
	{
		title: 'Security',
		items: [
			{
				title: 'Change Email',
				href: '/settings/security/change-email',
				icon: 'shield',
				description: 'Update your email address',
			},
			{
				title: 'Two-Factor Authentication',
				href: '/settings/security/two-factor',
				icon: 'lock',
				description: 'Secure your account with 2FA',
			},
			{
				title: 'Change Password',
				href: '/settings/security/change-password',
				icon: 'key',
				description: 'Update your password',
			},
			{
				title: 'Manage Passkeys',
				href: '/settings/security/passkeys',
				icon: 'key',
				description: 'Biometric and security keys',
			},
		],
	},
	{
		title: 'Privacy & Data',
		items: [
			{
				title: 'Download Your Data',
				href: '/settings/privacy/download-data',
				icon: 'download',
				description: 'Export your account data',
			},
		],
	},
	{
		title: 'Sessions',
		items: [
			{
				title: 'Active Sessions',
				href: '/settings/sessions',
				icon: 'monitor',
				description: 'Manage your login sessions',
			},
		],
	},
	{
		title: 'Danger Zone',
		items: [
			{
				title: 'Delete Account',
				href: '/settings/delete-account',
				icon: 'trash-2',
				description: 'Permanently delete your account',
			},
		],
	},
]

function SettingsNavigation() {
	const { pathname } = useLocation()

	return (
		<nav className="space-y-6">
			{navigationItems.map((section) => (
				<div key={section.title}>
					<h3 className="text-muted-foreground mb-2 px-2 text-sm font-semibold">
						{section.title}
					</h3>
					<div className="space-y-1">
						{section.items.map((item) => {
							const isActive = pathname === item.href

							return (
								<Link
									key={item.href}
									to={item.href}
									className={`hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
										isActive
											? 'bg-accent text-accent-foreground'
											: 'text-muted-foreground'
									}`}
								>
									<Icon name={item.icon as IconName} />
									<div className="flex-1">
										<div className="font-medium">{item.title}</div>
										<div className="text-muted-foreground text-xs">
											{item.description}
										</div>
									</div>
								</Link>
							)
						})}
					</div>
				</div>
			))}
		</nav>
	)
}

function SettingsBreadcrumb() {
	const { pathname } = useLocation()
	const segments = pathname.split('/').filter(Boolean)

	const getBreadcrumbTitle = (segment: string, index: number) => {
		const path = '/' + segments.slice(0, index + 1).join('/')
		const item = navigationItems
			.flatMap((section) => section.items)
			.find((item) => item.href === path)

		if (item) return item.title

		// Fallback formatting
		return segment
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
	}

	return (
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
				</BreadcrumbItem>
				{segments.slice(1).map((segment, index) => (
					<div key={segment} className="flex items-center">
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							{index === segments.length - 2 ? (
								<BreadcrumbPage>
									{getBreadcrumbTitle(segment, index + 1)}
								</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									href={`/${segments.slice(0, index + 2).join('/')}`}
								>
									{getBreadcrumbTitle(segment, index + 1)}
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</div>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	)
}

export default function SettingsLayout() {
	return (
		<div className="bg-background min-h-screen">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Settings</h1>
						<p className="text-muted-foreground">
							Manage your account settings and preferences
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm">
							<Icon name="download" className="mr-2 h-4 w-4" />
							Download Data
						</Button>
					</div>
				</div>

				<SettingsBreadcrumb />

				<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
					<Card className="p-4 lg:col-span-1">
						<SettingsNavigation />
					</Card>

					<div className="lg:col-span-3">
						<Outlet />
					</div>
				</div>
			</div>
		</div>
	)
}
