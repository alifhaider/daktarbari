import { Link } from 'react-router'

const UserLinks = [
	{ to: '/appointments', label: 'Appointment History' },
	{ to: '/profile', label: 'Profile' },
	{ to: '/reviews', label: 'User Reviews' },
]

const CompanyLinks = [
	{ to: '/about', label: 'About' },
	{ to: '/press', label: 'Press' },
	{ to: '/policies', label: 'Policies' },
]

const LocationsLinks = [
	{ to: '/locations/bangladesh', label: 'Bangladesh' },
	{ to: '/locations/india', label: 'India' },
]

const ExploreLinks = [
	{ to: '/book', label: 'Book a Doctor' },
	{ to: '/trust-and-safety', label: 'Trust & Safety' },
	{ to: '/help', label: 'Get Help' },
]

export default function Footer() {
	return (
		<footer className="text-secondary-foreground container py-14">
			<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
				<FooterLinkSection title="User" links={UserLinks} />
				<FooterLinkSection title="DaktarBari" links={CompanyLinks} />
				<FooterLinkSection title="Locations" links={LocationsLinks} />
				<FooterLinkSection title="Explore" links={ExploreLinks} />
			</div>

			{/* Bottom Section */}
			<div className="mt-12 border-t border-gray-200 pt-8">
				<div className="flex flex-wrap items-center justify-between gap-6">
					<div className="flex flex-wrap space-x-6">
						<span className="text-sm">&copy; 2025 DaktarBari</span>
						<Link
							to="/terms"
							className="text-sm transition-all hover:text-cyan-400 hover:underline"
						>
							Terms
						</Link>
						<Link
							to="/privacy"
							className="text-sm transition-all hover:text-cyan-400 hover:underline"
						>
							Privacy
						</Link>
						<Link
							to="/sitemap"
							className="text-sm transition-all hover:text-cyan-400 hover:underline"
						>
							Sitemap
						</Link>
					</div>
					<div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:gap-6">
						<button className="text-sm transition-all hover:text-cyan-400 hover:underline">
							Cookie preferences
						</button>
						<button className="text-sm transition-all hover:text-cyan-400 hover:underline">
							Do not sell or share my personal information
						</button>
					</div>
				</div>
			</div>
		</footer>
	)
}

const FooterLinkSection = ({
	title,
	links,
}: {
	title: string
	links: { to: string; label: string }[]
}) => {
	return (
		<div>
			<h2 className="text-secondary-foreground mb-4 text-sm font-bold">
				{title}
			</h2>
			<ul className="space-y-2">
				{links.map((link) => (
					<li key={link.to}>
						<Link
							to={link.to}
							className="text-xs font-medium transition-all hover:text-cyan-400 hover:underline"
						>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
