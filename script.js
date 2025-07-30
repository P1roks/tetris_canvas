function getRandomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1) + min)
}

class Tetris{
    /** @type {number[][]} */
    #board
    /** @type {number} */
    #height
    /** @type {number} */
    #width
    /** @type {number} */
    #widthUnit
    /** @type {number} */
    #heightUnit
    /** @type {CanvasRenderingContext2D} */
    #ctx
    /** @type {
     * coords: number[][]
     * color: number
     * }
     * */
    #currentShape
    /** @type {number} */
    #interval

    /** @type number[][][] */
    static #possibleShapes = [
        [[4, 0], [3, 0], [4, 1], [5, 0]], // T
        [[5, 0], [3, 0], [4, 0], [6, 0]], // I
        [[4, 0], [4, 1], [5, 0], [5, 1]], // O
        [[4, 1], [4, 0], [4, 2], [5, 2]], // L
        [[4, 1], [4, 0], [4, 2], [3, 2]], // J
        [[4, 1], [3, 0], [4, 0], [5, 1]], // Z
        [[4, 1], [5, 0], [4, 0], [3, 1]], // S
    ]
    /** @type {string[]} */
    static #colors = ["black", "red", "orange", "yellow", "green", "blue", "cyan", "purple"]

    /**
    * @param {HTMLCanvasElement} ctx 
    */
    constructor(ctx){
        this.#ctx = ctx.getContext("2d")
        this.#height = ctx.clientHeight
        this.#width = ctx.clientWidth
        ctx.width = this.#width
        ctx.height = this.#height
        this.#widthUnit = this.#width / 10
        this.#heightUnit = this.#height / 20
        this.#currentShape = null
        this.#board = Array(20).fill().map(() => Array(10).fill(0))
    }

    #redraw(){
        for(let y = 0; y < 20; y++){
            for(let x = 0; x < 10; x++){
                this.#ctx.strokeStyle = "white"
                this.#ctx.strokeRect( x * this.#widthUnit, y * this.#heightUnit, this.#widthUnit, this.#heightUnit)
                this.#drawAt(x, y, Tetris.#colors[this.#board[y][x]])
            }
        }
    }

    #checkLines(){
        let anyLinesCleared = false

        for(let row = 0; row < this.#board.length; row++){
            if(this.#board[row].every(color => color !== 0)){
                this.#board[row] = Array(10).fill(0)
                anyLinesCleared = true
            }
        }

        if(anyLinesCleared){
            for(let y = 18; y >= 0; y -= 1){
                for(let x = 0; x < 10; x += 1){
                    let downY = y
                    while(downY < 19 && this.#board[downY + 1][x] == 0) downY += 1
                    if(downY != y){
                        this.#board[downY][x] = this.#board[y][x]
                        this.#board[y][x] = 0
                    }
                }
            }
            // check if any blocks falling have created a full line
            this.#checkLines()
        }
    }

    #afterBlockPlace(){
        this.#checkLines()
        this.#redraw()
    }

    //rotate around the first coord
    #tryRotate(){
        const ogShape = structuredClone(this.#currentShape)
        const [ox, oy] = this.#currentShape.coords[0]
        for(let i = 1; i < this.#currentShape.coords.length; i++){
            const [px, py] = this.#currentShape.coords[i] 
            this.#currentShape.coords[i] = [oy + ox - py, px - ox + oy]
        }
        if(this.#currentShape.coords.some(([x,y]) => x < 0 || x > 9 || y < 0 || y > 19)){
            this.#currentShape = ogShape
        }
    }

    #moveCurrent(xDir, yDir){
        if(this.#currentShape.coords.some(([x, y]) => this.#board[y + yDir][x + xDir] !== 0)) return
        this.#currentShape.coords = this.#currentShape.coords.map(([x,y]) => [x + xDir, y + yDir])
    }

    /**
    * @param {number} x
    * @param {number} y
    */
    #drawAt(x, y, color = "black"){
        this.#ctx.fillStyle = color
        this.#ctx.fillRect(
            x * this.#widthUnit + 2,
            y * this.#heightUnit + 2,
            this.#widthUnit - 4,
            this.#heightUnit - 4
        )
    }

    /** @param {string} key */
    #uponKeyPress(key){
        if(this.#currentShape === null) return
        if(!["ArrowRight","a","w","s","d","ArrowUp","ArrowDown","ArrowLeft"].includes(key)) return

        this.#currentShape.coords.forEach(([x,y]) => this.#drawAt(x, y))

        switch(key){
            case "ArrowRight":
            case "d":
                this.#moveCurrent(1, 0)
                break
            case "ArrowLeft":
            case "a":
                this.#moveCurrent(-1, 0)
                break
            case "ArrowUp":
            case "w":
                this.#tryRotate()
                break
            case "ArrowDown":
            case "s":
                this.#tick()
                this.#refreshInterval()
                break
        }

        this.#currentShape.coords.forEach(([x,y]) => this.#drawAt(x,y, Tetris.#colors[this.#currentShape.color]))
    }

    #tick(){
        if(this.#currentShape){
            this.#currentShape.coords.forEach(([x,y]) => this.#drawAt(x, y))
            // check collision or bottom
            if(this.#currentShape.coords.some(([x,y]) => y === 19 || this.#board[y+1][x] !== 0)){
                // fix onto board
                this.#currentShape.coords.forEach(([x,y]) => this.#board[y][x] = this.#currentShape.color)
                this.#afterBlockPlace()
                this.#currentShape = null
                return
            } else {
                // move down
                this.#currentShape.coords = this.#currentShape.coords.map(([x,y]) => [x, y + 1])
            }
        }else{
            // spawn new
            this.#currentShape = {
                coords: Tetris.#possibleShapes[getRandomInt(0, Tetris.#possibleShapes.length - 1)],
                color: getRandomInt(1, Tetris.#colors.length - 1)
            }
            if(this.#currentShape.coords.some(([x,y]) => this.#board[y][x] !== 0)){
                this.#endGame()
                return
            }
        }
        // draw shape
        this.#currentShape.coords.forEach(([x,y]) => this.#drawAt(x, y, Tetris.#colors[this.#currentShape.color]))
    }

    #endGame(){
        clearInterval(this.#interval)
        alert("YOU HAVE LOST!")
    }

    #refreshInterval(gameSpeed = 1000){
        clearInterval(this.#interval)
        this.#interval = setInterval(() => this.#tick(), gameSpeed)
    }

    start(){
        this.#redraw()
        this.#redraw()
        document.addEventListener('keydown', e => this.#uponKeyPress(e.key))
        this.#refreshInterval()
    }
}

const game = new Tetris(document.getElementById("game"))
game.start()
