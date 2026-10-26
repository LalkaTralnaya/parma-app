<script lang="ts">
	import { layoutRelationships } from '$lib/engine/relationship-layout';
	import { plotNodeTypeLabel, type PlotNode, type PlotNodeType, type PlotEdge, type StoryPlotWeb } from '$lib/engine/story-plot-web';

	let { graph, disabled = false, onChange }: { graph: StoryPlotWeb; disabled?: boolean; onChange: (graph: StoryPlotWeb) => void | Promise<void> } = $props();
	let nodeType = $state<PlotNodeType>('event');
	let nodeName = $state('');
	let nodeDescription = $state('');
	let edgeFrom = $state('');
	let edgeTo = $state('');
	let edgeLabel = $state('');
	let edgeNotes = $state('');
	let status = $state('');

	const graphView = $derived.by(() => {
		const positions = layoutRelationships(graph.nodes.map(({ id, name }) => ({ id, name })), graph.edges.map(({ from, to }) => ({ source: from, target: to })));
		return { nodes: graph.nodes.map((node) => ({ ...node, ...positions.get(node.id) })), edges: graph.edges };
	});
	const nodeLabels: PlotNodeType[] = ['character', 'npc', 'organization', 'quest', 'location', 'clue', 'event', 'secret'];

	async function commit(next: StoryPlotWeb) {
		status = '';
		try { await onChange(next); }
		catch (error) { status = error instanceof Error ? error.message : 'Не удалось сохранить паутину сюжета.'; }
	}

	async function addNode(event: SubmitEvent) {
		event.preventDefault();
		const name = nodeName.trim();
		if (!name) return;
		const node: PlotNode = { id: crypto.randomUUID(), type: nodeType, name, description: nodeDescription.trim() };
		await commit({ ...graph, nodes: [...graph.nodes, node] });
		nodeName = ''; nodeDescription = '';
	}

	async function addEdge(event: SubmitEvent) {
		event.preventDefault();
		if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
		const edge: PlotEdge = { id: crypto.randomUUID(), from: edgeFrom, to: edgeTo, label: edgeLabel.trim(), notes: edgeNotes.trim() };
		await commit({ ...graph, edges: [...graph.edges, edge] });
		edgeFrom = ''; edgeTo = ''; edgeLabel = ''; edgeNotes = '';
	}

	async function removeEdge(id: string) { await commit({ ...graph, edges: graph.edges.filter((edge) => edge.id !== id) }); }
	async function removeNode(id: string) { await commit({ ...graph, nodes: graph.nodes.filter((node) => node.id !== id), edges: graph.edges.filter((edge) => edge.from !== id && edge.to !== id) }); }
	function node(id: string) { return graph.nodes.find((entry) => entry.id === id); }
</script>

<div class="plot-web">
	<div class="plot-intro"><p>Собирайте сюжет из персонажей, организаций, мест, событий, зацепок и тайн. Эти записи доступны только в пульте Сказителя и не попадают в комнату.</p></div>
	{#if graph.nodes.length}
		<div class="plot-canvas" aria-label="Паутина сюжета">
			<svg viewBox="0 0 1000 640" role="img" aria-label="Схема узлов сюжета и связей">
				{#each graphView.edges as edge (edge.id)}
					{@const a = graphView.nodes.find((entry) => entry.id === edge.from)}
					{@const b = graphView.nodes.find((entry) => entry.id === edge.to)}
					{#if a && b}{@const ax = a.x ?? 500}{@const ay = a.y ?? 320}{@const bx = b.x ?? 500}{@const by = b.y ?? 320}<line x1={ax} y1={ay} x2={bx} y2={by} /><text x={(ax + bx) / 2} y={(ay + by) / 2 - 6}>{edge.label || 'связано'}</text>{/if}
				{/each}
				{#each graphView.nodes as plotNode (plotNode.id)}
					{@const fill = plotNode.type === 'character' ? '#4e8b7f' : plotNode.type === 'npc' ? '#677da4' : plotNode.type === 'quest' ? '#9b7290' : plotNode.type === 'secret' ? '#8b3448' : plotNode.type === 'clue' ? '#bd9855' : '#a18355'}
					<g><circle cx={plotNode.x} cy={plotNode.y} r={plotNode.r} fill={fill} /><text x={(plotNode.x ?? 500) + (plotNode.r ?? 8) + 8} y={(plotNode.y ?? 320) + 5}>{plotNode.name}</text><title>{plotNodeTypeLabel(plotNode.type)}: {plotNode.name}</title></g>
				{/each}
			</svg>
		</div>
	{/if}

	<div class="plot-forms">
		<form onsubmit={addNode}>
			<h3>Новый элемент сюжета</h3>
			<label>Тип<select bind:value={nodeType}>{#each nodeLabels as type}<option value={type}>{plotNodeTypeLabel(type)}</option>{/each}</select></label>
			<label>Название<input bind:value={nodeName} maxlength="120" required placeholder="Например: пропавший обоз" /></label>
			<label>Заметка<textarea bind:value={nodeDescription} maxlength="2000" rows="3" placeholder="Что знает Сказитель, зацепки и скрытая правда…"></textarea></label>
			<button type="submit" disabled={disabled}>Добавить элемент</button>
		</form>
		<form onsubmit={addEdge}>
			<h3>Соединить элементы</h3>
			<label>Откуда<select bind:value={edgeFrom} required><option value="" disabled>Выберите элемент</option>{#each graph.nodes as entry (entry.id)}<option value={entry.id}>{plotNodeTypeLabel(entry.type)} · {entry.name}</option>{/each}</select></label>
			<label>К чему<select bind:value={edgeTo} required><option value="" disabled>Выберите элемент</option>{#each graph.nodes.filter((entry) => entry.id !== edgeFrom) as entry (entry.id)}<option value={entry.id}>{plotNodeTypeLabel(entry.type)} · {entry.name}</option>{/each}</select></label>
			<label>Суть связи<input bind:value={edgeLabel} maxlength="120" placeholder="Например: скрывает, нанял, ведёт к…" /></label>
			<label>Заметка<textarea bind:value={edgeNotes} maxlength="2000" rows="3" placeholder="Условия, последствия, таймер или секрет…"></textarea></label>
			<button type="submit" disabled={disabled || graph.nodes.length < 2 || !edgeFrom || !edgeTo || edgeFrom === edgeTo}>Создать связь</button>
		</form>
	</div>

	{#if graph.nodes.length}
		<section class="plot-register" aria-label="Элементы паутины сюжета">
			<h3>Элементы и связи · {graph.nodes.length} / {graph.edges.length}</h3>
			<div class="plot-nodes">{#each graph.nodes as entry (entry.id)}<article><span>{plotNodeTypeLabel(entry.type)}</span><h4>{entry.name}</h4>{#if entry.description}<p>{entry.description}</p>{/if}<button type="button" disabled={disabled} onclick={() => removeNode(entry.id)}>Удалить элемент</button></article>{/each}</div>
			{#if graph.edges.length}<ul>{#each graph.edges as edge (edge.id)}<li><div><strong>{node(edge.from)?.name} → {node(edge.to)?.name}</strong>{#if edge.label}<span> · {edge.label}</span>{/if}{#if edge.notes}<p>{edge.notes}</p>{/if}</div><button type="button" disabled={disabled} onclick={() => removeEdge(edge.id)}>Удалить связь</button></li>{/each}</ul>{/if}
		</section>
	{:else}<p class="plot-empty">Паутина сюжета пока пуста. Добавьте несколько элементов и свяжите их.</p>{/if}
	{#if status}<p role="alert" class="plot-error">{status}</p>{/if}
</div>

<style>
	.plot-web{display:grid;gap:16px;color:#263e32}.plot-intro p{margin:0;color:#536355;font-size:14px}.plot-canvas{height:min(58vw,520px);min-height:340px;border:1px solid #c4b897;border-radius:8px;background:#f8f1e1;overflow:hidden}.plot-canvas svg{width:100%;height:100%}.plot-canvas line{stroke:#586e5e;stroke-opacity:.45;stroke-width:1.4}.plot-canvas text{fill:#263e32;font:12px system-ui,sans-serif;paint-order:stroke;stroke:#f8f1e1;stroke-width:4px;stroke-linejoin:round}.plot-canvas circle{stroke:#f8f1e1;stroke-width:2}.plot-forms{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:14px}.plot-forms form{display:grid;align-content:start;gap:10px;padding:16px;border:1px solid #c4b897;border-radius:8px;background:#fffdf7}.plot-forms h3,.plot-register h3{margin:0 0 4px;font:22px Georgia,serif}.plot-forms label{display:grid;gap:4px;font-size:13px}.plot-forms input,.plot-forms select,.plot-forms textarea{width:100%;padding:9px;border:1px solid #b9b09c;border-radius:5px;background:white;color:#263e32}.plot-forms button,.plot-nodes button,.plot-register li>button{justify-self:start;padding:8px 12px;border:1px solid #60715e;border-radius:5px;background:#244c3c;color:white}.plot-forms button:disabled,.plot-nodes button:disabled,.plot-register li>button:disabled{opacity:.5}.plot-empty{padding:28px;border:1px dashed #c4b897;border-radius:8px;text-align:center;color:#647064}.plot-register{display:grid;gap:12px}.plot-nodes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px}.plot-nodes article{padding:13px;border:1px solid #c4b897;border-radius:7px;background:#fffdf7}.plot-nodes article>span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#687469}.plot-nodes h4{margin:3px 0 8px;font:20px Georgia,serif}.plot-nodes p,.plot-register li p{margin:0 0 8px;white-space:pre-wrap;font-size:13px;color:#58675a}.plot-nodes button,.plot-register li>button{padding:5px 9px;font-size:12px}.plot-register ul{display:grid;gap:8px;margin:0;padding:0;list-style:none}.plot-register li{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px;border-left:2px solid #946f48;background:#f4efdf}.plot-register li>div{min-width:0}.plot-register li>button{flex:none;background:transparent;color:#713b3b;border-color:#b99c8f}.plot-error{margin:0;color:#a12626}@media(max-width:600px){.plot-canvas{height:380px;min-height:300px}.plot-register li{flex-direction:column}}
</style>
