class Graph {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.adj = new Map();
        // More vibrant colors to avoid them looking grey
        this.arcColors = ["#FF595E", "#FFCA3A", "#8AC926", "#1982C4", "#6A4C93", "#FF924C", "#118AB2", "#D4A373"];
    }

    addNode(id, x, y, isSource = false, isTarget = false) {
        const node = { id, x, y, isSource, isTarget };
        this.nodes.push(node);
        this.adj.set(id, []);
        return node;
    }

    addEdge(u, v, weight, minHops = 0) {
        // Prevent duplicate edges
        if (this.adj.get(u).some(edge => edge.to === v)) return false;
        
        const nodeU = this.nodes.find(n => n.id === u);
        const nodeV = this.nodes.find(n => n.id === v);

        // No direct arc from source to target
        if ((nodeU.isSource && nodeV.isTarget) || (nodeU.isTarget && nodeV.isSource)) return false;

        // Ensure arc doesn't go through any other node
        for (const node of this.nodes) {
            if (node.id === u || node.id === v) continue;
            if (this.isNodeOnArc(node, nodeU, nodeV)) return false;
        }

        // Min hops requirement check
        if (minHops > 0) {
            const source = this.nodes.find(n => n.isSource);
            const target = this.nodes.find(n => n.isTarget);
            
            if (source && target) {
                // Temporary add to check hop count
                const tempEdge = { to: v, weight };
                const tempRevEdge = { to: u, weight };
                this.adj.get(u).push(tempEdge);
                this.adj.get(v).push(tempRevEdge);
                
                const hops = this.getShortestHopCount(source.id, target.id);
                
                // Remove temporary edges
                this.adj.get(u).pop();
                this.adj.get(v).pop();

                if (hops < minHops) return false;
            }
        }

        const edge = { from: u, to: v, weight, color: null };
        this.edges.push(edge);
        this.adj.get(u).push({ to: v, weight, edge });
        this.adj.get(v).push({ to: u, weight, edge });
        return true;
    }

    getShortestHopCount(startId, endId) {
        const queue = [[startId, 0]];
        const visited = new Set([startId]);
        
        while (queue.length > 0) {
            const [curr, dist] = queue.shift();
            if (curr === endId) return dist;
            
            for (const neighbor of this.adj.get(curr)) {
                if (!visited.has(neighbor.to)) {
                    visited.add(neighbor.to);
                    queue.push([neighbor.to, dist + 1]);
                }
            }
        }
        return Infinity;
    }

    isNodeOnArc(node, p, q, buffer = 25) {
        const x = node.x, y = node.y;
        const x1 = p.x, y1 = p.y;
        const x2 = q.x, y2 = q.y;

        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;
        if (param < 0) {
            xx = x1; yy = y1;
        } else if (param > 1) {
            xx = x2; yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy) < buffer;
    }

    static generate(nodeCount, width, height, minHops = 0) {
        const graph = new Graph();
        const padding = 60;
        const minDist = 100; // Increased distance
        const maxAttempts = 100;
        
        // 1. Create source and target
        graph.addNode(0, padding, height / 2, true, false);
        graph.addNode(nodeCount - 1, width - padding, height / 2, false, true);
        
        // 2. Create intermediate nodes
        for (let i = 1; i < nodeCount - 1; i++) {
            let x, y, tooClose;
            let attempts = 0;
            do {
                tooClose = false;
                x = padding + Math.random() * (width - 2 * padding);
                y = padding + Math.random() * (height - 2 * padding);
                for (const node of graph.nodes) {
                    const d = Math.sqrt((x - node.x)**2 + (y - node.y)**2);
                    if (d < minDist) { tooClose = true; break; }
                }
                attempts++;
            } while (tooClose && attempts < maxAttempts);
            graph.addNode(i, x, y);
        }
        
        // 3. Connect nodes (proximity-based + degree requirements)
        // Each node should have 3 to 5 arcs
        for (let i = 0; i < nodeCount; i++) {
            const nodeA = graph.nodes[i];
            const distances = [];
            for (let j = 0; j < nodeCount; j++) {
                if (i === j) continue;
                const nodeB = graph.nodes[j];
                const d = Math.sqrt((nodeA.x - nodeB.x)**2 + (nodeA.y - nodeB.y)**2);
                distances.push({ id: j, d });
            }
            distances.sort((a, b) => a.d - b.d);
            
            // Try to connect to at least 3 neighbors
            for (let k = 0; k < distances.length && graph.adj.get(i).length < 3; k++) {
                const neighborId = distances[k].id;
                if (graph.adj.get(neighborId).length < 5) {
                    const weight = Math.round(distances[k].d / 10 * (0.8 + Math.random() * 0.4));
                    graph.addEdge(i, neighborId, Math.max(1, weight), minHops);
                }
            }
        }
        
        // 4. Ensure connectivity
        if (!graph.isConnected()) {
            graph.makeConnected(minHops);
        }

        // 5. Final degree check and fill
        for (let i = 0; i < nodeCount; i++) {
            if (graph.adj.get(i).length < 3) {
                // Find nearest available
                const nodeA = graph.nodes[i];
                const available = graph.nodes
                    .filter(n => n.id !== i && graph.adj.get(n.id).length < 5 && !graph.adj.get(i).some(e => e.to === n.id))
                    .map(n => ({ id: n.id, d: Math.sqrt((nodeA.x - n.x)**2 + (nodeA.y - n.y)**2) }))
                    .sort((a, b) => a.d - b.d);
                
                for (let k = 0; k < available.length && graph.adj.get(i).length < 3; k++) {
                    const weight = Math.round(available[k].d / 10 * (0.8 + Math.random() * 0.4));
                    graph.addEdge(i, available[k].id, Math.max(1, weight), minHops);
                }
            }
        }

        graph.assignArcColors();
        return graph;
    }

    assignArcColors() {
        this.edges.forEach(edge => {
            const usedColors = new Set();
            
            // 1. Check adjacent arcs (sharing a node)
            this.adj.get(edge.from).forEach(adj => {
                if (adj.edge && adj.edge.color) usedColors.add(adj.edge.color);
            });
            this.adj.get(edge.to).forEach(adj => {
                if (adj.edge && adj.edge.color) usedColors.add(adj.edge.color);
            });

            // 2. Check crossing arcs
            this.edges.forEach(other => {
                if (other === edge || !other.color) return;
                if (this.arcsIntersect(edge, other)) {
                    usedColors.add(other.color);
                }
            });

            // Pick first available color
            for (const color of this.arcColors) {
                if (!usedColors.has(color)) {
                    edge.color = color;
                    break;
                }
            }
            if (!edge.color) edge.color = this.arcColors[0];
        });
    }

    arcsIntersect(e1, e2) {
        // Ignore arcs that share a vertex
        if (e1.from === e2.from || e1.from === e2.to || 
            e1.to === e2.from || e1.to === e2.to) return false;

        const p1 = this.nodes.find(n => n.id === e1.from);
        const q1 = this.nodes.find(n => n.id === e1.to);
        const p2 = this.nodes.find(n => n.id === e2.from);
        const q2 = this.nodes.find(n => n.id === e2.to);

        const ccw = (p, q, r) => {
            const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
            if (Math.abs(val) < 1e-9) return 0;
            return (val > 0) ? 1 : 2;
        };

        const o1 = ccw(p1, q1, p2);
        const o2 = ccw(p1, q1, q2);
        const o3 = ccw(p2, q2, p1);
        const o4 = ccw(p2, q2, q1);

        return (o1 !== o2 && o3 !== o4);
    }

    isConnected() {
        if (this.nodes.length === 0) return true;
        const visited = new Set();
        const queue = [this.nodes[0].id];
        visited.add(this.nodes[0].id);
        while (queue.length > 0) {
            const u = queue.shift();
            for (const neighbor of this.adj.get(u)) {
                if (!visited.has(neighbor.to)) {
                    visited.add(neighbor.to);
                    queue.push(neighbor.to);
                }
            }
        }
        return visited.size === this.nodes.length;
    }

    makeConnected(minHops = 0) {
        let components = this.getComponents();
        let attempts = 0;
        const maxGlobalAttempts = 100;

        while (components.length > 1 && attempts < maxGlobalAttempts) {
            const c1 = components[0];
            const c2 = components[1];
            
            // Get all possible pairs between c1 and c2, sorted by distance
            const pairs = [];
            for (const id1 of c1) {
                for (const id2 of c2) {
                    const n1 = this.nodes.find(n => n.id === id1);
                    const n2 = this.nodes.find(n => n.id === id2);
                    if ((n1.isSource && n2.isTarget) || (n1.isTarget && n2.isSource)) continue;
                    
                    const d = Math.sqrt((n1.x - n2.x)**2 + (n1.y - n2.y)**2);
                    pairs.push({ u: id1, v: id2, d });
                }
            }
            pairs.sort((a, b) => a.d - b.d);

            let success = false;
            for (const pair of pairs) {
                const weight = Math.round(pair.d / 10 * (0.8 + Math.random() * 0.4));
                // addEdge returns true if added, false if rejected
                if (this.addEdge(pair.u, pair.v, Math.max(1, weight), minHops)) {
                    success = true;
                    break;
                }
            }

            if (!success) {
                // If no pair works, try connecting via an intermediate node
                const intermediates = this.nodes.filter(n => !n.isSource && !n.isTarget);
                for (const inter of intermediates) {
                    if (this.addEdge(c1[0], inter.id, 10, minHops)) {
                        success = true;
                        break;
                    }
                }
            }

            components = this.getComponents();
            attempts++;
        }
    }

    getComponents() {
        const components = [];
        const visited = new Set();
        for (const node of this.nodes) {
            if (!visited.has(node.id)) {
                const component = [];
                const queue = [node.id];
                visited.add(node.id);
                while (queue.length > 0) {
                    const u = queue.shift();
                    component.push(u);
                    for (const neighbor of this.adj.get(u)) {
                        if (!visited.has(neighbor.to)) {
                            visited.add(neighbor.to);
                            queue.push(neighbor.to);
                        }
                    }
                }
                components.push(component);
            }
        }
        return components;
    }

    dijkstra(sourceId) {
        const distances = {};
        const previous = {};
        const steps = [];
        const nodes = new Set();
        for (const node of this.nodes) {
            distances[node.id] = Infinity;
            previous[node.id] = null;
            nodes.add(node.id);
        }
        distances[sourceId] = 0;
        while (nodes.size > 0) {
            let u = null;
            for (const nodeId of nodes) {
                if (u === null || distances[nodeId] < distances[u]) u = nodeId;
            }
            if (u === null || distances[u] === Infinity) break;
            nodes.delete(u);
            steps.push({ type: 'visit', node: u, dist: distances[u] });
            for (const edge of this.adj.get(u)) {
                if (!nodes.has(edge.to)) continue;
                const alt = distances[u] + edge.weight;
                steps.push({ type: 'relax', from: u, to: edge.to, weight: edge.weight, oldDist: distances[edge.to], newDist: alt });
                if (alt < distances[edge.to]) {
                    distances[edge.to] = alt;
                    previous[edge.to] = u;
                }
            }
        }
        return { distances, previous, steps };
    }

    getShortestPath(sourceId, targetId) {
        const { distances, previous } = this.dijkstra(sourceId);
        const path = [];
        let curr = targetId;
        if (previous[curr] === null && curr !== sourceId) return null;
        while (curr !== null) {
            path.unshift(curr);
            curr = previous[curr];
        }
        return { path, length: distances[targetId] };
    }
}
