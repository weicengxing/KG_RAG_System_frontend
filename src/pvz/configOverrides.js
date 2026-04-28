import request from '../utils/request.js'
import { gameConfig, plantConfig, zombieConfig } from './config.js'

export const numericGameConfigKeys = [
  'initialSunEnergy',
  'sunFallInterval',
  'zombieSpawnInterval',
  'sunLifeTime',
  'sunValue',
  'gridCols',
  'gridRows',
  'cellWidth',
  'cellHeight',
  'multiplayerInitialSunEnergy',
  'multiplayerInitialZombieEnergy'
]

const applyNumericValues = (target, values = {}) => {
  Object.entries(values || {}).forEach(([key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      target[key] = value
    }
  })
}

export const flattenGameConfig = () => ({
  initialSunEnergy: gameConfig.initialSunEnergy,
  sunFallInterval: gameConfig.sunFallInterval,
  zombieSpawnInterval: gameConfig.zombieSpawnInterval,
  sunLifeTime: gameConfig.sunLifeTime,
  sunValue: gameConfig.sunValue,
  gridCols: gameConfig.gridCols,
  gridRows: gameConfig.gridRows,
  cellWidth: gameConfig.cellWidth,
  cellHeight: gameConfig.cellHeight,
  multiplayerInitialSunEnergy: gameConfig.multiplayer?.initialSunEnergy,
  multiplayerInitialZombieEnergy: gameConfig.multiplayer?.initialZombieEnergy
})

export const expandGameConfig = (flatGameConfig = {}) => {
  const game = { ...flatGameConfig }
  const multiplayerInitialSunEnergy = game.multiplayerInitialSunEnergy
  const multiplayerInitialZombieEnergy = game.multiplayerInitialZombieEnergy
  delete game.multiplayerInitialSunEnergy
  delete game.multiplayerInitialZombieEnergy

  if (typeof multiplayerInitialSunEnergy === 'number' && Number.isFinite(multiplayerInitialSunEnergy)) {
    game.multiplayerInitialSunEnergy = multiplayerInitialSunEnergy
  }
  if (typeof multiplayerInitialZombieEnergy === 'number' && Number.isFinite(multiplayerInitialZombieEnergy)) {
    game.multiplayerInitialZombieEnergy = multiplayerInitialZombieEnergy
  }
  return game
}

export const applyPvzConfigOverrides = (configData = {}) => {
  Object.entries(configData.plants || {}).forEach(([plantId, values]) => {
    if (plantConfig[plantId]) {
      applyNumericValues(plantConfig[plantId], values)
    }
  })

  Object.entries(configData.zombies || {}).forEach(([zombieId, values]) => {
    if (zombieConfig[zombieId]) {
      applyNumericValues(zombieConfig[zombieId], values)
    }
  })

  const gameValues = { ...(configData.game || {}) }
  const multiplayerInitialSunEnergy = gameValues.multiplayerInitialSunEnergy
  const multiplayerInitialZombieEnergy = gameValues.multiplayerInitialZombieEnergy
  delete gameValues.multiplayerInitialSunEnergy
  delete gameValues.multiplayerInitialZombieEnergy

  applyNumericValues(gameConfig, gameValues)

  if (!gameConfig.multiplayer) {
    gameConfig.multiplayer = {}
  }
  if (typeof multiplayerInitialSunEnergy === 'number' && Number.isFinite(multiplayerInitialSunEnergy)) {
    gameConfig.multiplayer.initialSunEnergy = multiplayerInitialSunEnergy
  }
  if (typeof multiplayerInitialZombieEnergy === 'number' && Number.isFinite(multiplayerInitialZombieEnergy)) {
    gameConfig.multiplayer.initialZombieEnergy = multiplayerInitialZombieEnergy
  }
}

export const loadPvzRuntimeConfig = async () => {
  const response = await request.get('/pvz/config')
  const configData = response.data?.data || {}
  applyPvzConfigOverrides(configData)
  return response.data
}
