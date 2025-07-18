import { type FieldMetadata, getInputProps } from '@conform-to/react'
import { type DoctorSpecialty } from '@prisma/client'
import clsx from 'clsx'
import { useCombobox } from 'downshift'
import { Img } from 'openimg/react'
import { useId } from 'react'
import { data, useFetcher, useSearchParams } from 'react-router'
import { useSpinDelay } from 'spin-delay'
import { Spinner } from '#app/components/spinner.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { type Route } from './+types/specialty-combobox'

// TODO: 1. spinner is not visible
//       2. when user types in the input, the specialtyId is not removed from the searchParams

export async function loader({ request }: Route.LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const query = searchParams.get('specialty')?.toLocaleLowerCase()
	const specialties = await prisma.doctorSpecialty.findMany({
		where: { name: { contains: query } },
		distinct: ['name'],
	})

	return data({ items: specialties })
}

export function SpecialtyCombobox({
	field,
	selectedSpecialty,
}: {
	field: FieldMetadata
	selectedSpecialty?: Pick<DoctorSpecialty, 'id' | 'name'> | null
}) {
	const [searchParams, setSearchParams] = useSearchParams()
	const specialtyFetcher = useFetcher<typeof loader>()
	const id = useId()

	const items = specialtyFetcher.data?.items ?? []
	const cb = useCombobox<Pick<DoctorSpecialty, 'id' | 'name'>>({
		id,
		items,
		itemToString: (item) => (item ? item.name : ''),
		onInputValueChange: async (changes) => {
			await specialtyFetcher.submit(
				{ query: changes.inputValue ?? '' },
				{ method: 'get', action: '/resources/specialty-combobox' },
			)

			if (!changes.inputValue) {
				setSearchParams((prev) => {
					const newSearchParams = new URLSearchParams(prev)
					newSearchParams.delete('specialtyId')
					return newSearchParams
				})
			}
		},
		initialSelectedItem: selectedSpecialty,
		onSelectedItemChange: (changes) => {
			const newSearchParams = new URLSearchParams(searchParams)
			if (changes.selectedItem?.id) {
				newSearchParams.set('specialtyId', changes.selectedItem.id)
			} else {
				newSearchParams.delete('specialtyId')
			}
			setSearchParams(newSearchParams)
		},
	})

	const displayMenu = cb.isOpen && items.length > 0
	const menuClassName =
		'absolute z-10 mt-4 min-w-[448px] max-h-[336px] bg-background shadow-lg rounded-sm w-full overflow-y-scroll'

	const busy = specialtyFetcher.state !== 'idle'
	const showSpinner = useSpinDelay(busy, {
		delay: 150,
		minDuration: 300,
	})
	return (
		<div className="relative max-w-[350px] flex-1">
			<div className="flex w-full max-w-[350px] flex-1 items-center gap-4 border-b">
				<label htmlFor={id} className="text-brand">
					Which
				</label>
				<div className="relative w-full">
					<input
						className="relative w-full bg-transparent outline-hidden"
						{...cb.getInputProps({
							id,
							placeholder: 'Cardiologist, Dentist...',
						})}
					/>
					<div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center">
						<Spinner showSpinner={showSpinner} />
					</div>
				</div>
			</div>

			<ul
				{...cb.getMenuProps({
					className: clsx(menuClassName, { hidden: !displayMenu }),
				})}
			>
				{displayMenu
					? items.map((item, index) => (
							<li
								className="group-hover:text-brand group my-2 cursor-pointer py-1"
								key={item.id}
								{...cb.getItemProps({ item: item, index })}
							>
								<div
									className={`flex w-full items-center gap-6 rounded-sm border border-transparent px-2 py-2 transition-all ${
										cb.highlightedIndex === index
											? 'border-brand text-brand'
											: ''
									}`}
								>
									<Img
										src={item.image ?? '/img/placeholder.png'}
										width={100}
										height={100}
										alt={item.name}
										className="h-10 w-10 rounded-sm object-cover"
									/>
									<div className="flex flex-col">
										<strong>{item.name}</strong>
										<span className="text-muted-foreground group-hover:text-brand text-xs">
											{item.description}
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
		</div>
	)
}
