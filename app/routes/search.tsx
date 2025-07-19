import { type FieldMetadata, getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { type DoctorSpecialty, type ScheduleLocation } from '@prisma/client'
import { searchDoctors } from '@prisma/client/sql'
import { SlidersHorizontal } from 'lucide-react'
import { Img } from 'openimg/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	data,
	Form,
	Link,
	useFetcher,
	useNavigation,
	useSearchParams,
} from 'react-router'
import { useVirtual } from 'react-virtual'
import { z } from 'zod'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { UserDropdown } from '#app/components/user-dropdown.tsx'
import { Logo } from '#app/root.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	getUserImgSrc,
	parseDoctor,
	useDelayedIsPending,
} from '#app/utils/misc.tsx'
import { getTheme } from '#app/utils/theme.server.ts'
import { type Route } from './+types/search'
import { LocationCombobox } from './resources+/location-combobox'
import { SpecialtyCombobox } from './resources+/specialty-combobox'

//TODO: Get the count of total doctors from the searchDoctors sql query
// TODO: Clicking theme button repeats the doctors list with more than 20 items

export const SearchPageSchema = z.object({
	name: z.string().optional(),
	locationId: z.string().optional(),
	specialtyId: z.string().optional(),
})

const LIMIT = 5
const DATA_OVERSCAN = 5

const getStartLimit = (searchParams: URLSearchParams) => ({
	start: Number(searchParams.get('start') || '0'),
	limit: Number(searchParams.get('limit') || LIMIT.toString()),
})

export async function loader({ request }: Route.LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const nameQuery = searchParams.get('name') ?? ''
	const specialtiesQuery = searchParams.get('specialtyId') ?? ''
	const locationQuery = searchParams.get('locationId') ?? ''
	const { start, limit } = getStartLimit(searchParams)
	const effectiveLimit = limit + DATA_OVERSCAN

	const query = searchDoctors(
		nameQuery,
		specialtiesQuery,
		locationQuery,
		effectiveLimit,
		start,
	)

	const doctors = await prisma.$queryRawTyped(query)
	const selectedLocation = locationQuery
		? await prisma.scheduleLocation.findUnique({
				where: { id: locationQuery },
				select: {
					id: true,
					name: true,
					address: true,
					city: true,
					state: true,
					country: true,
					type: true,
					zip: true,
					latitude: true,
					longitude: true,
				},
			})
		: undefined

	const selectedSpecialty = specialtiesQuery
		? await prisma.doctorSpecialty.findUnique({
				where: { id: specialtiesQuery },
				select: { id: true, name: true },
			})
		: undefined

	return data(
		{
			doctors: doctors.map(parseDoctor),
			location: selectedLocation,
			specialty: selectedSpecialty,
			theme: getTheme(request),
		},
		{ headers: { 'Cache-Control': 'public, max-age=120' } },
	)
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: SearchPageSchema })

	if (submission.status !== 'success') {
		return data(submission.reply({ formErrors: ['Could not submit search'] }))
	}
}

export default function SearchRoute({ loaderData }: Route.ComponentProps) {
	const navigation = useNavigation()
	const fetcher = useFetcher()
	const [items, setItems] = useState(loaderData.doctors)
	const [searchParams] = useSearchParams()

	const startRef = useRef(0)
	const parentRef = useRef<HTMLDivElement>(null)
	const currentSearchRef = useRef(searchParams.toString())

	const rowVirtualizer = useVirtual({
		size: items.length,
		parentRef,
		estimateSize: useCallback(() => 160, []),
		initialRect: { width: 0, height: 800 },
	})

	const [lastVirtualItem] = [...rowVirtualizer.virtualItems].reverse()

	let newStart = startRef.current

	if (lastVirtualItem) {
		const upperBoundary = startRef.current + LIMIT - DATA_OVERSCAN
		if (lastVirtualItem.index > upperBoundary) {
			newStart = startRef.current + LIMIT
		}
	}

	const isPending = useDelayedIsPending({
		formMethod: 'GET',
		formAction: '/search',
	})

	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SearchPageSchema })
		},
	})

	useEffect(() => {
		const currentParams = searchParams.toString()
		if (currentParams !== currentSearchRef.current) {
			currentSearchRef.current = currentParams
			setItems(loaderData.doctors)
			startRef.current = 0
			rowVirtualizer.scrollToIndex(0)
		}
	}, [searchParams, loaderData.doctors, rowVirtualizer])

	useEffect(() => {
		async function loadMore() {
			if (newStart === startRef.current) return
			if (fetcher.state !== 'idle') return
			if (searchParams.toString() !== currentSearchRef.current) return

			const qs = new URLSearchParams(searchParams)
			qs.set('start', String(newStart))
			qs.set('limit', String(LIMIT))

			await fetcher.load(`/search?${qs}`)
			startRef.current = newStart
		}

		loadMore().catch(console.error)
	}, [
		newStart,
		fetcher,
		fields.name.value,
		fields.specialtyId.value,
		fields.locationId.value,
		searchParams,
	])

	useEffect(() => {
		if (fetcher.data?.doctors) {
			setItems((prev) => {
				console.log('prev', prev)
				console.log('new', fetcher.data.doctors)
				// If we're at start 0, replace completely (new search)
				// Otherwise append (pagination)
				return startRef.current === 0
					? fetcher.data.doctors
					: [...prev, ...fetcher.data.doctors]
			})
		}
	}, [fetcher.data])

	// const handleFormChange = useDebounce(async (form: HTMLFormElement) => {
	// 	 await submit(form)
	// }, 400)

	return (
		<>
			<header className="bg-background sticky inset-0 z-50 flex items-start justify-between border-b px-4 py-2 shadow-sm lg:px-8">
				<Form {...getFormProps(form)} method="get" className="w-full">
					<SearchNavbar
						locationField={fields.locationId}
						selectedLocation={loaderData.location}
						selectedSpecialty={loaderData.specialty}
						specialtyField={fields.specialtyId}
					/>

					<button type="submit" className="hidden" />
				</Form>
				<UserDropdown userPreference={loaderData.theme} />
			</header>

			<main className="flex grow divide-x">
				<div className="flex-1 overflow-y-hidden shadow-md">
					<div className="search-container mx-auto overflow-y-scroll py-4">
						{isPending ? <SearchLoadingSkeleton /> : null}
						{navigation.state === 'idle' ? (
							items.length ? (
								<>
									<h4 className="mx-4 mb-4 text-xl leading-7 font-medium">
										{items.length} Doctors Available
									</h4>

									<div
										ref={parentRef}
										className="px-4"
										style={{
											height: '790px',
											width: '100%',
											overflow: 'auto',
										}}
									>
										<ul
											style={{
												height: `${rowVirtualizer.totalSize}px`,
												width: '100%',
												position: 'relative',
											}}
										>
											{rowVirtualizer.virtualItems.map((virtualRow, index) => {
												const doctor = items[virtualRow.index]

												if (!doctor) return null
												return (
													<>
														<li
															key={virtualRow.key}
															style={{
																position: 'absolute',
																top: 0,
																left: 0,
																width: '100%',
																height: `${virtualRow.size}px`,
																transform: `translateY(${virtualRow.start}px)`,
															}}
														>
															<Link
																to={`/doctors/${doctor.username}`}
																className="border-muted dark:shadow-muted hover:border-brand/40 flex w-full gap-4 overflow-hidden rounded-lg border px-4 py-2 hover:shadow-sm lg:gap-6"
															>
																<div className="h-20 w-20 overflow-hidden rounded-full lg:h-24 lg:w-24">
																	<Img
																		alt={doctor.name ?? doctor.username}
																		src={getUserImgSrc(doctor.imageObjectKey)}
																		className="h-20 w-20 rounded-full object-cover lg:h-24 lg:w-24"
																		width={256}
																		height={256}
																	/>
																</div>
																<div className="w-full space-y-1.5">
																	<div className="flex w-full justify-between">
																		<span className="text-body-md text-accent-foreground overflow-hidden text-center font-bold text-ellipsis whitespace-nowrap">
																			{doctor.name
																				? doctor.name
																				: doctor.username}
																		</span>
																		<div className="bg-muted flex items-center gap-0.5 rounded-md px-2 py-1">
																			<Icon
																				name="star"
																				className="fill-brand text-brand h-3 w-3"
																			/>
																			<span className="text-brand text-sm font-bold">
																				{doctor.averageRating}
																				<span className="text-accent-foreground text-xs">
																					&#47;{doctor.reviewCount}
																				</span>
																			</span>
																		</div>
																	</div>
																	{doctor.specialties.length > 0 && (
																		<div className="flex items-center gap-1">
																			<Icon
																				name="stethoscope"
																				className="text-primary h-3 w-3"
																			/>
																			<ul className="text-muted-foreground flex items-center gap-1 text-xs">
																				{doctor.specialties.map((specialty) => (
																					<li
																						key={specialty.id}
																						className="bg-muted text-accent-foreground rounded-md px-1 py-0.5 text-xs"
																					>
																						{specialty.name}
																					</li>
																				))}
																			</ul>
																		</div>
																	)}
																	{doctor.upcomingSchedules.length > 0 && (
																		<>
																			<div className="flex items-center gap-1">
																				<Icon
																					name="map-pin"
																					className="text-primary h-3 w-3"
																				/>
																				<ul className="text-muted-foreground flex items-center gap-1">
																					<li className="text-accent-foreground text-xs">
																						{
																							doctor.upcomingSchedules[0]
																								?.location.name
																						}
																					</li>
																					{doctor.upcomingSchedules.length >
																						1 && (
																						<li className="text-muted-foreground text-xs">
																							+
																							{doctor.upcomingSchedules.length -
																								1}{' '}
																							more
																						</li>
																					)}
																				</ul>
																			</div>
																			<div className="flex items-center gap-1">
																				<Icon
																					name="calendar-check"
																					className="text-primary h-3 w-3"
																				/>
																				<p className="text-muted-foreground text-xs">
																					{doctor.upcomingSchedules.length}{' '}
																					available schedules
																				</p>
																			</div>
																		</>
																	)}
																	<div className="mt-3 flex items-center justify-between">
																		<p className="bg-muted text-brand text-body-2xs flex items-center gap-1 rounded-sm px-1 py-0.5">
																			<Icon
																				name="tag"
																				className="h-3 w-3 rotate-90"
																			/>
																			<span>
																				Save{' '}
																				<span className="font-semibold">
																					{doctor.priceInfo.discount}tk
																				</span>
																			</span>
																		</p>
																		<p className="flex items-center gap-1">
																			<span className="text-muted-foreground line-through">
																				{doctor.priceInfo.discount +
																					doctor.priceInfo.startsFrom}
																				tk
																			</span>
																			<span className="text-primary font-bold underline">
																				{doctor.priceInfo.startsFrom}tk{' '}
																				<span className="text-sm">total</span>
																			</span>
																		</p>
																	</div>
																</div>
															</Link>
														</li>
													</>
												)
											})}
										</ul>
									</div>
								</>
							) : (
								<div className="text-muted-foreground container flex h-full w-full flex-col items-center justify-center space-y-2 md:px-8">
									<h4 className="text-lg font-semibold">No doctors found</h4>
									<p className="text-sm">Try adjusting your search criteria</p>
									<Link to="/search" className="text-brand hover:underline">
										Reset Search
									</Link>
								</div>
							)
						) : null}
					</div>
				</div>
				<div className="w-1/2">
					<div className="flex h-full items-center justify-center bg-gray-500 p-4">
						<p className="text-lg font-semibold">Google Map Placeholder</p>
					</div>
				</div>
			</main>
		</>
	)
}

const SearchNavbar = ({
	locationField,
	specialtyField,
	selectedLocation,
	selectedSpecialty,
}: {
	locationField: FieldMetadata
	specialtyField: FieldMetadata
	selectedLocation?: Omit<ScheduleLocation, 'createdAt' | 'updatedAt'> | null
	selectedSpecialty?: Pick<DoctorSpecialty, 'id' | 'name'> | null
}) => {
	const [searchParams, setSearchParams] = useSearchParams()
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

	return (
		<>
			<nav className="flex w-full flex-1 items-center justify-between">
				<div className="flex w-full items-center gap-6 md:gap-20">
					<Logo />

					<div className="flex w-full gap-8">
						<div className="flex w-full max-w-[350px] items-center gap-2 border-b">
							<label htmlFor="name" className="text-brand">
								Who
							</label>
							<input
								id="name"
								name="name"
								type="text"
								className="w-full bg-transparent focus:outline-hidden"
								placeholder="Dr. Ahmed"
								onChange={(event) => {
									if (debounceTimerRef.current) {
										clearTimeout(debounceTimerRef.current)
									}
									const value = event.target.value
									debounceTimerRef.current = setTimeout(() => {
										const newSearchParams = new URLSearchParams(searchParams)
										if (value) {
											newSearchParams.set('name', value)
										} else {
											newSearchParams.delete('name')
										}
										// Reset pagination when search query changes
										newSearchParams.set('start', '0')
										setSearchParams(newSearchParams, { replace: true })
									}, 400) // 400ms debounce delay
								}}
								defaultValue={searchParams.get('name') ?? ''}
							/>
						</div>

						<LocationCombobox
							field={locationField}
							variant="search"
							selectedLocation={selectedLocation}
						/>
						<SpecialtyCombobox
							field={specialtyField}
							selectedSpecialty={selectedSpecialty}
						/>
					</div>
				</div>
			</nav>
			<Filters />
		</>
	)
}

const FilterWrapper = ({ children }: { children: React.ReactNode }) => {
	return (
		<Button
			variant="outline"
			type="button"
			onClick={(e) => e.preventDefault()}
			className="flex h-8 items-center gap-2 rounded-lg px-[11px] py-[7px]"
		>
			{children}
		</Button>
	)
}

const Filters = () => {
	return (
		<div className="bg-background mt-2 flex items-center gap-2">
			<FilterWrapper>
				<SlidersHorizontal
					width={16}
					height={16}
					className="text-muted-foreground"
				/>
				<div className="sr-only">Filters</div>
			</FilterWrapper>

			<FilterItem />
			<FilterItem />
			<FilterItem />
		</div>
	)
}

const FilterItem = () => {
	return (
		<FilterWrapper>
			<span className="text-accent-foreground text-xs font-bold">Sex</span>
			<Icon name="arrow-down" className="text-primary h-4 w-4" />
		</FilterWrapper>
	)
}

const SearchLoadingSkeleton = () => {
	return (
		<div className="flex h-full animate-pulse flex-col items-center justify-center gap-4">
			<div className="bg-muted h-16 w-16 rounded-full" />
			<div className="bg-muted h-4 w-1/2 rounded-md" />
			<div className="bg-muted h-4 w-1/3 rounded-md" />
		</div>
	)
}
