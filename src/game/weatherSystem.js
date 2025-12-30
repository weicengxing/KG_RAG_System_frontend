import * as THREE from 'three'

export function createWeatherSystem(scene) {
  let current = null
  let rainSystem = null
  let rainPositions = null
  let snowSystem = null
  let snowPositions = null

  const setSky = (colorHex, fogColorHex, fogNear, fogFar, fogDensity) => {
    scene.background = new THREE.Color(colorHex)
    if (typeof fogDensity === 'number') {
      scene.fog = new THREE.FogExp2(fogColorHex, fogDensity)
    } else {
      scene.fog = new THREE.Fog(fogColorHex, fogNear, fogFar)
    }
  }

  const startRain = () => {
    if (rainSystem) return
    const dropCount = 2800
    rainPositions = new Float32Array(dropCount * 3)
    for (let i = 0; i < dropCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 120
      rainPositions[i * 3 + 1] = Math.random() * 60 + 10
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
    const material = new THREE.PointsMaterial({ color: 0x9ecae1, size: 0.08, transparent: true, opacity: 0.8 })
    rainSystem = new THREE.Points(geometry, material)
    rainSystem.frustumCulled = false
    scene.add(rainSystem)
  }

  const stopRain = () => {
    if (!rainSystem) return
    scene.remove(rainSystem)
    rainSystem.geometry.dispose()
    rainSystem.material.dispose()
    rainSystem = null
    rainPositions = null
  }

  const startSnow = () => {
    if (snowSystem) return
    const flakeCount = 2200
    snowPositions = new Float32Array(flakeCount * 3)
    for (let i = 0; i < flakeCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 130
      snowPositions[i * 3 + 1] = Math.random() * 50 + 10
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 130
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.9 })
    snowSystem = new THREE.Points(geometry, material)
    snowSystem.frustumCulled = false
    scene.add(snowSystem)
  }

  const stopSnow = () => {
    if (!snowSystem) return
    scene.remove(snowSystem)
    snowSystem.geometry.dispose()
    snowSystem.material.dispose()
    snowSystem = null
    snowPositions = null
  }

  const apply = (weatherType) => {
    const next = weatherType || 'sunny'
    if (next === current) return
    current = next

    if (current === 'rain') {
      setSky(0x4a5a6a, 0x4a5a6a, 60, 260)
      startRain()
      stopSnow()
      return
    }

    if (current === 'snow') {
      setSky(0xb8c6d1, 0xc9d6df, 40, 220)
      startSnow()
      stopRain()
      return
    }

    if (current === 'fog') {
      setSky(0x8d9aa6, 0x8d9aa6, undefined, undefined, 0.02)
      stopRain()
      stopSnow()
      return
    }

    setSky(0x87ceeb, 0x87ceeb, 100, 500)
    stopRain()
    stopSnow()
  }

  const update = (delta, cameraPosition) => {
    const baseX = cameraPosition?.x ?? 0
    const baseZ = cameraPosition?.z ?? 0

    if (rainSystem && rainPositions) {
      const speed = 35
      for (let i = 0; i < rainPositions.length; i += 3) {
        rainPositions[i + 1] -= speed * delta
        if (rainPositions[i + 1] < 0) {
          rainPositions[i] = baseX + (Math.random() - 0.5) * 120
          rainPositions[i + 1] = Math.random() * 60 + 10
          rainPositions[i + 2] = baseZ + (Math.random() - 0.5) * 120
        }
      }
      rainSystem.geometry.attributes.position.needsUpdate = true
    }

    if (snowSystem && snowPositions) {
      const fallSpeed = 10
      for (let i = 0; i < snowPositions.length; i += 3) {
        snowPositions[i + 1] -= fallSpeed * delta
        snowPositions[i] += Math.sin((snowPositions[i + 2] + i) * 0.02) * 0.25
        if (snowPositions[i + 1] < 0) {
          snowPositions[i] = baseX + (Math.random() - 0.5) * 130
          snowPositions[i + 1] = Math.random() * 50 + 10
          snowPositions[i + 2] = baseZ + (Math.random() - 0.5) * 130
        }
      }
      snowSystem.geometry.attributes.position.needsUpdate = true
    }
  }

  const dispose = () => {
    stopRain()
    stopSnow()
  }

  return { apply, update, dispose }
}

