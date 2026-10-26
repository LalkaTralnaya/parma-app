<script lang="ts">
	import { tick } from 'svelte';
	import { BOOK_FACTIONS, BOOK_RELATIONSHIP_JOBS } from '$lib/rules/book-relationships';
	import RelationshipGraph from './RelationshipGraph.svelte';
	import BookRelationships from './BookRelationships.svelte';
	import type { RelationshipLink, RelationshipTargetType, RelationshipNpc } from '$lib/engine/relationship-web';
	import { relationshipTargetLabel, relationshipNpcs, getPersonalRelationshipWeb } from '$lib/engine/relationship-web';

	interface CharacterOption { id: string; name: string }
	let {
		links,
		npcs = [],
		characters = [],
		ownerCharacterId,
		editable = false,
		onChange
	}: {
		links: RelationshipLink[];
		npcs?: RelationshipNpc[];
		characters?: CharacterOption[];
		ownerCharacterId?: string;
		editable?: boolean;
		onChange?: (links: RelationshipLink[], npcs?: RelationshipNpc[]) => void | Promise<void>;
	} = $props();

	let characterId = $state('');
	let sourceType = $state<RelationshipTargetType>('character');
	let sourceName = $state('');
	let targetType = $state<RelationshipTargetType>('npc');
	let selectedNpcId=$state('');
	let npcRole=$state('');
	let npcDescription=$state('');
	function chooseNpc(){const npc=knownNpcs.find(n=>n.id===selectedNpcId);targetName=npc?.name??'';npcRole=npc?.role??'';npcDescription=npc?.description??'';}
	let targetName = $state('');
	let relation = $state('');
	let notes = $state('');
	let formError = $state('');
	let connectionDialog = $state<HTMLDialogElement>();
	let linkForm = $state<HTMLFormElement>();
	async function addFromNode(node: {id:string; name:string; type:RelationshipTargetType}) {
		if (!editable || !connectionDialog || !linkForm) return;
		formError = ''; relation = ''; notes = ''; selectedNpcId=''; npcRole=''; npcDescription='';
		if (node.type === 'character') {
			sourceType = 'character';
			characterId = node.id.slice('character:'.length);
			targetType = 'npc'; targetName = '';
		} else {
			sourceType = node.type; sourceName = node.name;
			targetType = 'npc'; targetName = '';
		}
		connectionDialog.showModal();
		await tick();
		linkForm.querySelector<HTMLInputElement>('input[name=target-name]')?.focus();
	}


	$effect(() => {
		if (!characterId && characters.length) characterId = characters[0].id;
	});

	const displayedLinks = $derived.by(() => {
		if (!ownerCharacterId) return links;
		return getPersonalRelationshipWeb(links,ownerCharacterId);
	});

	const knownNpcs=$derived([...new Map([...(ownerCharacterId?[]:npcs),...relationshipNpcs(ownerCharacterId?displayedLinks:links)].map(n=>[n.id,n])).values()]);

	const groups = $derived.by(() => {
		const result = new Map<string, { name: string; type: RelationshipTargetType; links: RelationshipLink[] }>();
		for (const link of displayedLinks) {
			const group = result.get(link.targetId) ?? { name: link.targetName, type: link.targetType, links: [] };
			group.links.push(link);
			result.set(link.targetId, group);
		}
		return [...result.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
	});

	async function addLink(event: SubmitEvent) {
		event.preventDefault();
		const sourceKnownNpc=sourceType==='npc'?knownNpcs.find(n=>n.name.toLocaleLowerCase('ru')===sourceName.trim().toLocaleLowerCase('ru')):undefined;
		const source = sourceType === 'character' ? characters.find((character) => character.id === characterId) : sourceName.trim() ? {id:sourceKnownNpc?.id??(sourceType==='npc'?`npc:${crypto.randomUUID()}`:`${sourceType}:${sourceName.trim().toLocaleLowerCase('ru')}`),name:sourceName.trim()} : undefined;
		const cleanTargetName = targetName.trim();
		if (!source || !cleanTargetName) {
			formError = 'Укажите обе стороны новой связи.';
			return;
		}
		const targetCharacter = targetType === 'character' ? characters.find((character) => character.id === cleanTargetName) : null;
		if (targetType === 'character' && !targetCharacter) {
			formError = 'Выберите персонажа для связи.';
			return;
		}
		const name = targetCharacter?.name ?? cleanTargetName;
		const knownNpc=targetType==='npc'?knownNpcs.find(n=>n.id===selectedNpcId||n.name.toLocaleLowerCase('ru')===name.toLocaleLowerCase('ru')):undefined;
		const id = targetCharacter?.id ?? knownNpc?.id ?? (targetType==='npc'?`npc:${crypto.randomUUID()}`:`${targetType}:${name.toLocaleLowerCase('ru')}`);
		const sourceNpc=sourceType==='npc'?(sourceKnownNpc??{id:source.id,name:source.name,role:'',description:''}):undefined;
		const targetNpc=targetType==='npc'?{id,name,role:npcRole.trim()||knownNpc?.role||'',description:npcDescription.trim()||knownNpc?.description||''}:undefined;
		if (sourceType === targetType && source.id === id) { formError = 'Выберите другую сторону: связь с самим собой не нужна.'; return; }
		const next: RelationshipLink = {
			id: crypto.randomUUID(), characterId: source.id, characterName: source.name,
			...(sourceType !== 'character' ? {sourceType} : {}),
			...(sourceNpc?{sourceNpc}:{}),...(targetNpc?{targetNpc}:{}),
			targetType, targetId: id, targetName: name, relation: relation.trim(), notes: notes.trim()
		};
		const updatedNpcs=[...new Map([...knownNpcs,...[sourceNpc,targetNpc].filter((n):n is RelationshipNpc=>!!n)].map(n=>[n.id,n])).values()];
		try { await onChange?.([...links, next],updatedNpcs); }
		catch(error){formError=error instanceof Error?error.message:'Не удалось сохранить связь.';return;}
		connectionDialog?.close();
		targetName = '';
		relation = '';
		notes = '';
		formError = '';
	}

	async function removeLink(id: string) {
		if(id.startsWith('book:'))return;
		try{await onChange?.(links.filter((link) => link.id !== id),knownNpcs);}catch(error){formError=error instanceof Error?error.message:'Не удалось удалить связь.';}
	}
</script>

<div class="space-y-4">
	<datalist id="world-sides">{#each BOOK_FACTIONS as faction}<option value={faction.short}></option>{/each}{#each BOOK_RELATIONSHIP_JOBS as job}<option value={job.title}></option>{/each}{#each knownNpcs as npc}<option value={npc.name}></option>{/each}</datalist>
	{#if !ownerCharacterId}<BookRelationships onRemove={editable ? removeLink : undefined} links={links} onAdd={editable ? addFromNode : undefined} />{/if}
	{#if editable}
		<button type="button" class="px-4 py-2 border rounded" onclick={()=>{formError='';selectedNpcId='';npcRole='';npcDescription='';targetName='';targetType='npc';connectionDialog?.showModal();}}>Добавить связь</button>
		<dialog bind:this={connectionDialog} class="connection-dialog" aria-labelledby="connection-title">
		<div class="dialog-heading"><h3 id="connection-title">Новая связь</h3><button type="button" aria-label="Закрыть окно новой связи" onclick={()=>connectionDialog?.close()}>×</button></div>
		<form class="space-y-3" bind:this={linkForm} onsubmit={addLink}>
			<p class="text-sm">Добавьте участника в паутину или выберите сохранённого НИПа.</p>
			<div class="grid gap-3 sm:grid-cols-2">
				<label class="block text-sm">От кого
					<select class="mt-1 w-full rounded border px-3 py-2" bind:value={sourceType}>
						<option value="character">Персонаж</option><option value="npc">НИП</option><option value="organization">Организация или община</option><option value="quest">Поручение или цель</option>
					</select>
				</label>
				{#if sourceType==='character'}
				<label class="block text-sm">Персонаж
					<select class="mt-1 w-full rounded border px-3 py-2" bind:value={characterId} required><option value="" disabled>Выберите персонажа</option>{#each characters as character (character.id)}<option value={character.id}>{character.name}</option>{/each}</select>
				</label>
				{:else}<label class="block text-sm">От кого: название<input class="mt-1 w-full rounded border px-3 py-2" bind:value={sourceName} list="world-sides" required maxlength="100" /></label>{/if}
				<label class="block text-sm">Тип связи
					<select class="mt-1 w-full rounded border px-3 py-2" bind:value={targetType}>
						<option value="organization">Организация или община</option>
						<option value="quest">Поручение или общая цель</option>
						<option value="character">Другой персонаж</option><option value="npc">НИП</option>
					</select>
				</label>
				{#if targetType==='npc'&&knownNpcs.length}<label class="block text-sm sm:col-span-2">Сохранённый НИП<select class="mt-1 w-full rounded border px-3 py-2" bind:value={selectedNpcId} onchange={chooseNpc}><option value="">Создать нового НИПа</option>{#each knownNpcs as npc (npc.id)}<option value={npc.id}>{npc.name}{npc.role?` · ${npc.role}`:''}</option>{/each}</select></label>{/if}
				{#if targetType === 'character'}
					<label class="block text-sm sm:col-span-2">С кем связан
						<select class="mt-1 w-full rounded border px-3 py-2" bind:value={targetName} required>
							<option value="" disabled>Выберите персонажа</option>
							{#each characters.filter((character) => sourceType !== 'character' || character.id !== characterId) as character (character.id)}<option value={character.id}>{character.name}</option>{/each}
						</select>
					</label>
				{:else}
					<label class="block text-sm sm:col-span-2">{targetType==='npc'?'Имя НИПа':'Название организации или поручения'}
						<input class="mt-1 w-full rounded border px-3 py-2" name="target-name" readonly={targetType==='npc' && !!selectedNpcId} bind:value={targetName} list="world-sides" maxlength="100" placeholder={targetType==='npc'?'Например: Гаврила Златобород':targetType === 'quest' ? 'Например: найти пропавший обоз' : 'Например: община воров'} required />
					</label>
				{/if}
				{#if targetType==='npc'}
				<label class="block text-sm sm:col-span-2">Роль НИПа<input class="mt-1 w-full rounded border px-3 py-2" bind:value={npcRole} maxlength="120" placeholder="Кузнец, староста, проводник…" /></label>
				<label class="block text-sm sm:col-span-2">Описание НИПа<textarea class="mt-1 w-full rounded border px-3 py-2" bind:value={npcDescription} maxlength="2000" rows="3" placeholder="Внешность, характер, что важно помнить…"></textarea></label>
				{/if}
				<label class="block text-sm">Какова связь
					<input class="mt-1 w-full rounded border px-3 py-2" bind:value={relation} maxlength="120" placeholder="Получает поручения, состоит в круге…" />
				</label>
				<label class="block text-sm">Подробности
					<input class="mt-1 w-full rounded border px-3 py-2" bind:value={notes} maxlength="300" placeholder="Контакт, условия, тайна…" />
				</label>
			</div>
			{#if formError}<p class="text-sm text-red-700" role="alert">{formError}</p>{/if}
			<button type="submit" class="rounded bg-green-800 px-4 py-2 text-white hover:bg-green-900" disabled={sourceType==='character' && !characters.length}>Добавить связь</button>
		</form></dialog>
	{/if}

	{#if knownNpcs.length}<details class="npc-register"><summary>НИПы · {knownNpcs.length}</summary><div class="npc-cards">{#each knownNpcs as npc (npc.id)}<article><h3>{npc.name}</h3>{#if npc.role}<p class="npc-role">{npc.role}</p>{/if}{#if npc.description}<p>{npc.description}</p>{/if}{#if editable}<button type="button" class="px-3 py-2 border rounded" onclick={()=>addFromNode({id:`npc:${npc.id}`,name:npc.name,type:'npc'})}>Новая связь с НИПом</button>{/if}</article>{/each}</div></details>{/if}

	{#if ownerCharacterId && groups.length}
		<RelationshipGraph links={displayedLinks} {ownerCharacterId} onRemove={editable ? removeLink : undefined} onAdd={editable ? addFromNode : undefined} />
		<details><summary class="cursor-pointer py-2 font-semibold">Все связи списком</summary>
		<div class="grid gap-3 lg:grid-cols-2">
			{#each groups as group (group.name + group.type)}
				<section class="rounded-lg border bg-white p-4" aria-label="Связи: {group.name}">
					<div class="mb-3 flex items-start justify-between gap-2">
						<div>
						<span class="text-xs uppercase tracking-wide text-gray-500">{relationshipTargetLabel(group.type)}</span>
						<h3 class="text-lg font-semibold">{group.name}</h3>
						</div>
						<span aria-hidden="true" class="text-xl text-amber-700">◈</span>
					</div>
					<ul class="space-y-2">
						{#each group.links as link (link.id)}
							<li class="flex items-start justify-between gap-3 rounded border-l-2 border-amber-600 bg-amber-50/60 px-3 py-2">
								<div class="min-w-0">
									<p class="font-medium">{link.characterName}{link.relation ? ` · ${link.relation}` : ''}</p>
									{#if link.notes}<p class="mt-1 text-sm text-gray-600">{link.notes}</p>{/if}
								</div>
								{#if editable}<button type="button" class="shrink-0 rounded border px-2 py-1 text-sm text-red-800 hover:bg-red-50" aria-label="Удалить связь персонажа {link.characterName} с {group.name}" onclick={() => removeLink(link.id)}>Удалить</button>{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
		</details>
	{:else if ownerCharacterId}
		<p class="rounded-lg border border-dashed p-6 text-center text-gray-600">
			{editable ? 'Паутина пока пуста. Добавьте первую связь персонажа с организацией, поручением или другим участником.' : 'У этого персонажа пока нет связей в паутине комнаты.'}
		</p>
	{/if}
</div>

<style>
 .connection-dialog{position:fixed;inset:0;margin:auto;width:min(640px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;border:1px solid #a99267;border-radius:12px;background:#fbf4e4;color:#263e32;padding:22px;box-shadow:0 20px 90px #0006;}.connection-dialog::backdrop{background:#14261dcc;backdrop-filter:blur(3px);}.dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px;}.dialog-heading h3{font:28px Georgia,serif;margin:0;}.dialog-heading button{width:38px;height:38px;border:1px solid #b6a27b;border-radius:50%;background:transparent;font-size:25px;}.npc-register{padding:14px 0;border-top:1px solid #c7b58e;}.npc-register summary{cursor:pointer;font-weight:600;}.npc-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;margin-top:14px;}.npc-cards article{padding:16px;border:1px solid #c7b58e;border-radius:8px;}.npc-cards h3{font:22px Georgia,serif;margin:0;}.npc-cards p{font-size:14px;white-space:pre-line;margin:8px 0;}.npc-role{opacity:.75;}
</style>
