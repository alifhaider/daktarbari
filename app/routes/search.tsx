import { type FieldMetadata, getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { searchDoctors } from '@prisma/client/sql'
import { SlidersHorizontal } from 'lucide-react'
import { Img } from 'openimg/react'
import { data, Form, Link, redirect, useSearchParams } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { UserDropdown } from '#app/components/user-dropdown.tsx'
import { Logo } from '#app/root.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	getUserImgSrc,
	parseDoctor,
	useDelayedIsPending,
} from '#app/utils/misc.tsx'
import { type Route } from './+types/search'
import { LocationCombobox } from './resources+/location-combobox'
import { SpecialtyCombobox } from './resources+/specialty-combobox'

export const SearchPageSchema = z.object({
	name: z.string().optional(),
	locationId: z.string().optional(),
	specialtyId: z.string().optional(),
})

export async function loader({ request }: Route.LoaderArgs) {
	const searchParams = new URL(request.url).searchParams
	const nameQuery = searchParams.get('name')
	const specialtiesQuery = searchParams.get('specialtyId')
	const locationQuery = searchParams.get('locationId')
	if (nameQuery === '') {
		return redirect('/search')
	}

	const name = nameQuery ?? ''
	const specialtyId = specialtiesQuery ?? ''
	const locationId = locationQuery ?? ''

	const doctors = await prisma.$queryRawTyped(
		searchDoctors(name, specialtyId, locationId),
	)

	console.log('doctors', doctors)

	const parsedDoctors = doctors.map(parseDoctor)
	console.log('parsed doctors', parsedDoctors)

	return { status: 'idle', doctors: parsedDoctors } as const
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema: SearchPageSchema })

	if (submission.status !== 'success') {
		return data(submission.reply({ formErrors: ['Could not submit search'] }))
	}
}

export default function SearchRoute({ loaderData }: Route.ComponentProps) {
	// const submit = useSubmit()
	const [searchParams, setSearchParams] = useSearchParams()

	const isPending = useDelayedIsPending({
		formMethod: 'GET',
		formAction: '/search',
	})

	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SearchPageSchema })
		},
	})

	// const handleFormChange = useDebounce(async (form: HTMLFormElement) => {
	// 	 await submit(form)
	// }, 400)

	return (
		<>
			<Form
				{...getFormProps(form)}
				method="get"
				className="sticky top-0 z-50"
				onChange={async (event) => {
					event.preventDefault()
					const formData = new FormData(event.currentTarget)
					const newSearchParams = new URLSearchParams(searchParams)
					for (const [key, value] of formData.entries()) {
						if (formData.has(key) && value.toString().trim()) {
							newSearchParams.set(key, value.toString())
						} else {
							newSearchParams.delete(key)
						}
					}

					setSearchParams(newSearchParams)

					// handleFormChange(event.currentTarget)
				}}
			>
				<SearchNavbar
					locationField={fields.locationId}
					specialtyField={fields.specialtyId}
				/>

				<button type="submit" className="hidden" />
			</Form>

			<main className="flex grow divide-x overflow-y-hidden">
				<div className="flex-1 overflow-y-auto shadow-md">
					<div className="search-container container mx-auto overflow-y-scroll">
						<div>
							{isPending ? <SearchLoadingSkeleton /> : null}
							{loaderData.status === 'idle' ? (
								loaderData.doctors.length ? (
									<>
										<div className="my-4">
											<h4 className="text-xl leading-7 font-medium">
												{loaderData.doctors.length} Doctors Available
											</h4>
											<p className="text-xs font-medium">
												These doctors are located around
											</p>
										</div>
										<ul
											className={cn('mb-4 space-y-4 delay-200', {
												'opacity-50': isPending,
											})}
										>
											{loaderData.doctors.map((user) => (
												<li key={user.id}>
													<Link
														to={`/doctors/${user.username}`}
														className="border-muted dark:shadow-muted flex w-full gap-4 overflow-hidden rounded-lg border px-4 py-2 hover:shadow-sm lg:gap-6"
													>
														<div className="h-20 w-20 overflow-hidden rounded-full lg:h-24 lg:w-24">
															<Img
																alt={user.name ?? user.username}
																src={getUserImgSrc(user.imageObjectKey)}
																className="h-20 w-20 rounded-full object-cover lg:h-24 lg:w-24"
																width={256}
																height={256}
															/>
														</div>
														<div className="w-full space-y-1.5">
															<div className="flex w-full justify-between">
																<span className="text-body-md text-accent-foreground overflow-hidden text-center font-bold text-ellipsis whitespace-nowrap">
																	{user.name ? user.name : user.username}
																</span>
																<div className="bg-muted flex items-center gap-0.5 rounded-md px-2 py-1">
																	<Icon
																		name="star"
																		className="fill-brand text-brand h-3 w-3"
																	/>
																	<span className="text-brand text-sm font-bold">
																		{user.averageRating}
																		<span className="text-accent-foreground text-xs">
																			&#47;{user.reviewCount}
																		</span>
																	</span>
																</div>
															</div>
															{user.specialties.length > 0 && (
																<div className="flex items-center gap-1">
																	<Icon
																		name="stethoscope"
																		className="text-primary h-3 w-3"
																	/>
																	<ul className="text-muted-foreground flex items-center gap-1 text-xs">
																		{user.specialties.map((specialty) => (
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
															{user.upcomingSchedules.length > 0 && (
																<>
																	<div className="flex items-center gap-1">
																		<Icon
																			name="map-pin"
																			className="text-primary h-3 w-3"
																		/>
																		<ul className="text-muted-foreground flex items-center gap-1">
																			<li className="text-accent-foreground text-xs">
																				{
																					user.upcomingSchedules[0]?.location
																						.name
																				}
																			</li>
																			{user.upcomingSchedules.length > 1 && (
																				<li className="text-muted-foreground text-xs">
																					+{user.upcomingSchedules.length - 1}{' '}
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
																			{user.upcomingSchedules.length} available
																			schedules
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
																			{user.priceInfo.discount}tk
																		</span>
																	</span>
																</p>
																<p className="flex items-center gap-1">
																	<span className="text-accent-foreground line-through">
																		{user.priceInfo.discount +
																			user.priceInfo.startsFrom}
																		tk
																	</span>
																	<span className="text-primary font-bold underline">
																		{user.priceInfo.startsFrom}tk total
																	</span>
																</p>
															</div>
														</div>
													</Link>
												</li>
											))}
										</ul>
									</>
								) : (
									<p>No doctors found</p>
								)
							) : loaderData.status === 'error' ? (
								<ErrorList
									errors={['There was an error parsing the results']}
								/>
							) : null}
						</div>
					</div>
				</div>
				<div className="w-2/5">
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
}: {
	locationField: FieldMetadata
	specialtyField: FieldMetadata
}) => {
	const [searchParams] = useSearchParams()

	return (
		<header className="border-b">
			<nav className="bg-background sticky inset-0 z-50 flex w-full items-center justify-between px-4 py-2 lg:px-8">
				<div className="flex w-full items-center gap-6">
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
								defaultValue={searchParams.get('name') ?? ''}
							/>
						</div>

						<LocationCombobox field={locationField} variant="search" />
						<SpecialtyCombobox field={specialtyField} />
					</div>
				</div>

				<UserDropdown />
			</nav>
			<Filters />
		</header>
	)
}

const FilterWrapper = ({ children }: { children: React.ReactNode }) => {
	return (
		<Button
			variant="outline"
			className="flex h-8 items-center gap-2 rounded-lg px-[11px] py-[7px]"
		>
			{children}
		</Button>
	)
}

const Filters = () => {
	return (
		<div className="bg-background flex items-center gap-2 px-4 pb-2 shadow-xs lg:px-8">
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
