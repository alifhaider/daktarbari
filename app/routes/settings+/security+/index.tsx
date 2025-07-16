import { redirect } from 'react-router'

export async function loader() {
	return redirect('/settings/security/change-email')
}
