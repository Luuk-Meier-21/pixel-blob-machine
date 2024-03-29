/**
 * Cells, Neighbours and bridges:
 * 
 *  |   |   |   |
 *  | N | a |   |
 *  | b | C | b |
 *  |   | a | N |
 *  |   |   |   |
 * 
 * C: Cell, the cell that was interacted with last
 * N: Neighbour, a cell that is within a corner of C
 * a: Bridge A, a cell acting as a bridge between C and N (N.x, C.y)
 * b: Bridge B, a cell acting as a bridge between C and N (C.x, N.y)
 */

 function Cell(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.state = "default"; // default, active, bridge
    this.color = "transparent";
    this.corners = [0, 0, 0, 0];

    this.draw = () => {
        this.update();
        
        const cell = this.state === "bridge" ? this.drawBridge : this.drawCell;
        push();
        
        translate(this.x * size, this.y * size);
        switch (this.state) {
            case "active": this.drawActiveCell(); break;
            case "bridge": this.drawBridge(); break;
            case "default": this.drawCell(); break;
        }
        pop();
    }

    this.cleanCell = () => {
        fill("transparent")
        rect(0, 0, this.w, this.h);
    }

    this.drawCell = () => {
        const s = size;     // Size
        this.cleanCell();
        fill(255)
        rect(0, 0, this.w, this.h);
    }

    this.drawActiveCell = () => {
        const s = size;     // Size
        const c = roundCorners ? this.corners : [0, 0, 0, 0];
        this.cleanCell();
        push();
        fill(0)
        rect(0, 0, this.w, this.h, c[3], c[0], c[1], c[2]);
        pop();
    }

    this.drawBridge = () => {
        const p = this.getActiveCorners(this.x, this.y)
            .map((a, i) => a ? i : undefined)
            .filter(a => a !== undefined);
        const s = size / 2;
        const c = bezier / 2;
        this.cleanCell();
        if (showBridges) {
            fill(0)
            for (let i = 0; i < p.length; i++) {
                push();
                rotateCenter(size, size, p[i] * 90)
                translate(s, 0)
                beginShape();
                vertex(0, 0);
                bezierVertex(s-c, 0, s, c, s, s);
                vertex(s, 0);
                endShape(CLOSE);
                pop();
            }
        }
    }

    this.update = (after = () => {}) => {
        switch (this.state) {
            case "default":
                {
                    this.corners = [0, 0, 0, 0];
                    this.color = "transparent";
                    after();
                }
                break;
            case "active":
                {
                    this.corners = this.getCornerCurve();
                    this.updateBridges();
                    this.color = 0;
                    after();
                }
                break;
            case "bridge":
                {
                    this.updateBridges();
                    this.color = 200;
                    after();
                }
                break;
        }
    }

    this.interactionUpdate = () => {
        this.updateBridges();
        this.corners = this.getCornerCurve();
        this.update();
        this.draw();
    }

    this.getCornerCurve = () => this.getFreeCorners().map(a => a ? bezier : 0);

    this.updateBridges = () => {
        const setBridges = (condition, cy, cx, nx, ny) => {
            const intersectNeighbours = (cellX, cellY, neighbourX, neighbourY) => (
                [{ x: neighbourX, y: cellY }, { x: cellX, y: neighbourY }]
            );
            const switchState = (x, y, isMirror) => {
                if (
                    cell.state === "active" &&
                    neighbour.state === "active" &&
                    grid[x][y].state === "default"
                ) {
                    // Cell and target Neighbour are both active, 
                    // target cell for bridge is set to default state and this free to set to "bridge" state.
                    // Sets bridge target to "bridge" state
                    grid[x][y].state = "bridge";
                    
                } else if (
                    // For removing bridges when a active cell is removed form neighbours.
                    // Checks if cell is now "default" and if the bridges are still there for removal.
                    cell.state === "default" &&
                    grid[x][y].state === "bridge"
                ) {
                    grid[x][y].state = "default";
                }
            }
            const cell = grid[cy][cx];
            const neighbour = grid[nx][ny];
            const [bridgePosA, bridgePosB] = intersectNeighbours(cell.x, cell.y, neighbour.x, neighbour.y);
            if (condition) {
                switchState(bridgePosA.x, bridgePosA.y, false);
                switchState(bridgePosB.x, bridgePosB.y, true);
            } 
        }
        this.neighbours = this.getStateNeighbours(this.x, this.y, "active");
        if (this.neighbours[0]) setBridges(this.neighbours[0], x, y, x-1, y-1);
        if (this.neighbours[1]) setBridges(this.neighbours[1], x, y, x+1, y-1);
        if (this.neighbours[2]) setBridges(this.neighbours[2], x, y, x+1, y+1);
        if (this.neighbours[3]) setBridges(this.neighbours[3], x, y, x-1, y+1);
    }
  
    this.toggle = () => {
        if (this.state === "active") {
            this.state = "default";
        } else {
            this.state = "active";
        }
        // Updates final time so even default state can update:
        // this.updateBridges();
        this.interactionUpdate();
    }
  
    this.onClick = (mouseX, mouseY) => {
        const x = this.x * size;
        const y = this.y * size;
        if ((mouseX > x) && (mouseX < x+w) && (mouseY > y) && (mouseY < y+h)) {
            this.toggle();
            // console.log(this)
        } 
    }

    this.getActiveCorners = () => {
        const f = this.getStateFaces(this.x, this.y, "active");
        let c = [false, false, false, false]

        const d = (a, b) => { if (f[a] && f[b]) c[a] = true; }

        d(0, 1);
        d(1, 2);
        d(2, 3);
        d(3, 0);

        return c;
    }

    this.getFreeCorners = () => {
        const af = this.getStateFaces(this.x, this.y, "active");
        const an = this.getStateNeighbours(this.x, this.y, "active");
        let c = [true, true, true, true];

        const d = (a, b) => { if ((af[a] || af[b]) || an[b]) c[a] = false; }

        d(0, 1);
        d(1, 2);
        d(2, 3);
        d(3, 0);

        return c;
    }
  
    /**
     * Counting order:
     * 1 -— > 2
     *        |
     *        v
     * 3 < —— 4
     */

    const neighbourPositions = [
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x + 1, y + 1],
        [x - 1, y + 1],
    ];
    const facePositions = [
        [x    , y - 1],
        [x + 1, y    ],
        [x    , y + 1],
        [x - 1, y    ],
    ];

    // State getters:
    this.getStateFaces = (x, y, state) => facePositions.map(([x, y]) => 
        x >= 0 && 
        y >= 0 && 
        grid[x][y].state === state
    );
    this.getStateNeighbours = (x, y, state) => neighbourPositions.map(([x, y]) => 
        x >= 0 && 
        y >= 0 && 
        grid[x][y].state === state
    );

    // Deprecated State getters;
    this.getActiveNeighbours = (x, y) => this.getStateNeighbours(x, y, "active")
    this.getActiveFaces = (x, y) => this.getStateFaces(x, y, "active");
}