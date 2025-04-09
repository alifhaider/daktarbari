import { type FieldMetadata, getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { searchDoctors } from '@prisma/client/sql'
import { Img } from 'openimg/react'
import { data, Form, Link, redirect, useSearchParams } from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { UserDropdown } from '#app/components/user-dropdown.tsx'
import { Logo } from '#app/root.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getUserImgSrc, useDelayedIsPending } from '#app/utils/misc.tsx'
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
	return { status: 'idle', doctors } as const
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
				{/* <Filters /> */}
				<button type="submit" className="hidden" />
			</Form>
			<div className="container mb-48 mt-36 flex flex-col items-center justify-center gap-6">
				<h1 className="text-h1">Daktar Bari Doctors</h1>
				{/* <div className="w-full max-w-[700px]">
					<SearchBar status={loaderData.status} autoFocus autoSubmit />
				</div> */}
				<main>
					{loaderData.status === 'idle' ? (
						loaderData.doctors.length ? (
							<ul
								className={cn(
									'flex w-full flex-wrap items-center justify-center gap-4 delay-200',
									{ 'opacity-50': isPending },
								)}
							>
								{loaderData.doctors.map((user) => (
									<li key={user.id}>
										<Link
											to={`/doctors/${user.username}`}
											className="flex h-36 w-44 flex-col items-center justify-center rounded-lg bg-muted px-5 py-3"
										>
											<Img
												alt={user.name ?? user.username}
												src={getUserImgSrc(user.imageObjectKey)}
												className="h-16 w-16 rounded-full"
												width={256}
												height={256}
											/>
											{user.name ? (
												<span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-body-md">
													{user.name}
												</span>
											) : null}
											<span className="w-full overflow-hidden text-ellipsis text-center text-body-sm text-muted-foreground">
												{user.username}
											</span>
										</Link>
									</li>
								))}
							</ul>
						) : (
							<p>No doctors found</p>
						)
					) : loaderData.status === 'error' ? (
						<ErrorList errors={['There was an error parsing the results']} />
					) : null}
				</main>
			</div>
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
		<header>
			<nav className="sticky inset-0 z-50 flex w-full items-center justify-between border-b bg-background px-4 py-4 lg:px-8">
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
								className="w-full bg-transparent focus:outline-none"
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
		</header>
	)
}
