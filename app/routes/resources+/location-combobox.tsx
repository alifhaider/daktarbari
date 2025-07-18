import { getInputProps, type FieldMetadata } from '@conform-to/react'
import { type ScheduleLocation } from '@prisma/client'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { useId } from 'react'
import { data, Link, useFetcher, useSearchParams } from 'react-router'
import { useSpinDelay } from 'spin-delay'
import { ErrorList } from '#app/components/forms.tsx'
import { Spinner } from '#app/components/spinner.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.tsx'
import { type Route } from './+types/location-combobox'

// TODO: 1. spinner is not visible
//       2. when user types in the input, the locationId is not removed from the searchParams

export async function loader({ request }: Route.LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('query')?.toLocaleLowerCase()
	const locations = await prisma.scheduleLocation.findMany({
		where: {
			OR: [
				{ name: { contains: query } },
				{ address: { contains: query } },
				{ city: { contains: query } },
				{ state: { contains: query } },
				{ zip: { contains: query } },
			],
		},
		select: {
			id: true,
			name: true,
			address: true,
		},
		distinct: ['name', 'address', 'city', 'state', 'zip'],
	})
	return data({ items: locations })
}

export function LocationCombobox({
	field,
	selectedLocation,
	variant = 'default',
}: {
	field: FieldMetadata
	selectedLocation?: Omit<ScheduleLocation, 'createdAt' | 'updatedAt'> | null
	variant?: 'search' | 'default'
}) {
	const [searchParams, setSearchParams] = useSearchParams()
	const locationFetcher = useFetcher<typeof loader>()
	const id = useId()

	const items = locationFetcher.data?.items ?? []

	const cb = useCombobox<Pick<ScheduleLocation, 'id' | 'name' | 'address'>>({
		id,
		items,
		itemToString: (item) => (item ? item.name : ''),
		initialSelectedItem: selectedLocation,
		onInputValueChange: async ({ inputValue }) => {
			// TODO: remove locationId from searchParams when user changes input value of location-combobox

			// if (variant === 'search' && searchParams.has('locationId')) {
			// 	const newParams = new URLSearchParams(searchParams)
			// 	newParams.delete('locationId')
			// 	setSearchParams(newParams)
			// }
			if (inputValue) {
				await locationFetcher.submit(
					{ query: inputValue ?? '' },
					{ method: 'get', action: '/resources/location-combobox' },
				)
			} else {
				setSearchParams((prev) => {
					const newParams = new URLSearchParams(prev)
					newParams.delete('locationId')
					return newParams
				})
			}
		},
		onSelectedItemChange: ({ selectedItem }) => {
			if (variant !== 'search') return
			const newSearchParams = new URLSearchParams(searchParams)
			if (selectedItem?.id) {
				newSearchParams.set('locationId', selectedItem.id)
			} else {
				newSearchParams.delete('locationId')
			}
			setSearchParams(newSearchParams)
		},
	})

	const displayMenu = cb.isOpen && items.length > 0
	const menuClassName =
		'absolute z-10 mt-4 min-w-[448px] max-h-[336px] bg-background shadow-lg rounded-sm w-full overflow-y-scroll'

	const busy = locationFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	const errorId = field.errors?.length ? `${id}-error` : undefined

	return (
		<div className="relative max-w-[350px] flex-1">
			{variant === 'default' ? (
				<div className="group relative space-y-2">
					<Label htmlFor={id}>Location</Label>
					<div className="relative">
						<Input
							aria-invalid={errorId ? true : undefined}
							aria-describedby={errorId}
							className="relative caret-black outline-hidden"
							{...cb.getInputProps({ id, placeholder: 'Choose a location' })}
						/>
						<div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center">
							<Spinner showSpinner={showSpinner} />
						</div>
					</div>
				</div>
			) : (
				<div className="flex w-full max-w-[350px] flex-1 items-center gap-4 border-b">
					<label htmlFor={id} className="text-brand">
						Where
					</label>
					<div className="relative w-full">
						<input
							aria-invalid={errorId ? true : undefined}
							aria-describedby={errorId}
							className="relative w-full bg-transparent outline-hidden"
							{...cb.getInputProps({
								id,
								placeholder: 'District, Division or Zip Code',
							})}
						/>
						<div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center">
							{/* TODO: spinner is not visible */}
							<Spinner showSpinner={showSpinner} />
						</div>
					</div>
				</div>
			)}

			<ul
				{...cb.getMenuProps({
					className: clsx(menuClassName, { hidden: !displayMenu }),
				})}
			>
				{displayMenu
					? items.map((item, index) => (
							<li
								className="hover:text-brand group my-2 cursor-pointer py-1"
								key={item.id}
								{...cb.getItemProps({ item: item, index })}
							>
								<div
									className={cn(
										'hover:bg-muted flex w-full items-center gap-2 rounded-sm border border-transparent px-2 py-2 transition-all',
										{
											'border-brand text-brand': cb.highlightedIndex === index,
										},
									)}
								>
									<div className="flex flex-col">
										<strong>{item.name}</strong>
										<span className="text-muted-foreground group-hover:text-brand mb-0.5 text-xs">
											{item.address}
										</span>
									</div>
								</div>
							</li>
						))
					: null}
			</ul>
			<input
				{...getInputProps(field, { type: 'hidden' })}
				value={cb.selectedItem?.id}
			/>

			{variant === 'search' ? null : (
				<>
					<div className="min-h-4">
						<ErrorList errors={field.errors} />
					</div>
					<p className="mt-0.5 text-xs">
						<strong>Hint:</strong> If you don&apos;t see the location
						you&apos;re looking for, try typing or{' '}
						<Link className="underline" to="/add/location">
							add a new location
						</Link>
						.
					</p>
				</>
			)}
		</div>
	)
}
