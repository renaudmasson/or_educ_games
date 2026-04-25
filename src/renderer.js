class Renderer {
    constructor(svgId) {
        this.svg = document.getElementById(svgId);
        this.ns = "http://www.w3.org/2000/svg";
    }

    clear() {
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
    }

    drawGraph(graph, onNodeClick) {
        if (!graph) return;
        this.clear();
        const labelPositions = [];

        // 1. Draw all edge lines first (bottom layer)
        graph.edges.forEach(edge => {
            const from = graph.nodes.find(n => n.id === edge.from);
            const to = graph.nodes.find(n => n.id === edge.to);
            if (from && to) {
                this.drawEdgeLine(from, to, edge.color);
            }
        });

        // 2. Draw all edge labels (middle layer)
        graph.edges.forEach(edge => {
            const from = graph.nodes.find(n => n.id === edge.from);
            const to = graph.nodes.find(n => n.id === edge.to);
            if (from && to) {
                const pos = this.calculateLabelPosition(from, to, labelPositions);
                labelPositions.push(pos);
                this.drawEdgeLabel(pos.x, pos.y, edge.weight, edge.color);
            }
        });

        // 3. Draw all nodes (top layer)
        graph.nodes.forEach(node => {
            this.drawNode(node, onNodeClick);
        });
    }

    drawEdgeLine(from, to, color) {
        const id = `edge-${Math.min(from.id, to.id)}-${Math.max(from.id, to.id)}`;
        
        const line = document.createElementNS(this.ns, "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        line.setAttribute("class", "arc");
        line.setAttribute("id", id);
        line.setAttribute("stroke", color || "var(--arc-color)");
        this.svg.appendChild(line);
    }

    calculateLabelPosition(from, to, existingPositions) {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        
        let posX = midX;
        let posY = midY - 12; // Initial offset slightly above midpoint

        const minDist = 25; // Minimum distance between label centers
        const maxAttempts = 8;
        const offsetStep = 15;

        // Vector of the edge
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Perpendicular vector
        const px = -dy / length;
        const py = dx / length;

        let attempt = 0;
        let tooClose = true;

        while (tooClose && attempt < maxAttempts) {
            tooClose = false;
            for (const other of existingPositions) {
                const dist = Math.sqrt((posX - other.x) ** 2 + (posY - other.y) ** 2);
                if (dist < minDist) {
                    tooClose = true;
                    break;
                }
            }

            if (tooClose) {
                // Alternatingly push perpendicular to the edge
                const side = attempt % 2 === 0 ? 1 : -1;
                const multiplier = Math.floor(attempt / 2) + 1;
                posX = midX + px * offsetStep * multiplier * side;
                posY = (midY - 12) + py * offsetStep * multiplier * side;
                attempt++;
            }
        }

        return { x: posX, y: posY };
    }

    drawEdgeLabel(x, y, weight, color) {
        const rect = document.createElementNS(this.ns, "rect");
        rect.setAttribute("x", x - 12);
        rect.setAttribute("y", y - 8);
        rect.setAttribute("width", "24");
        rect.setAttribute("height", "16");
        rect.setAttribute("fill", "var(--label-bg)");
        rect.setAttribute("fill-opacity", "0.9");
        rect.setAttribute("rx", "3");

        const text = document.createElementNS(this.ns, "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y + 4);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("class", "arc-label");
        text.setAttribute("fill", color || "var(--secondary-color)");
        text.style.fill = color || "var(--secondary-color)";
        text.style.fontWeight = "bold";
        text.textContent = weight;

        this.svg.appendChild(rect);
        this.svg.appendChild(text);
    }

    drawNode(node, onClick) {
        const g = document.createElementNS(this.ns, "g");
        g.setAttribute("class", `node ${node.isSource ? 'source' : ''} ${node.isTarget ? 'target' : ''}`);
        g.setAttribute("id", `node-${node.id}`);
        g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
        
        const circle = document.createElementNS(this.ns, "circle");
        circle.setAttribute("r", "15");
        
        const text = document.createElementNS(this.ns, "text");
        text.setAttribute("dy", "5");
        text.setAttribute("text-anchor", "middle");
        text.textContent = node.isSource ? "S" : (node.isTarget ? "T" : node.id);

        const distLabel = document.createElementNS(this.ns, "text");
        distLabel.setAttribute("id", `dist-${node.id}`);
        distLabel.setAttribute("dy", "30");
        distLabel.setAttribute("text-anchor", "middle");
        distLabel.setAttribute("class", "dist-label hidden");
        distLabel.textContent = "∞";

        g.appendChild(circle);
        g.appendChild(text);
        g.appendChild(distLabel);

        g.addEventListener("click", () => onClick(node.id));
        this.svg.appendChild(g);
    }

    highlightPath(path, graph) {
        document.querySelectorAll(".arc").forEach(el => {
            el.classList.remove("highlight");
            el.style.strokeWidth = "2";
        });
        document.querySelectorAll(".node").forEach(el => el.classList.remove("active"));

        for (let i = 0; i < path.length; i++) {
            const nodeEl = document.getElementById(`node-${path[i]}`);
            if (nodeEl) nodeEl.classList.add("active");
            if (i < path.length - 1) {
                const u = path[i];
                const v = path[i+1];
                const edgeId = `edge-${Math.min(u, v)}-${Math.max(u, v)}`;
                const edgeEl = document.getElementById(edgeId);
                if (edgeEl) {
                    edgeEl.classList.add("highlight");
                    edgeEl.style.strokeWidth = "5";
                }
            }
        }
    }

    prepareDijkstraAnimation(graph) {
        document.querySelectorAll(".arc").forEach(el => el.classList.remove("highlight", "dijkstra"));
        document.querySelectorAll(".node").forEach(el => el.classList.remove("active", "visited"));
        document.querySelectorAll(".dist-label").forEach(el => {
            el.classList.remove("hidden");
            el.textContent = "∞";
        });
    }

    renderDijkstraStep(step) {
        const text = document.getElementById("step-description");
        if (step.type === 'visit') {
            const nodeEl = document.getElementById(`node-${step.node}`);
            nodeEl.classList.add("visited");
            const distEl = document.getElementById(`dist-${step.node}`);
            distEl.textContent = step.dist;
            text.textContent = `Visiting node ${step.node} (current distance: ${step.dist}).`;
        } else if (step.type === 'relax') {
            const edgeId = `edge-${Math.min(step.from, step.to)}-${Math.max(step.from, step.to)}`;
            const edgeEl = document.getElementById(edgeId);
            
            // Briefly highlight the edge being relaxed
            edgeEl.classList.add("dijkstra");
            setTimeout(() => edgeEl.classList.remove("dijkstra"), 400);

            if (step.newDist < step.oldDist) {
                text.textContent = `Found shorter path to ${step.to} via ${step.from}: ${step.newDist} < ${step.oldDist}.`;
            } else {
                text.textContent = `Checking path to ${step.to} via ${step.from}: ${step.newDist} >= ${step.oldDist} (no change).`;
            }
            const distEl = document.getElementById(`dist-${step.to}`);
            distEl.textContent = Math.min(step.oldDist, step.newDist);
        }
    }
}
