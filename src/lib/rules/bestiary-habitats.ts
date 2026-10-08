import { BESTIARY, getMonsterSection, type BaseMonster } from './bestiary';

/** Места возможных встреч для подготовки игры; не ограничивают размещение существ Сказителем. */
export const BESTIARY_HABITATS = [
  { id: 'forest', name: 'Леса и чащи', icon: 'leaf', description: 'Звери, духи леса и охотники среди деревьев.' },
  { id: 'water', name: 'Болота и водоёмы', icon: 'compass', description: 'Болота, реки, озёра и морские глубины.' },
  { id: 'road', name: 'Дороги и поля', icon: 'compass', description: 'Тракты, пустоши, открытые поля и места встреч в пути.' },
  { id: 'settlement', name: 'Города и поселения', icon: 'people', description: 'Люди, проклятые дома и опасности среди жителей.' },
  { id: 'ruins', name: 'Руины и места силы', icon: 'shield', description: 'Заброшенные строения, древние механизмы и забытые святилища.' },
  { id: 'grave', name: 'Погосты и могильники', icon: 'book', description: 'Нежить, беспокойные духи и земли, пропитанные Тленом.' },
  { id: 'mountain', name: 'Горы и пещеры', icon: 'compass', description: 'Скалы, подземелья и глубокие пещеры.' },
  { id: 'desert', name: 'Пустыни', icon: 'compass', description: 'Пески и сухие безлюдные земли.' },
  { id: 'ice', name: 'Ледяные земли', icon: 'compass', description: 'Северные пустоши и наследие Великой Стужи.' },
  { id: 'navi', name: 'Навь и её границы', icon: 'dice', description: 'Разрывы Кона, проклятые места и пограничье мира мёртвых.' }
] as const;
export type HabitatId = typeof BESTIARY_HABITATS[number]['id'];

const MONSTER_HABITATS: Record<string, HabitatId[]> = {
  wolf: ['forest', 'road'], bear: ['forest'], boar: ['forest', 'road'], giant_spider: ['forest', 'ruins'],
  leshy: ['forest'], gniyushiy_leshy: ['forest', 'navi'], endriaga: ['forest'], werewolf: ['forest', 'settlement', 'road'],
  giant_boa: ['water', 'forest'], rusalka: ['water'], bolotny_hodok: ['water'], utoplets: ['water'], sea_serpent: ['water'], vodyanoy: ['water'],
  poludennitsa: ['road'], headless_rider: ['road', 'grave', 'navi'], black_dog: ['road', 'settlement', 'navi'],
  druzhinnik: ['settlement', 'road'], starschina: ['settlement', 'road'], poltergeist: ['settlement', 'ruins'],
  katanak: ['settlement', 'grave'], higher_vampire: ['settlement', 'ruins'], nochnitsa: ['settlement', 'navi'],
  mechanism_guard: ['ruins'], rune_spider_golem: ['ruins', 'mountain'], bone_witch: ['ruins', 'forest', 'grave'],
  basilisk: ['ruins', 'mountain'], turin_serpent: ['ruins', 'mountain'],
  upyr: ['grave', 'ruins'], gul: ['grave', 'ruins'], algul: ['grave', 'ruins'], upyr_king: ['grave', 'ruins'],
  skeleton: ['grave', 'ruins'], ghost: ['grave', 'settlement', 'ruins'], banshee: ['grave', 'ruins'], grave_worm: ['grave', 'navi'],
  harpy: ['mountain'], voronojnik: ['mountain', 'forest'], giant_burrowing_worm: ['mountain'], royal_eagle: ['mountain'],
  thunderbird: ['mountain'], cave_troll: ['mountain'], giant_scorpion: ['desert'], ice_mammoth: ['ice'],
  shadow: ['navi', 'ruins'], koshmar_wolf: ['navi', 'forest'], soul_devourer: ['navi'], necrophantom: ['navi', 'ruins'],
  abyss_ghost: ['navi', 'grave'], navi_dragon_worm: ['navi'], cerberus: ['navi']
};

export function getMonsterHabitats(id: string) {
  return (MONSTER_HABITATS[id] ?? []).map(habitat => BESTIARY_HABITATS.find(entry => entry.id === habitat)!);
}
export interface BestiaryFilters { habitat: string; type: string; query: string; level: string }
export function filterBestiary(filters: BestiaryFilters): BaseMonster[] {
  const query = filters.query.trim().toLocaleLowerCase('ru');
  return BESTIARY.filter(monster => {
    const habitats = getMonsterHabitats(monster.id);
    const type = getMonsterSection(monster.id);
    if (filters.habitat !== 'all' && !habitats.some(habitat => habitat.id === filters.habitat)) return false;
    if (filters.type !== 'all' && type?.id !== filters.type) return false;
    if (filters.level !== 'all') {
      const [min, max] = filters.level.split('-').map(Number);
      if (monster.baseLevel < min || monster.baseLevel > max) return false;
    }
    return [monster.name, monster.description, type?.name ?? '', ...habitats.map(habitat => habitat.name)]
      .join(' ').toLocaleLowerCase('ru').includes(query);
  });
}
