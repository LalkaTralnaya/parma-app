const portraits: Record<string, string> = {
  human: '/art/races/human.jpg',
  lesovik: '/art/races/lesovik.jpg',
  svarozhich: '/art/races/svarozhich.jpg',
  polevichka: '/art/races/polevichka.jpg',
  chudinets: '/art/races/chudinets.jpg',
  teni_roda: '/art/races/teni_roda.jpg',
  dragonkin: '/art/races/dragonkin.jpg',
  aasimar: '/art/races/aasimar.jpg',
  mechanism: '/art/races/mechanism.jpg'
};

export function racePortrait(raceId: string): string | null {
  return Object.hasOwn(portraits, raceId) ? portraits[raceId] : null;
}
