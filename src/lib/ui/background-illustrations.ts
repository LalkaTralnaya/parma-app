type Illustration = { image: string; panel: 0 | 1 | 2 };

const illustrations: Record<string, Illustration> = {
	blacksmith: { image: '/art/story-panels.jpg', panel: 0 },
	healer: { image: '/art/background-panels-1.jpg', panel: 0 },
	alchemist: { image: '/art/background-panels-1.jpg', panel: 0 },
	merchant: { image: '/art/background-panels-1.jpg', panel: 1 },
	hunter: { image: '/art/background-panels-1.jpg', panel: 2 },
	veteran: { image: '/art/background-panels-2.jpg', panel: 0 },
	actor: { image: '/art/background-panels-2.jpg', panel: 1 },
	novice: { image: '/art/background-panels-2.jpg', panel: 2 },
	freelancer: { image: '/art/story-panels.jpg', panel: 1 },
	handyman: { image: '/art/story-panels.jpg', panel: 0 },
	storyteller: { image: '/art/background-panels-2.jpg', panel: 1 },
	hermit: { image: '/art/story-panels.jpg', panel: 2 },
	farmer: { image: '/art/background-panels-3.jpg', panel: 0 },
	shepherd: { image: '/art/background-panels-3.jpg', panel: 0 },
	woodcutter: { image: '/art/background-panels-1.jpg', panel: 2 },
	boatman: { image: '/art/story-panels.jpg', panel: 1 },
	princely_courier: { image: '/art/story-panels.jpg', panel: 1 },
	border_patrol: { image: '/art/background-panels-1.jpg', panel: 2 },
	princely_warrior: { image: '/art/background-panels-2.jpg', panel: 0 },
	forest_bandit: { image: '/art/background-panels-1.jpg', panel: 2 },
	scribe: { image: '/art/background-panels-3.jpg', panel: 1 },
	steward: { image: '/art/background-panels-1.jpg', panel: 1 },
	mound_guard: { image: '/art/background-panels-1.jpg', panel: 2 },
	former_captive: { image: '/art/background-panels-2.jpg', panel: 0 },
	temple_magus: { image: '/art/background-panels-2.jpg', panel: 2 },
	clan_wise_one: { image: '/art/story-panels.jpg', panel: 2 },
	village_witch: { image: '/art/background-panels-3.jpg', panel: 2 },
	forest_healer: { image: '/art/background-panels-1.jpg', panel: 0 },
	border_sorcerer: { image: '/art/background-panels-3.jpg', panel: 2 },
	warband_mage: { image: '/art/background-panels-2.jpg', panel: 0 },
	elemental_apprentice: { image: '/art/background-panels-3.jpg', panel: 2 },
	rune_scribe: { image: '/art/background-panels-3.jpg', panel: 1 },
	enchanter_smith: { image: '/art/story-panels.jpg', panel: 0 },
	dreamer: { image: '/art/story-panels.jpg', panel: 2 },
	illusionist: { image: '/art/background-panels-3.jpg', panel: 2 },
	diviner: { image: '/art/background-panels-3.jpg', panel: 2 },
	spirit_summoner: { image: '/art/story-panels.jpg', panel: 2 },
	nav_apprentice: { image: '/art/background-panels-2.jpg', panel: 2 },
	runaway_apprentice: { image: '/art/story-panels.jpg', panel: 1 },
	charm_keeper: { image: '/art/background-panels-3.jpg', panel: 2 }
};

export function backgroundIllustration(backgroundId: string): Illustration | null {
	return illustrations[backgroundId] ?? null;
}
