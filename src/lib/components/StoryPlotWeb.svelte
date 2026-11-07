<script lang="ts">
	import { layoutRelationships } from '$lib/engine/relationship-layout';
	import { plotNodeTypeLabel, type PlotNode, type PlotNodeType, type PlotEdge, type StoryPlotWeb } from '$lib/engine/story-plot-web';
	import { addSiverStoryPlotWeb, SIVER_PLOT_TEMPLATE_ID } from '$lib/rules/siver-plot-web';

	let { graph, disabled = false, onChange }: { graph: StoryPlotWeb; disabled?: boolean; onChange: (graph: StoryPlotWeb) => void | Promise<void> } = $props();
	const arrowId = $props.id();
	const nodeLabels: PlotNodeType[] = ['character', 'npc', 'organization', 'quest', 'location', 'clue', 'event', 'secret'];
	let selectedNodeId = $state('');
	let editingNodeId = $state('');
	let nodeType = $state<PlotNodeType>('event');
	let nodeName = $state('');
	let nodeDescription = $state('');
	let nodeOrigin = $state('');
	let nodeInclinations = $state('');
	let editingEdgeId = $state('');
	let edgeFrom = $state('');
	let edgeTo = $state('');
	let edgeLabel = $state('');
	let edgeNotes = $state('');
	let edgeCondition = $state('');
	let edgeConsequence = $state('');
	let status = $state('');
	let committing = $state(false);
	const busy = $derived(disabled || committing);
	const templateAdded = $derived(graph.templateIds?.includes(SIVER_PLOT_TEMPLATE_ID));
	const visibleEdges = $derived(selectedNodeId ? graph.edges.filter((edge) => edge.from === selectedNodeId || edge.to === selectedNodeId) : graph.edges);
	const visibleNodes = $derived.by(() => {
		if (!selectedNodeId) return graph.nodes;
		const ids = new Set([selectedNodeId, ...visibleEdges.flatMap((edge) => [edge.from, edge.to])]);
		return graph.nodes.filter((node) => ids.has(node.id));
	});
	const graphView = $derived.by(() => {
		const positions = layoutRelationships(visibleNodes, visibleEdges.map(({ from, to }) => ({ source: from, target: to })));
		const nodes = visibleNodes.map((node) => ({ ...node, ...positions.get(node.id)! }));
		const byId = new Map(nodes.map((node) => [node.id, node]));
		const edges = visibleEdges.flatMap((edge) => {
			const from = byId.get(edge.from);
			const to = byId.get(edge.to);
			if (!from || !to) return [];
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const distance = Math.max(1, Math.hypot(dx, dy));
			return [{ ...edge, fromNode: from, toNode: to, endX: to.x - dx / distance * (to.r + 5), endY: to.y - dy / distance * (to.r + 5) }];
		});
		return { nodes, edges };
	});

	async function commit(next: StoryPlotWeb): Promise<boolean> {
		if (busy) return false;
		committing = true;
		status = '';
		try {
			await onChange(next);
			return true;
		} catch (error) {
			status = error instanceof Error ? error.message : 'Не удалось сохранить паутину сюжета.';
			return false;
		} finally {
			committing = false;
		}
	}
	function resetNode() {
		editingNodeId = '';
		nodeType = 'event';
		nodeName = '';
		nodeDescription = '';
		nodeOrigin = '';
		nodeInclinations = '';
	}
	function editNode(node: PlotNode) {
		editingNodeId = node.id;
		nodeType = node.type;
		nodeName = node.name;
		nodeDescription = node.description;
		nodeOrigin = node.origin ?? '';
		nodeInclinations = node.inclinations ?? '';
		document.getElementById('plot-node-editor')?.scrollIntoView({ block: 'center' });
	}
	function resetEdge() {
		editingEdgeId = '';
		edgeFrom = '';
		edgeTo = '';
		edgeLabel = '';
		edgeNotes = '';
		edgeCondition = '';
		edgeConsequence = '';
	}
	function editEdge(edge: PlotEdge) {
		editingEdgeId = edge.id;
		edgeFrom = edge.from;
		edgeTo = edge.to;
		edgeLabel = edge.label;
		edgeNotes = edge.notes;
		edgeCondition = edge.condition ?? '';
		edgeConsequence = edge.consequence ?? '';
		document.getElementById('plot-edge-editor')?.scrollIntoView({ block: 'center' });
	}
	async function saveNode(event: SubmitEvent) {
		event.preventDefault();
		const name = nodeName.trim();
		if (!name) return;
		const node: PlotNode = {
			id: editingNodeId || crypto.randomUUID(), type: nodeType, name,
			description: nodeDescription.trim(), origin: nodeOrigin.trim(), inclinations: nodeInclinations.trim()
		};
		const nodes = editingNodeId ? graph.nodes.map((entry) => entry.id === editingNodeId ? node : entry) : [...graph.nodes, node];
		if (await commit({ ...graph, nodes })) resetNode();
	}
	async function saveEdge(event: SubmitEvent) {
		event.preventDefault();
		if (!edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
		const edge: PlotEdge = {
			id: editingEdgeId || crypto.randomUUID(), from: edgeFrom, to: edgeTo,
			label: edgeLabel.trim(), notes: edgeNotes.trim(), condition: edgeCondition.trim(), consequence: edgeConsequence.trim()
		};
		const edges = editingEdgeId ? graph.edges.map((entry) => entry.id === editingEdgeId ? edge : entry) : [...graph.edges, edge];
		if (await commit({ ...graph, edges })) resetEdge();
	}
	async function removeNode(id: string) {
		if (await commit({ ...graph, nodes: graph.nodes.filter((node) => node.id !== id), edges: graph.edges.filter((edge) => edge.from !== id && edge.to !== id) })) {
			if (selectedNodeId === id) selectedNodeId = '';
			if (editingNodeId === id) resetNode();
			if (edgeFrom === id || edgeTo === id) resetEdge();
		}
	}
	async function removeEdge(id: string) {
		if (await commit({ ...graph, edges: graph.edges.filter((edge) => edge.id !== id) }) && editingEdgeId === id) resetEdge();
	}
	function nodeNameById(id: string) {
		return graph.nodes.find((entry) => entry.id === id)?.name ?? 'Удалённый элемент';
	}
</script>

<div class="plot-web" aria-busy={busy}>
	<div class="plot-intro">
		<p>Паутина связывает происхождение, мотивы, склонности и возможные последствия. Стрелка показывает направление связи. Выберите узел, чтобы увидеть его окружение. Записи редактируются и доступны в пульте Сказителя.</p>
		{#if !templateAdded}
			<button type="button" disabled={busy} onclick={() => commit(addSiverStoryPlotWeb(graph))}>Добавить сюжет Сивера</button>
			<p>Добавит связи четырёх приключений к вашей паутине, сохранив существующие записи.</p>
		{/if}
	</div>
	{#if graph.nodes.length}
		<div class="plot-focus">
			<label>Показать связи элемента
				<select bind:value={selectedNodeId}>
					<option value="">Вся паутина</option>
					{#each graph.nodes as entry (entry.id)}<option value={entry.id}>{plotNodeTypeLabel(entry.type)} · {entry.name}</option>{/each}
				</select>
			</label>
			{#if selectedNodeId}<button type="button" onclick={() => selectedNodeId = ''}>Показать всё</button>{/if}
			<span>Видно {visibleNodes.length} из {graph.nodes.length} узлов · {visibleEdges.length} связей</span>
		</div>
		<div class="plot-canvas" aria-label="Паутина сюжета">
			<svg viewBox="0 0 1000 640" role="group" aria-label="Схема узлов сюжета и направленных связей">
				<defs><marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#586e5e" /></marker></defs>
				{#each graphView.edges as edge (edge.id)}
					<line x1={edge.fromNode.x} y1={edge.fromNode.y} x2={edge.endX} y2={edge.endY} marker-end={'url(#' + arrowId + ')'}>
						<title>{edge.fromNode.name} → {edge.toNode.name} · {edge.label}</title>
					</line>
					{#if selectedNodeId}<text class="plot-edge-label" x={(edge.fromNode.x + edge.toNode.x) / 2} y={(edge.fromNode.y + edge.toNode.y) / 2 - 6}>{edge.label || 'связано'}</text>{/if}
				{/each}
				{#each graphView.nodes as plotNode (plotNode.id)}
					{@const fill = plotNode.type === 'character' ? '#4e8b7f' : plotNode.type === 'npc' ? '#677da4' : plotNode.type === 'quest' ? '#9b7290' : plotNode.type === 'secret' ? '#8b3448' : plotNode.type === 'clue' ? '#bd9855' : '#a18355'}
					<g>
						<circle cx={plotNode.x} cy={plotNode.y} r={plotNode.r} fill={fill} />
						<text x={plotNode.x + plotNode.r + 8} y={plotNode.y + 5}>{plotNode.name}</text>
						<foreignObject x={plotNode.x - 18} y={plotNode.y - 18} width="36" height="36">
							<button type="button" class="plot-node-hit" aria-label={'Связи элемента ' + plotNode.name} aria-pressed={selectedNodeId === plotNode.id} onclick={() => selectedNodeId = selectedNodeId === plotNode.id ? '' : plotNode.id}></button>
						</foreignObject>
					</g>
				{/each}
			</svg>
		</div>
	{/if}
	<div class="plot-forms">
		<form id="plot-node-editor" onsubmit={saveNode}>
			<fieldset disabled={busy}>
				<legend>{editingNodeId ? 'Изменить элемент' : 'Новый элемент сюжета'}</legend>
				<label>Тип<select bind:value={nodeType}>{#each nodeLabels as type}<option value={type}>{plotNodeTypeLabel(type)}</option>{/each}</select></label>
				<label>Название<input bind:value={nodeName} maxlength="120" required /></label>
				<label>Откуда / место в истории<textarea bind:value={nodeOrigin} maxlength="2000" rows="2" placeholder="Родной город, община, место встречи…"></textarea></label>
				<label>Предрасположенности<textarea bind:value={nodeInclinations} maxlength="2000" rows="3" placeholder="Мотивы, привычки, чего боится и к чему склонен…"></textarea></label>
				<label>Заметка<textarea bind:value={nodeDescription} maxlength="2000" rows="3" placeholder="Что знает Сказитель, зацепки и скрытая правда…"></textarea></label>
				<div class="plot-actions"><button type="submit">{editingNodeId ? 'Сохранить элемент' : 'Добавить элемент'}</button>{#if editingNodeId}<button type="button" onclick={resetNode}>Отменить</button>{/if}</div>
			</fieldset>
		</form>
		<form id="plot-edge-editor" onsubmit={saveEdge}>
			<fieldset disabled={busy}>
				<legend>{editingEdgeId ? 'Изменить связь' : 'Соединить элементы'}</legend>
				<label>Откуда<select bind:value={edgeFrom} required><option value="" disabled>Выберите элемент</option>{#each graph.nodes as entry (entry.id)}<option value={entry.id}>{plotNodeTypeLabel(entry.type)} · {entry.name}</option>{/each}</select></label>
				<label>К чему<select bind:value={edgeTo} required><option value="" disabled>Выберите элемент</option>{#each graph.nodes.filter((entry) => entry.id !== edgeFrom) as entry (entry.id)}<option value={entry.id}>{plotNodeTypeLabel(entry.type)} · {entry.name}</option>{/each}</select></label>
				<label>Суть связи<input bind:value={edgeLabel} maxlength="120" placeholder="Связан, нанял, ведёт к…" /></label>
				<label>Условие<textarea bind:value={edgeCondition} maxlength="2000" rows="2" placeholder="При каком выборе или событии срабатывает…"></textarea></label>
				<label>Последствие<textarea bind:value={edgeConsequence} maxlength="2000" rows="2" placeholder="Что меняется для героев и мира…"></textarea></label>
				<label>Заметка<textarea bind:value={edgeNotes} maxlength="2000" rows="2" placeholder="Улики, сомнения и пояснения…"></textarea></label>
				<div class="plot-actions"><button type="submit" disabled={graph.nodes.length < 2 || !edgeFrom || !edgeTo || edgeFrom === edgeTo}>{editingEdgeId ? 'Сохранить связь' : 'Создать связь'}</button>{#if editingEdgeId}<button type="button" onclick={resetEdge}>Отменить</button>{/if}</div>
			</fieldset>
		</form>
	</div>
	{#if graph.nodes.length}
		<details class="plot-register" open={Boolean(selectedNodeId)}>
			<summary>Элементы и связи · {visibleNodes.length} / {visibleEdges.length}</summary>
			<div class="plot-nodes">
				{#each visibleNodes as entry (entry.id)}
					<article>
						<span>{plotNodeTypeLabel(entry.type)}</span><h4>{entry.name}</h4>
						{#if entry.origin}<h5>Откуда</h5><p>{entry.origin}</p>{/if}
						{#if entry.inclinations}<h5>Предрасположенности</h5><p>{entry.inclinations}</p>{/if}
						{#if entry.description}<p>{entry.description}</p>{/if}
						<div class="plot-actions">
							<button type="button" disabled={busy} onclick={() => editNode(entry)}>Изменить</button>
							<button type="button" disabled={busy} onclick={() => removeNode(entry.id)}>Удалить элемент</button>
						</div>
					</article>
				{/each}
			</div>
			{#if visibleEdges.length}
				<ul>
					{#each visibleEdges as edge (edge.id)}
						<li>
							<div>
								<strong>{nodeNameById(edge.from)} → {nodeNameById(edge.to)}</strong>
								{#if edge.label}<p>{edge.label}</p>{/if}
								{#if edge.condition}<h5>Условие</h5><p>{edge.condition}</p>{/if}
								{#if edge.consequence}<h5>Последствие</h5><p>{edge.consequence}</p>{/if}
								{#if edge.notes}<p>{edge.notes}</p>{/if}
							</div>
							<div class="plot-actions">
								<button type="button" disabled={busy} onclick={() => editEdge(edge)}>Изменить связь</button>
								<button type="button" disabled={busy} onclick={() => removeEdge(edge.id)}>Удалить связь</button>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</details>
	{:else}<p class="plot-empty">Паутина сюжета пока пуста. Добавьте элементы или готовый сюжет Сивера.</p>{/if}
	{#if status}<p role="alert" class="plot-error">{status}</p>{/if}
</div>

<style>
	.plot-web { display: grid; gap: 16px; color: #263e32; }
	.plot-intro p { margin: 0 0 8px; color: #536355; font-size: 14px; }
	.plot-focus { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; }
	.plot-focus label { flex: 1; min-width: 220px; }
	.plot-focus span { font-size: 12px; color: #536355; }
	label { display: grid; gap: 4px; font-size: 13px; }
	input, select, textarea { width: 100%; padding: 9px; border: 1px solid #b9b09c; border-radius: 5px; background: white; color: #263e32; }
	button { padding: 8px 12px; border: 1px solid #60715e; border-radius: 5px; background: #244c3c; color: white; cursor: pointer; }
	button:disabled { opacity: .5; cursor: default; }
	button:focus-visible, summary:focus-visible { outline: 2px solid #765d37; outline-offset: 3px; }
	.plot-canvas { height: min(58vw, 520px); min-height: 340px; border: 1px solid #c4b897; border-radius: 8px; background: #f8f1e1; overflow: hidden; }
	.plot-canvas svg { width: 100%; height: 100%; }
	.plot-canvas line { stroke: #586e5e; stroke-opacity: .45; stroke-width: 1.4; }
	.plot-canvas text { fill: #263e32; font: 12px system-ui, sans-serif; paint-order: stroke; stroke: #f8f1e1; stroke-width: 4px; stroke-linejoin: round; pointer-events: none; }
	.plot-canvas .plot-edge-label { font-size: 10px; }
	.plot-canvas circle { stroke: #f8f1e1; stroke-width: 2; }
	.plot-canvas .plot-node-hit { display: block; width: 36px; height: 36px; min-height: 0; padding: 0; border: 0; border-radius: 50%; background: transparent; }
	.plot-canvas .plot-node-hit:focus-visible { outline-offset: -2px; }
	.plot-forms { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 14px; }
	.plot-forms form { padding: 16px; border: 1px solid #c4b897; border-radius: 8px; background: #fffdf7; }
	.plot-forms fieldset { display: grid; align-content: start; gap: 10px; padding: 0; border: 0; min-width: 0; }
	.plot-forms legend { padding: 0 0 12px; font: 22px Georgia, serif; }
	.plot-actions { display: flex; flex-wrap: wrap; gap: 7px; }
	.plot-empty { padding: 28px; border: 1px dashed #c4b897; border-radius: 8px; text-align: center; color: #647064; }
	.plot-register { min-width: 0; }
	.plot-register summary { padding: 14px; border: 1px solid #c4b897; border-radius: 7px; cursor: pointer; font: 22px Georgia, serif; }
	.plot-nodes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 10px; margin-top: 12px; }
	.plot-nodes article { padding: 13px; border: 1px solid #c4b897; border-radius: 7px; background: #fffdf7; }
	.plot-nodes article > span { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #687469; }
	.plot-nodes h4 { margin: 3px 0 8px; font: 20px Georgia, serif; }
	h5 { margin: 8px 0 3px; font-weight: 600; font-size: 13px; }
	.plot-nodes p, .plot-register li p { margin: 0 0 8px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; color: #58675a; }
	.plot-register button { padding: 5px 9px; font-size: 12px; }
	.plot-register ul { display: grid; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none; }
	.plot-register li { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 10px; border-left: 2px solid #946f48; background: #f4efdf; }
	.plot-register li > div { min-width: 0; }
	.plot-register li > .plot-actions { flex-shrink: 0; max-width: 180px; }
	.plot-error { margin: 0; color: #a12626; }
	@media (max-width: 600px) { .plot-canvas { height: 380px; min-height: 300px; } .plot-register li { flex-direction: column; } }
</style>
