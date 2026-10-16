<script lang="ts">
	import Dialog from './Dialog.svelte';
	import ConditionIcon from './ConditionIcon.svelte';
	import type { Character } from '../type';
	import type { CombatParticipant, CombatState } from '../sync/combat';
	import { CONDITIONS } from '../rules/conditions';
	import { CHARACTERISTICS } from '../rules/characteristics';
	import { SKILLS } from '../rules/skills';
	import { SPELLS } from '../rules/spells';
	import { ABILITIES } from '../rules/abilities';
	import { getCharacter } from '../db/characters';
	import { attemptCombatEffectSave, effectPreset, effectSaveTarget, isTargetedSpecial, removeCombatEffect, resolveCombatEffect, type CombatEffect } from '../engine/combatEffects';
	let { participant, encounter, onchange, character = null, initialText = '' }: {participant:CombatParticipant;encounter:CombatState;onchange:(s:CombatState)=>Promise<void>;character?:Character|null;initialText?:string}=$props();
	let open=$state(false),busy=$state(false),message=$state(''),text=$state(''),name=$state('');
	let conditionId=$state(''),stat=$state('strength'),skill=$state(''),penalty=$state(0),rounds=$state<number|null>(null),targetId=$state(''),needsSave=$state(true),physical=$state(false),die=$state(50);
	let seenText='';
	let attackMod=$state(0),armorMod=$state(0),speedMod=$state(0),saveMod=$state(0),cannotAct=$state(false);
	const presets=$derived(character ? [...SPELLS.filter(s=>character?.spells.includes(s.id)).map(s=>({name:s.name,text:`${s.name}: ${s.draftText??s.effect??s.description}. ${s.save??''}`})),...ABILITIES.filter(a=>character?.abilities.includes(a.id)).map(a=>({name:a.name,text:`${a.name}: ${a.description}`}))] : []);
	function begin(description='') {
		text=description;name=description.split(':')[0] || 'Особый эффект';
		const p=effectPreset(description);conditionId=p.conditionId;stat=p.charA;skill=p.skillA;penalty=p.penalty;rounds=p.rounds;message='';targetId='';needsSave=true;open=true;
		attackMod=-Number(description.match(/[−-](\d+)\s*к (?:попаданию|атак)/i)?.[1]??0);armorMod=-Number(description.match(/[−-](\d+)\s*к Брон/i)?.[1]??0);speedMod=-Number(description.match(/[−-](\d+)\s*сажен[ьи].*скорост/i)?.[1]??0);cannotAct=/не может действовать/i.test(description);
		saveMod=-Number(description.match(/[−-](\d+)\s*к избавлен/i)?.[1]??0);
	}
	$effect(()=>{if(initialText && initialText!==seenText){seenText=initialText;begin(initialText);}});
	async function live(p:CombatParticipant) {return p.id===participant.id && character ? character : p.isPlayer&&p.sourceId ? await getCharacter(p.sourceId) : null;}
	function roll(){return physical?Number(die):Math.floor(Math.random()*100)+1;}
	async function apply(){
		if(busy || !targetId)return;busy=true;
		try{
			const def=CONDITIONS.find(c=>c.id===conditionId);
			if(!def && !text.trim())throw new Error('Опишите эффект.');
			const e:CombatEffect={id:crypto.randomUUID(),name:name||def?.name||'Особый эффект',description:text,sourceId:participant.id,sourceName:participant.name,conditionId:conditionId||undefined,modifiers:def?.modifiers??{attacks:Number(attackMod)||0,armor:Number(armorMod)||0,speed:Number(speedMod)||0,saves:Number(saveMod)||0,canAct:!cannotAct},save:needsSave?{charA:stat,skillA:skill||undefined,...(def?.save?.charA===stat && def.save.skillA===(skill||undefined)?{charB:def.save.charB,skillB:def.save.skillB}:{})}:undefined,penalty:Number(penalty)||0,roundsLeft:rounds===null||Number(rounds)===0?null:Math.max(1,Math.floor(Number(rounds)))};
			const target=encounter.participants.find(p=>p.id===targetId);if(!target)throw new Error('Выберите цель.');
			const r=needsSave?roll():null;
			const result=resolveCombatEffect(encounter,targetId,e,r,await live(target));
			await onchange(result.state);
			message=`${target.name}: ${result.immune?'иммунитет':result.target===null?'эффект наложен':`к100 ${r} ≤ ${result.target} — ${result.success?'избавление успешно, эффект не наложен':'провал, эффект наложен'}`}`;
		}catch(error){message=(error as Error).message;}finally{busy=false;}
	}
	async function escape(e:CombatEffect,alternative=false){
		if(busy)return;busy=true;
		try{
			const target=effectSaveTarget(participant,e,await live(participant),alternative);if(target===null)return;
			const r=physical?Number(prompt('Результат физического к100 (1–100):','50')):roll();
			if(!Number.isInteger(r)||r<1||r>100)return;
			const result=attemptCombatEffectSave(encounter,participant.id,e.id,r,await live(participant),alternative);
			const success=result.success;
			message=`${participant.name}: к100 ${r} ≤ ${target} — ${success?'эффект снят':'эффект остаётся'}`;
			if(success)await onchange(result.state);
		}catch(error){message=(error as Error).message;}finally{busy=false;}
	}
	async function dot(e:CombatEffect){
		const def=CONDITIONS.find(c=>c.id===e.conditionId);const m=def?.dotDamage?.match(/^(\d+)[кd](\d+)$/i);if(!m)return;
		const damage=physical?Number(prompt(`Урон ${def?.dotDamage}:`,'1')):Array.from({length:Number(m[1])},()=>Math.floor(Math.random()*Number(m[2]))+1).reduce((a,b)=>a+b,0);
		if(!Number.isInteger(damage)||damage<0)return;
		await onchange({...encounter,participants:encounter.participants.map(p=>p.id===participant.id?{...p,currentHp:Math.max(0,p.currentHp-damage)}:p)});
		message=`${participant.name}: −${damage} ЗДР (${def?.name})`;
	}
</script>
<div class="combat-effects">
	{#if participant.traits?.some(isTargetedSpecial)}<div class="actions">{#each participant.traits.filter(isTargetedSpecial) as trait}<button disabled={busy} onclick={()=>begin(trait)}>Применить: {trait.split(':')[0]}</button>{/each}</div>{/if}
	{#each participant.attacks?.filter(a=>isTargetedSpecial(`${a.save??''} ${a.notes??''}`))??[] as attack}<button disabled={busy} onclick={()=>begin(`${attack.name}: ${attack.save??attack.notes}`)}>Эффект: {attack.name}</button>{/each}
	<button disabled={busy} onclick={()=>begin()}>Наложить эффект на цель</button>
	{#if participant.effects?.length}<div class="effects-list">{#each participant.effects as e(e.id)}
		<div class="effect"><div class="effect-heading"><ConditionIcon id={e.conditionId} name={e.name} size={32} /><span><strong>{e.name}</strong> · {e.roundsLeft===null?'до избавления':`${e.roundsLeft} р.`}</span></div><small>Источник: {e.sourceName}</small><p>{e.description}</p>
		{#if e.save}<button disabled={busy} onclick={()=>escape(e)}>Избавление к100</button>{#if e.save.charB}<button disabled={busy} onclick={()=>escape(e,true)}>Альтернативное избавление</button>{/if}{/if}
		{#if CONDITIONS.find(c=>c.id===e.conditionId)?.dotDamage}<button disabled={busy} onclick={()=>dot(e)}>Урон от эффекта</button>{/if}
		<button disabled={busy} onclick={()=>onchange(removeCombatEffect(encounter,participant.id,e.id))}>Снять эффект</button>
		</div>
	{/each}</div>{/if}
	{#if message && !open}<p role="status">{message}</p>{/if}
</div>
{#if open}<Dialog label="Применить эффект к цели" onclose={()=>open=false}>
	<h2 class="font-semibold text-xl">{participant.name}: эффект на цель</h2>
	<p class="text-sm my-2">Условия применения и затраты указаны в описании. Если требуется попадание или сотворение, выполните его перед наложением эффекта. Урон атаки рассчитывается отдельно.</p>
	{#if presets.length}<label>Умение или заклинание<select onchange={(e)=>{const p=presets[Number(e.currentTarget.value)];if(p)begin(p.text);}}><option value="">Выберите</option>{#each presets as p,i}<option value={i}>{p.name}</option>{/each}</select></label>{/if}
	<label>Название эффекта<input bind:value={name}/></label>
	<label>Описание<textarea rows="3" bind:value={text}></textarea></label>
	<label>Состояние<select bind:value={conditionId} onchange={()=>{const c=CONDITIONS.find(c=>c.id===conditionId);if(c){rounds=c.defaultRounds;stat=c.save?.charA??stat;skill=c.save?.skillA??'';}}}><option value="">Особый эффект из описания</option>{#each CONDITIONS as c}<option value={c.id}>{c.name}</option>{/each}</select></label>
	{#if conditionId}<p class="text-sm effect-heading"><ConditionIcon id={conditionId} size={36} /><span>{CONDITIONS.find(c=>c.id===conditionId)?.effects}</span></p>{/if}
	{#if !conditionId}<label>Модификатор атаки<input type="number" bind:value={attackMod}/></label><label>Модификатор Брони<input type="number" bind:value={armorMod}/></label><label>Модификатор скорости<input type="number" bind:value={speedMod}/></label><label>Модификатор проверок избавления<input type="number" bind:value={saveMod}/></label><label><input type="checkbox" bind:checked={cannotAct}/> Цель не может действовать</label>{/if}
	<label>Длительность в раундах (0 — до избавления)<input type="number" min="0" bind:value={rounds}/></label>
	<label><input type="checkbox" bind:checked={needsSave}/> Цель проходит избавление перед наложением</label>
	{#if needsSave}<label>Характеристика избавления<select bind:value={stat}>{#each CHARACTERISTICS as c}<option value={c.id}>{c.name}</option>{/each}</select></label>
	<label>Навык избавления<select bind:value={skill}><option value="">Только характеристика</option>{#each SKILLS as s}<option value={s.id}>{s.name}</option>{/each}</select></label>
	<label>Модификатор избавления<input type="number" bind:value={penalty}/></label>{/if}
	<label><input type="checkbox" bind:checked={physical}/> Физические кубики</label>
	{#if physical && needsSave}<label>Результат к100<input type="number" min="1" max="100" bind:value={die}/></label>{/if}
	<label>Цель<select bind:value={targetId}><option value="">Выберите участника боя</option>{#each encounter.participants as p}<option value={p.id}>{p.name}{p.id===participant.id?' (на себя)':''}</option>{/each}</select></label>
	<div class="actions"><button disabled={busy||!targetId} onclick={apply}>Применить и проверить избавление</button><button disabled={busy} onclick={()=>open=false}>Закрыть</button></div>
	{#if message}<p role="status">{message}</p>{/if}
</Dialog>{/if}
<style>
.effect-heading{display:flex;align-items:center;gap:8px}
.combat-effects{margin-top:12px;padding-top:8px;border-top:1px solid #c9d6cc;font-size:12px}.actions{display:flex;flex-wrap:wrap;gap:6px}button{padding:6px 8px;border:1px solid #aab9ac;border-radius:6px;margin:3px;background:#edf2e8;color:#173d30}button:disabled{opacity:.5}.effect{border:1px solid #d99e8f;border-radius:6px;padding:8px;margin-top:8px;background:#fff5f0}.effect p{margin:4px 0}.effect small{display:block}label{display:block;margin:10px 0}label input:not([type=checkbox]),select,textarea{display:block;width:100%;padding:7px;border:1px solid #aab9ac;border-radius:6px}input[type=checkbox]{margin-right:6px}
</style>
