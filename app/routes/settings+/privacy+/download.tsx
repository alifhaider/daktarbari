import { Link } from 'react-router'
import { Alert, AlertTitle } from '#app/components/ui/alert.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Checkbox } from '#app/components/ui/checkbox.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

const dataTypes = [
	{
		id: 'profile',
		label: 'Profile Information',
		description: 'Your personal details, contact information, and preferences',
		size: '2.3 KB',
	},
	{
		id: 'bookings',
		label: 'Booking History',
		description: 'All your past and current bookings, including receipts',
		size: '45.7 KB',
		disabled: true,
	},
	{
		id: 'payments',
		label: 'Payment Information',

		description:
			'Payment methods and transaction history (sensitive data masked)',
		size: '12.1 KB',
		disabled: true,
	},
	{
		id: 'preferences',
		label: 'App Preferences',
		description: 'Your settings, notifications, and customization choices',
		size: '1.8 KB',
		disabled: true,
	},
	{
		id: 'activity',
		label: 'Activity Logs',
		description: 'Login history and account activity (last 90 days)',
		size: '8.4 KB',
		disabled: true,
	},
]

export default function DownloadPage() {
	return (
		<div className="max-w-4xl">
			<div className="mb-6">
				<div className="mb-2 flex items-center gap-2">
					<Icon name="download" className="h-6 w-6" />
					<h1 className="text-2xl font-bold">Download Your Data</h1>
				</div>
				<p className="text-muted-foreground">
					Export a copy of your data from our booking platform. This includes
					all information associated with your account.
				</p>
			</div>

			<div className="space-y-6">
				<Alert>
					<Icon name="info" className="h-4 w-4" />
					<AlertTitle>
						Your data will be compiled into a PDF document. This process may
						take a few minutes for large datasets.
					</AlertTitle>
				</Alert>

				<div className="space-y-4">
					<h2 className="font-semibold">Select data to include:</h2>
					<div className="space-y-3">
						{dataTypes.map((dataType) => (
							<div
								key={dataType.id}
								className="flex items-start space-x-3 rounded-lg border p-4"
							>
								<Checkbox
									id={dataType.id}
									defaultChecked
									disabled={dataType.disabled}
								/>
								<div className="flex-1">
									<div className="flex items-center justify-between">
										<label
											htmlFor={dataType.id}
											className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>
											{dataType.label}
										</label>
										<span className="text-muted-foreground text-xs">
											{dataType.size}
										</span>
									</div>
									<p className="text-muted-foreground mt-1 text-xs">
										{dataType.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="bg-muted/50 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<Icon name="file-text" className="mt-0.5 h-5 w-5" />
						<div>
							<h3 className="font-semibold">Export Format</h3>
							<p className="text-muted-foreground text-sm">
								Your data will be exported as a comprehensive PDF document with
								all selected information organized by category.
							</p>
						</div>
					</div>
				</div>

				<div className="bg-muted/50 rounded-lg p-4">
					<div className="flex items-start gap-3">
						<Icon name="calendar" className="mt-0.5 h-5 w-5" />
						<div>
							<h3 className="font-semibold">Data Retention</h3>
							<p className="text-muted-foreground text-sm">
								This export includes data from the last 2 years. Older data may
								not be available due to our retention policies.
							</p>
						</div>
					</div>
				</div>

				<Button asChild>
					<Link
						reloadDocument
						download="my-daktarbari-data.pdf"
						to="/resources/download-user-data"
					>
						<Icon name="download" className="mr-2 h-4 w-4" />
						Generate & Download PDF
					</Link>
				</Button>
			</div>
		</div>
	)
}
