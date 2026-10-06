import { BESTIARY } from '../src/lib/rules/bestiary';
import { WEAPONS, type AttackType } from '../src/lib/rules/weapons';
import { classifyAttack, getArmorValue, getAttackTarget, rollAttack, rollInitiative, rollCombatAttackEffect } from '../src/lib/engine/combat';
import { scaleMonster } from '../src/lib/engine/bestiary';
import { applyLevelUp, rollResourceGrowth } from '../src/lib/engine/levelup';
import { getResourceMax } from '../src/lib/engine/character';
import type { Character } from '../src/lib/type';

type Side = 'player' | 'enemy';
type Fighter = {
	id: string; side: Side; hp: number; maxHp: number; armor: number; initiative: number;
	character?: Character; monster?: ReturnType<typeof scaleMonster>;
};
type Trial = { winner: Side | 'draw'; rounds: number; playerCasualties: number; enemyCasualties: number; playerHpLeft: number; playerHpMax: number };

const LEVELS = [1, 5, 10, 15, 20, 25, 30];
const RATIOS = [
	{ label: '1:1', players: 1, enemies: 1 }, { label: '2:1', players: 2, enemies: 1 },
	{ label: '4:1', players: 4, enemies: 1 }, { label: '1:2', players: 1, enemies: 2 },
	{ label: '1:4', players: 1, enemies: 4 }
];
const ATTACK_MODES: AttackType[] = ['normal', 'strong', 'fast'];
const WEAPON = WEAPONS.find(w => w.id === 'war_hammer') ?? WEAPONS[0];
const ROUNDS_LIMIT = 200;
const RUNS_PER_CASE = Number(process.env['PARMA_SIM_RUNS'] ?? 2_000);

function makeCharacter(): Character {
	return {
		id: crypto.randomUUID(), name: 'Воин-плейтест', raceId: 'human', raceChoice: 'strength', level: 1,
		characteristics: Object.fromEntries(['strength','intelligence','dexterity','eloquence','religion'].map(id => [id, { levelUpBonus: 0 }])) as Character['characteristics'],
		skillPoints: { one_handed: 2, heavy_armor: 2 }, resourceRolls: { hp: [], mana: [], stamina: [], influence: [], grace: [] },
		currentResources: { hp: 0, mana: 0, stamina: 0, influence: 0, grace: 0 }, abilities: [], spells: [], useGraceForSpells: false,
		equipment: { weaponId: WEAPON.id, armorId: 'heavy_armor', shieldId: 'wooden_shield' }, inventory: [],
		money: { copper: 0, silver: 0, gold: 0 }, conditions: [], decay: { stage: 0, points: 0 },
		death: { usedVoiceOfBlood: false, usedCallOfZhiva: false, debtMark: 0, metkaNavi: false, deathCount: 0 },
		tempHp: 0, inspiration: 0,
		bio: { appearance: '', personalityKey: '', personalityText: '', idealKey: '', idealText: '', bondKey: '', bondText: '', flawKey: '', flawText: '', backstory: '', goals: '' },
		createdAt: 0, updatedAt: 0
	};
}

function atLevel(level: number, characteristicIncrease: number): Character {
	let char = makeCharacter();
	while (char.level < level) {
		const rolls = rollResourceGrowth(char, 'strength', characteristicIncrease);
		char = applyLevelUp(char, 'strength', rolls, characteristicIncrease);
	}
	return char;
}

function randomInteger(sides: number): number { return Math.floor(Math.random() * sides) + 1; }
function averageDice(expr: string): number {
	const m = expr.match(/^(\d+)[кd](\d+)/i);
	return m ? Number(m[1]) * (Number(m[2]) + 1) / 2 : 0;
}
function averageDamage(expr: string, modifier: number): number {
	return averageDice(expr) + modifier;
}
function monsterDamageModifier(monster: NonNullable<Fighter['monster']>, attack: NonNullable<Fighter['monster']>['scaledAttacks'][number]): number {
	return attack.damageModifier ?? monster.scaledMods[attack.attackStat ?? monster.base.primaryStat] ?? 0;
}
function exactExpectedPlayerDamage(char: Character, armor: number, mode: AttackType): number {
	const target = getAttackTarget(char, WEAPON, mode, armor, false).target;
	let expected = 0;
	const perAttack = mode === 'fast' ? 2 : 1;
	const die = Number(WEAPON.damageOneHand.match(/[кd](\d+)/i)?.[1] ?? 4);
	const dice = Number(WEAPON.damageOneHand.match(/^(\d+)/)?.[1] ?? 1) + (mode === 'strong' ? 1 : 0);
	const mod = Math.floor((36 + 6 + (char.characteristics.strength?.levelUpBonus ?? 0)) / 6);
	for (let roll = 1; roll <= 100; roll++) {
		if (roll === 100 || (roll !== 1 && roll > target)) continue;
		expected += roll === 1 ? die * dice + mod : (die + 1) / 2 * dice + mod;
	}
	return expected / 100 * perAttack;
}
function playerMode(char: Character, armor: number): AttackType {
	return ATTACK_MODES.reduce((best, mode) => exactExpectedPlayerDamage(char, armor, mode) > exactExpectedPlayerDamage(char, armor, best) ? mode : best, 'normal');
}
function bestMonsterAttack(monster: NonNullable<Fighter['monster']>, targetArmor: number) {
	return monster.scaledAttacks.reduce((best, attack) => {
		const chance = Math.max(0, Math.min(99, (attack.hitTarget ?? ((attack.hitTarget ?? (30 + attack.hitBonus))))));
		const exp = Math.max(0, chance - targetArmor) / 100 * averageDamage(attack.damageDice, monsterDamageModifier(monster, attack));
		const bestChance = Math.max(0, Math.min(99, (best.hitTarget ?? ((best.hitTarget ?? (30 + best.hitBonus))))));
		const bestExp = Math.max(0, bestChance - targetArmor) / 100 * averageDamage(best.damageDice, monsterDamageModifier(monster, best));
		return exp > bestExp ? attack : best;
	}, monster.scaledAttacks[0]);
}
function parseDamage(expr: string): number[] {
	const m = expr.match(/^(\d+)[кd](\d+)/i);
	if (!m) return [];
	return Array.from({ length: Number(m[1]) }, () => randomInteger(Number(m[2])));
}
function alive(fighters: Fighter[], side: Side): Fighter[] { return fighters.filter(f => f.side === side && f.hp > 0); }

function oneBattle(level: number, playerCount: number, enemyCount: number, characteristicIncrease: number): Trial {
	const capBaseLevel = Math.max(...BESTIARY.map(b => b.baseLevel));
	const chosenBaseLevel = Math.min(level, capBaseLevel);
	const pool = BESTIARY.filter(b => b.baseLevel === chosenBaseLevel);
	const team: Fighter[] = [];
	for (let i = 0; i < playerCount; i++) {
		const character = atLevel(level, characteristicIncrease);
		const armor = getArmorValue(character).total;
		const maxHp = getResourceMax(character, 'hp');
		team.push({ id: `P${i + 1}`, side: 'player', character, armor, maxHp, hp: maxHp, initiative: rollInitiative(character).total });
	}
	for (let i = 0; i < enemyCount; i++) {
		const base = pool[randomInteger(pool.length) - 1];
		const monster = scaleMonster(base, level);
		const dex = monster.scaledMods.dexterity ?? 0;
		team.push({ id: `E${i + 1}`, side: 'enemy', monster, armor: monster.scaledArmor, maxHp: monster.scaledHp, hp: monster.scaledHp, initiative: randomInteger(20) + dex });
	}
	team.sort((a, b) => b.initiative - a.initiative || a.id.localeCompare(b.id));
	let rounds = 0;
	while (rounds < ROUNDS_LIMIT && alive(team, 'player').length && alive(team, 'enemy').length) {
		rounds++;
		for (const actor of team) {
			if (actor.hp <= 0 || !alive(team, actor.side === 'player' ? 'enemy' : 'player').length) continue;
			if (actor.side === 'player' && actor.character) {
				const targets = alive(team, 'enemy').sort((a,b) => a.hp/a.maxHp - b.hp/b.maxHp);
				const target = targets[0];
				const mode = playerMode(actor.character, target.armor);
				const rolls = rollAttack(actor.character, WEAPON, mode, target.armor, false);
				for (const attack of rolls) if (attack.damage) target.hp = Math.max(0, target.hp - attack.damage.total);
			} else if (actor.monster) {
				const targets = alive(team, 'player').sort((a,b) => a.hp/a.maxHp - b.hp/b.maxHp);
				const target = targets[0];
				const attack = bestMonsterAttack(actor.monster, target.armor);
				const roll = randomInteger(100);
				const threshold = (attack.hitTarget ?? ((attack.hitTarget ?? (30 + attack.hitBonus)))) - target.armor;
				const outcome = classifyAttack(roll, threshold);
				const effect = rollCombatAttackEffect(outcome, /двуруч/i.test(attack.name) ? 'two_handed' : undefined);
				if (outcome === 'hit' || outcome === 'critical_hit' || outcome === 'double') {
					const dice = parseDamage(attack.damageDice);
					const dieSides = Number(attack.damageDice.match(/[кd](\d+)/i)?.[1] ?? 0);
					const damage = (outcome === 'critical_hit' ? dice.length * dieSides : dice.reduce((a,b) => a+b,0))
						+ monsterDamageModifier(actor.monster, attack)
						+ (effect?.extraDamageRolls?.reduce((a,b)=>a+b,0) ?? 0);
					target.hp = Math.max(0, target.hp - damage);
				}
			}
		}
	}
	const ps = team.filter(f=>f.side==='player');
	const es = team.filter(f=>f.side==='enemy');
	const playerSurvivors = alive(team,'player');
	const enemySurvivors = alive(team,'enemy');
	return {
		winner: playerSurvivors.length && !enemySurvivors.length ? 'player' : enemySurvivors.length && !playerSurvivors.length ? 'enemy' : 'draw',
		rounds, playerCasualties: ps.length-playerSurvivors.length, enemyCasualties: es.length-enemySurvivors.length,
		playerHpLeft: playerSurvivors.reduce((sum,f)=>sum+f.hp,0), playerHpMax: ps.reduce((sum,f)=>sum+f.maxHp,0)
	};
}

function setRandomSeed(seed: number): () => void {
	const original = Math.random;
	let state = seed >>> 0;
	Math.random = () => {
		state += 0x6D2B79F5;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return () => { Math.random = original; };
}

function summarize(trials: Trial[]) {
	const n = trials.length;
	const wins = trials.filter(t=>t.winner==='player').length;
	const losses = trials.filter(t=>t.winner==='enemy').length;
	const draws = n-wins-losses;
	const roundMean = trials.reduce((s,t)=>s+t.rounds,0)/n;
	const survivorHp = trials.reduce((s,t)=>s+(t.playerHpMax ? t.playerHpLeft/t.playerHpMax : 0),0)/n;
	const casualties = trials.reduce((s,t)=>s+t.playerCasualties,0)/n;
	const z = 1.96;
	const denominator = 1 + z*z/n;
	const center = (wins/n + z*z/(2*n))/denominator;
	const halfWidth = z/denominator * Math.sqrt((wins/n)*(1-wins/n)/n + z*z/(4*n*n));
	return {n,wins,losses,draws,winRate:wins/n,ci95:halfWidth,roundMean,survivorHp,casualties,winRateWilsonLow:center-halfWidth,winRateWilsonHigh:center+halfWidth};
}

const rows: string[] = ['level,stat_increase_per_level,players,enemy_ratio,enemy_base_level,mode,runs,player_win_rate,ci95,enemy_win_rate,draw_rate,mean_rounds,mean_player_casualties,avg_player_hp_remaining_pct'];
let seed = 0x5041524d;

// Seed the complete run once so every dice roll, including initiative and level growth,
// comes from the same reproducible stream.
const restoreRandom = setRandomSeed(seed);
try {
for (const statIncrease of [6]) for (const level of LEVELS) for (const ratio of RATIOS) {
	for (let i=0;i<RUNS_PER_CASE;i++) {
		const trial = oneBattle(level,ratio.players,ratio.enemies,statIncrease);
		if (!globalThis.__parma_trials) (globalThis as any).__parma_trials = [];
		(globalThis as any).__parma_trials.push(trial);
	}
	const all = (globalThis as any).__parma_trials as Trial[];
	const result = summarize(all.splice(0,RUNS_PER_CASE));
	const scaledLevel = Math.min(level, Math.max(...BESTIARY.map(b=>b.baseLevel)));
	rows.push([level,statIncrease,ratio.label,`${ratio.players}:${ratio.enemies}`,scaledLevel,'оптимальный режим',result.n,(100*result.winRate).toFixed(2),`±${(100*result.ci95).toFixed(2)}`,(100*result.losses/result.n).toFixed(2),(100*result.draws/result.n).toFixed(2),result.roundMean.toFixed(2),result.casualties.toFixed(3),(100*result.survivorHp).toFixed(2)].join(','));
}
} finally {
	restoreRandom();
}
const fs = await import('node:fs/promises');
await fs.mkdir('reports',{recursive:true});
await fs.writeFile('reports/combat-simulation.csv', rows.join('\n')+'\n','utf8');
console.log(`Wrote ${rows.length-1} battle scenarios to reports/combat-simulation.csv`);
