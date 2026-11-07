import type { PlotNode, PlotEdge } from './story-plot-web';
import { layoutRelationships } from './relationship-layout';

export interface PlotPosition {
	x: number;
	y: number;
	r: number;
	degree: number;
}

interface MovingNode extends PlotPosition {
	id: string;
	name: string;
	vx: number;
	vy: number;
	pinned: boolean;
}

/** Small deterministic force simulation shared by animation and drag handling. */
export class StoryPlotSimulation {
	private nodes: MovingNode[];
	private byId: Map<string, MovingNode>;
	private springs: { from: MovingNode; to: MovingNode }[];
	private remaining = 180;

	constructor(nodes: PlotNode[], edges: PlotEdge[]) {
		const layout = layoutRelationships(nodes, edges.map((edge) => ({ source: edge.from, target: edge.to })));
		this.nodes = nodes.map((node) => {
			const initial = layout.get(node.id)!;
			return {
				...initial,
				id: node.id,
				name: node.name,
				x: Number.isFinite(node.x) ? node.x! : initial.x,
				y: Number.isFinite(node.y) ? node.y! : initial.y,
				vx: 0,
				vy: 0,
				pinned: Boolean(node.pinned)
			};
		});
		this.byId = new Map(this.nodes.map((node) => [node.id, node]));
		this.springs = edges.flatMap((edge) => {
			const from = this.byId.get(edge.from);
			const to = this.byId.get(edge.to);
			return from && to && from !== to ? [{ from, to }] : [];
		});
	}

	get active(): boolean {
		return this.remaining > 0;
	}

	pin(id: string, x: number, y: number): void {
		const node = this.byId.get(id);
		if (!node || !Number.isFinite(x) || !Number.isFinite(y)) return;
		node.x = Math.max(-100000, Math.min(100000, x));
		node.y = Math.max(-100000, Math.min(100000, y));
		node.vx = 0;
		node.vy = 0;
		node.pinned = true;
		this.remaining = 180;
	}

	step(): void {
		if (!this.active) return;
		this.remaining--;
		for (let i = 0; i < this.nodes.length; i++) {
			const a = this.nodes[i];
			for (let j = i + 1; j < this.nodes.length; j++) {
				const b = this.nodes[j];
				let dx = a.x - b.x;
				let dy = a.y - b.y;
				if (Math.abs(dx) + Math.abs(dy) < .01) {
					dx = .1;
					dy = .2;
				}
				const distance = Math.max(8, Math.hypot(dx, dy));
				const force = 1500 / (distance * distance);
				a.vx += dx / distance * force;
				b.vx -= dx / distance * force;
				a.vy += dy / distance * force;
				b.vy -= dy / distance * force;
				if (Math.abs(dy) < 28 && Math.abs(dx) < Math.min(200, 60 + (a.name.length + b.name.length) * 3)) {
					const push = (28 - Math.abs(dy)) * .025 * (dy >= 0 ? 1 : -1);
					a.vy += push;
					b.vy -= push;
				}
			}
		}
		for (const { from, to } of this.springs) {
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const distance = Math.max(1, Math.hypot(dx, dy));
			const force = (distance - 150) * .009;
			from.vx += dx / distance * force;
			from.vy += dy / distance * force;
			to.vx -= dx / distance * force;
			to.vy -= dy / distance * force;
		}
		let speed = 0;
		for (const node of this.nodes) {
			if (node.pinned) {
				node.vx = 0;
				node.vy = 0;
				continue;
			}
			node.vx = (node.vx + (500 - node.x) * .0005) * .78;
			node.vy = (node.vy + (320 - node.y) * .0005) * .78;
			node.x += Math.max(-5, Math.min(5, node.vx));
			node.y += Math.max(-5, Math.min(5, node.vy));
			speed = Math.max(speed, Math.abs(node.vx) + Math.abs(node.vy));
		}
		if (speed < .025) this.remaining = 0;
	}

	settle(): void {
		while (this.active) this.step();
	}

	snapshot(): Record<string, PlotPosition> {
		return Object.fromEntries(this.nodes.map(({ id, x, y, r, degree }) => [id, { x, y, r, degree }]));
	}
}
