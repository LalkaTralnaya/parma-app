import { error } from '@sveltejs/kit';import { getCustomAdventure } from '$lib/db/customAdventures';import type { PageLoad } from './$types';
export const ssr=false;
export const load:PageLoad=async({params})=>{const record=await getCustomAdventure(params.id);if(!record)error(404,'Приключение не найдено на этом устройстве и в этом аккаунте.');return {record};};
