import { error } from '@sveltejs/kit';
import { getAdventure } from '$lib/rules/adventures';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const adventure = getAdventure(params.slug);
	if (!adventure) error(404, 'Приключение не найдено');
	return { adventure };
};
