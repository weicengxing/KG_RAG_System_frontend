import { Renderer } from './renderer.js'
import { gameConfig } from './config.js'

export class MultiplayerEngine {
  constructor(canvas, ws, role) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.ws = ws
    this.role = role
    this.renderer = new Renderer(this.ctx)

    this.gameState = {
      plants: [],
      zombies: [],
      projectiles: [],
      suns: []
    }

    this.selectedPlant = null
    this.setupInputHandlers()
  }

  updateState(state) {
    if (state.plants) this.gameState.plants = state.plants
    if (state.zombies) this.gameState.zombies = state.zombies
    if (state.projectiles) this.gameState.projectiles = state.projectiles
    if (state.suns) this.gameState.suns = state.suns
    this.render()
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = '#4a7c4e'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const grid = {
      rows: gameConfig.gridRows,
      cols: gameConfig.gridCols,
      cellWidth: gameConfig.cellWidth,
      cellHeight: gameConfig.cellHeight
    }

    this.renderer.drawGrid(grid)
    this.renderer.drawPlants(this.gameState.plants)
    this.renderer.drawZombies(this.gameState.zombies)
    this.renderer.drawProjectiles(this.gameState.projectiles)
    this.renderer.drawSuns(this.gameState.suns)
  }

  setupInputHandlers() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e))
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const col = Math.floor(x / gameConfig.cellWidth)
    const row = Math.floor(y / gameConfig.cellHeight)

    if (this.role === 'plant' && this.selectedPlant) {
      this.sendPlantAction(row, col, this.selectedPlant)
    }

    if (this.role === 'plant') {
      this.checkSunClick(x, y)
    }
  }

  sendPlantAction(row, col, plantType) {
    this.ws.send(JSON.stringify({
      type: `plant_place_${plantType}`,
      payload: { row, col, plant_type: plantType }
    }))
  }

  sendZombieAction(lane, zombieType) {
    this.ws.send(JSON.stringify({
      type: `zombie_spawn_${zombieType}`,
      payload: { lane, zombie_type: zombieType }
    }))
  }

  checkSunClick(x, y) {
    for (const sun of this.gameState.suns) {
      const dx = x - sun.x
      const dy = y - sun.y
      if (dx * dx + dy * dy < 625) {
        this.ws.send(JSON.stringify({
          type: 'plant_collect_sun',
          payload: { sun_id: sun.id }
        }))
        break
      }
    }
  }

  selectPlant(plantType) {
    this.selectedPlant = plantType
  }
}
