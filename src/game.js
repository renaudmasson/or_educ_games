class Game {
    constructor() {
        this.currentLevel = 1;
        this.levels = [6, 8, 12, 15, 20];
        this.graph = null;
        this.renderer = new Renderer("game-svg");
        this.currentPath = [];
        this.optimalPath = null;
        this.isAnimating = false;
        this.algoSteps = [];
        this.currentAlgoStep = 0;
        this.isPaused = true;
        this.animationTimer = null;

        this.initTheme();
        this.initEventListeners();
        this.loadLevel(1);
    }

    initTheme() {
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        this.updateThemeButton(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        this.updateThemeButton(newTheme);
    }

    updateThemeButton(theme) {
        const btn = document.getElementById("theme-toggle");
        if (btn) {
            btn.textContent = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
        }
    }

    initEventListeners() {
        document.getElementById("reset-btn").addEventListener("click", () => this.resetLevel());
        document.getElementById("solution-btn").addEventListener("click", () => this.showSolution());
        document.getElementById("next-level-btn").addEventListener("click", () => this.nextLevel());
        document.getElementById("next-level-btn-ui").addEventListener("click", () => this.nextLevel());
        document.getElementById("theme-toggle").addEventListener("click", () => this.toggleTheme());
        document.getElementById("review-level-btn").addEventListener("click", () => {
            document.getElementById("message-banner").classList.add("hidden");
        });

        // Algo controls
        document.getElementById("close-algo-btn").addEventListener("click", () => this.stopAnimation());
        document.getElementById("algo-play-pause").addEventListener("click", () => this.toggleAnimation());
        document.getElementById("algo-step").addEventListener("click", () => this.stepAnimation());
        document.getElementById("algo-skip").addEventListener("click", () => this.skipAnimation());
    }

    loadLevel(level) {
        this.currentLevel = level;
        document.getElementById("current-level").textContent = level;
        
        // Hide next level UI button when starting a new level
        document.getElementById("next-level-btn-ui").classList.add("hidden");
        this.stopAnimation();
        
        const nodeCount = this.levels[level - 1];
        const minHops = level + 1; // Level 1: 2, Level 2: 3, Level 3: 4, Level 4: 5, Level 5: 6
        this.graph = Graph.generate(nodeCount, 800, 500, minHops);
        this.optimalPath = this.graph.getShortestPath(0, nodeCount - 1);
        
        this.resetLevel();
    }

    resetLevel() {
        if (this.isAnimating) this.stopAnimation();
        this.currentPath = [0]; // Start at source
        this.updateUI();
        this.renderer.drawGraph(this.graph, (id) => this.handleNodeClick(id));
        this.renderer.highlightPath(this.currentPath, this.graph);
        document.getElementById("message-banner").classList.add("hidden");
    }

    handleNodeClick(nodeId) {
        if (this.isAnimating) return;

        // Check if node is already in path
        const index = this.currentPath.indexOf(nodeId);
        if (index !== -1) {
            // Truncate path
            this.currentPath = this.currentPath.slice(0, index + 1);
        } else {
            // Check if it's a neighbor of the last node in path
            const lastNodeId = this.currentPath[this.currentPath.length - 1];
            const neighbors = this.graph.adj.get(lastNodeId);
            const edge = neighbors.find(n => n.to === nodeId);
            
            if (edge) {
                this.currentPath.push(nodeId);
            }
        }

        this.renderer.highlightPath(this.currentPath, this.graph);
        this.updateUI();
        this.checkWinCondition();
    }

    updateUI() {
        let length = 0;
        for (let i = 0; i < this.currentPath.length - 1; i++) {
            const u = this.currentPath[i];
            const v = this.currentPath[i+1];
            const edge = this.graph.adj.get(u).find(n => n.to === v);
            length += edge.weight;
        }
        document.getElementById("path-length").textContent = length;
    }

    checkWinCondition() {
        const lastNodeId = this.currentPath[this.currentPath.length - 1];
        const targetId = this.graph.nodes.length - 1;

        if (lastNodeId === targetId) {
            let currentLength = parseInt(document.getElementById("path-length").textContent);
            if (currentLength === this.optimalPath.length) {
                document.getElementById("message-banner").classList.remove("hidden");
                document.getElementById("next-level-btn-ui").classList.remove("hidden");
                if (this.currentLevel === 5) {
                    document.getElementById("banner-title").textContent = "Grand Master!";
                    document.getElementById("banner-message").textContent = "You completed all levels optimally!";
                    document.getElementById("next-level-btn").textContent = "Restart Game";
                } else {
                    document.getElementById("banner-title").textContent = "Congratulations!";
                    document.getElementById("banner-message").textContent = "You found the shortest path!";
                    document.getElementById("next-level-btn").textContent = "Next Level";
                }
            }
        }
    }

    showSolution() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.isPaused = true;
        this.currentAlgoStep = 0;
        
        const { steps } = this.graph.dijkstra(0);
        this.algoSteps = steps;
        
        this.renderer.prepareDijkstraAnimation(this.graph);
        document.getElementById("algo-modal").classList.remove("hidden");
        document.getElementById("step-description").textContent = "Click Play or Step to begin.";
        document.getElementById("algo-play-pause").textContent = "▶ Play";
    }

    toggleAnimation() {
        if (!this.isAnimating) return;
        
        this.isPaused = !this.isPaused;
        document.getElementById("algo-play-pause").textContent = this.isPaused ? "▶ Play" : "⏸ Pause";
        
        if (!this.isPaused) {
            this.runAnimationLoop();
        } else {
            clearTimeout(this.animationTimer);
        }
    }

    runAnimationLoop() {
        if (this.isPaused || !this.isAnimating) return;
        
        if (this.currentAlgoStep < this.algoSteps.length) {
            this.stepAnimation();
            this.animationTimer = setTimeout(() => this.runAnimationLoop(), 600);
        } else {
            this.finishAnimation();
        }
    }

    stepAnimation() {
        if (!this.isAnimating || this.currentAlgoStep >= this.algoSteps.length) return;
        
        const step = this.algoSteps[this.currentAlgoStep];
        this.renderer.renderDijkstraStep(step);
        this.currentAlgoStep++;

        if (this.currentAlgoStep >= this.algoSteps.length && !this.isPaused) {
            this.finishAnimation();
        }
    }

    skipAnimation() {
        if (!this.isAnimating) return;
        
        while (this.currentAlgoStep < this.algoSteps.length) {
            const step = this.algoSteps[this.currentAlgoStep];
            this.renderer.renderDijkstraStep(step);
            this.currentAlgoStep++;
        }
        this.finishAnimation();
    }

    finishAnimation() {
        clearTimeout(this.animationTimer);
        this.isPaused = true;
        document.getElementById("step-description").textContent = "Algorithm complete!";
        document.getElementById("algo-play-pause").textContent = "▶ Play";
        
        // Highlight the actual shortest path
        this.renderer.highlightPath(this.optimalPath.path, this.graph);
    }

    stopAnimation() {
        clearTimeout(this.animationTimer);
        this.isAnimating = false;
        this.isPaused = true;
        const modal = document.getElementById("algo-modal");
        if (modal) modal.classList.add("hidden");
        
        // Reset view to current user path if not finished and graph exists
        if (this.graph) {
            this.renderer.drawGraph(this.graph, (id) => this.handleNodeClick(id));
            this.renderer.highlightPath(this.currentPath, this.graph);
        }
    }

    nextLevel() {
        if (this.currentLevel < 5) {
            this.loadLevel(this.currentLevel + 1);
        } else {
            this.loadLevel(1);
        }
    }
}

// Start the game
window.addEventListener("DOMContentLoaded", () => {
    new Game();
});
