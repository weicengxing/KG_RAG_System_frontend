import fs from 'node:fs/promises'
import path from 'node:path'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const outDir = path.resolve('public/game-assets/models')

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer()
      this.onloadend?.()
    }
  }
}

const mat = (color, options = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: options.roughness ?? 0.82,
  metalness: options.metalness ?? 0.02,
  emissive: options.emissive ?? 0x000000,
  emissiveIntensity: options.emissiveIntensity ?? 0
})

const mesh = (geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  const item = new THREE.Mesh(geometry, material)
  item.position.set(...position)
  item.rotation.set(...rotation)
  item.scale.set(...scale)
  item.castShadow = true
  item.receiveShadow = true
  return item
}

const addGroundDisk = (group, radius) => {
  const disk = mesh(
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x102018, transparent: true, opacity: 0.16, depthWrite: false }),
    [0, -1.91, 0],
    [-Math.PI / 2, 0, 0],
    [1.35, 0.85, 1]
  )
  disk.name = 'soft_ground_shadow'
  group.add(disk)
}

const createPlayer = () => {
  const group = new THREE.Group()
  group.name = 'primitive_player'
  const tunic = mat(0x2f91d0, { roughness: 0.76 })
  const cloak = mat(0x1e5d7f, { roughness: 0.9 })
  const skin = mat(0xffc58f, { roughness: 0.62 })
  const hair = mat(0x2a1d15, { roughness: 0.86 })
  const bone = mat(0xf5e1a5, { roughness: 0.48, emissive: 0xb88b28, emissiveIntensity: 0.16 })

  group.add(mesh(new THREE.CapsuleGeometry(0.5, 1.45, 5, 10), tunic, [0, -0.58, 0], [0, 0, 0], [0.9, 1, 0.82]))
  group.add(mesh(new THREE.BoxGeometry(1.05, 1.12, 0.16), cloak, [0, -0.38, -0.47], [-0.14, 0, 0]))
  group.add(mesh(new THREE.SphereGeometry(0.4, 18, 14), skin, [0, 0.93, 0]))
  group.add(mesh(new THREE.SphereGeometry(0.43, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, [0, 1.06, -0.02], [0, 0, 0], [1.05, 0.75, 1.02]))

  for (const side of [-1, 1]) {
    group.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9, 8), skin, [side * 0.57, -0.42, 0.03], [0, 0, side * 0.24]))
    group.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.74, 8), cloak, [side * 0.2, -1.48, 0]))
    group.add(mesh(new THREE.BoxGeometry(0.32, 0.12, 0.42), hair, [side * 0.21, -1.87, 0.09]))
  }

  group.add(mesh(new THREE.OctahedronGeometry(0.11, 0), bone, [0, 0.08, 0.5]))
  addGroundDisk(group, 0.68)
  return group
}

const createHut = () => {
  const group = new THREE.Group()
  group.name = 'tribe_hut'
  const wood = mat(0x70461f, { roughness: 0.92 })
  const darkWood = mat(0x4e3118, { roughness: 0.95 })
  const straw = mat(0xb6934c, { roughness: 0.97 })
  const hide = mat(0x3a2618, { roughness: 0.88 })

  group.add(mesh(new THREE.CylinderGeometry(1.38, 1.56, 0.28, 14), wood, [0, 0.14, 0]))
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    group.add(mesh(
      new THREE.CylinderGeometry(0.075, 0.11, 1.62, 7),
      darkWood,
      [Math.cos(angle) * 1.08, 0.85, Math.sin(angle) * 1.08],
      [0.08 * Math.sin(angle), 0, -0.08 * Math.cos(angle)]
    ))
  }
  group.add(mesh(new THREE.ConeGeometry(1.86, 2.25, 14), straw, [0, 1.72, 0], [0, Math.PI / 14, 0]))
  group.add(mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.42, 8), darkWood, [0, 2.92, 0]))
  group.add(mesh(new THREE.BoxGeometry(0.68, 1.1, 0.16), hide, [0, 0.64, 1.42]))
  group.add(mesh(new THREE.TorusGeometry(1.62, 0.045, 8, 32), darkWood, [0, 0.32, 0], [Math.PI / 2, 0, 0]))
  addGroundDisk(group, 1.72)
  return group
}

const createTotem = () => {
  const group = new THREE.Group()
  group.name = 'tribe_totem'
  const wood = mat(0x75471f, { roughness: 0.9 })
  const carved = mat(0xe0b75a, { roughness: 0.52, emissive: 0x8a4e12, emissiveIntensity: 0.22 })
  const paint = mat(0x74d5ff, { roughness: 0.46, emissive: 0x1c7aa5, emissiveIntensity: 0.28 })
  const stone = mat(0x8c867b, { roughness: 0.96 })

  group.add(mesh(new THREE.CylinderGeometry(0.22, 0.34, 4.35, 9), wood, [0, 2.18, 0]))
  group.add(mesh(new THREE.BoxGeometry(1.95, 0.22, 0.24), wood, [0, 3.14, 0], [0, 0, 0.12]))
  group.add(mesh(new THREE.DodecahedronGeometry(0.56, 0), carved, [0, 2.35, 0.08], [0.08, 0, 0], [0.78, 1.12, 0.36]))
  group.add(mesh(new THREE.TorusGeometry(0.78, 0.04, 8, 28), paint, [0, 1.48, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh(new THREE.ConeGeometry(0.22, 0.52, 6), paint, [0, 4.55, 0]))
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    group.add(mesh(new THREE.DodecahedronGeometry(0.16, 0), stone, [Math.cos(angle) * 0.7, 0.12, Math.sin(angle) * 0.7], [0, angle, 0], [1.2, 0.55, 0.85]))
  }
  addGroundDisk(group, 1.05)
  return group
}

const createCave = () => {
  const group = new THREE.Group()
  group.name = 'cave_entrance'
  const rock = mat(0x4f5049, { roughness: 0.98 })
  const wetRock = mat(0x363a36, { roughness: 0.9 })
  const dark = new THREE.MeshBasicMaterial({ color: 0x030403 })
  const ember = mat(0xff9f1c, { roughness: 0.4, emissive: 0xff7a18, emissiveIntensity: 0.7 })

  group.add(mesh(new THREE.TorusGeometry(1.62, 0.32, 9, 24, Math.PI), rock, [0, 1.34, 0], [0, 0, Math.PI]))
  group.add(mesh(new THREE.CircleGeometry(1.4, 32), dark, [0, 1.02, 0.02]))
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI + (i / 9) * Math.PI
    const x = Math.cos(angle) * (1.25 + Math.random() * 0.42)
    const y = 0.36 + Math.sin(angle) * 1.05 + Math.random() * 0.22
    group.add(mesh(new THREE.DodecahedronGeometry(0.26 + Math.random() * 0.22, 0), i % 3 === 0 ? wetRock : rock, [x, y, -0.05 + Math.random() * 0.22], [Math.random(), Math.random(), Math.random()], [1.25, 0.7 + Math.random() * 0.7, 0.9]))
  }
  group.add(mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.95, 7), mat(0x6b3f1a), [-1.06, 0.82, 0.22], [0, 0, -0.08]))
  group.add(mesh(new THREE.ConeGeometry(0.16, 0.48, 8), ember, [-1.06, 1.42, 0.22]))
  addGroundDisk(group, 2.15)
  return group
}

const exportGlb = async (name, object) => {
  const exporter = new GLTFExporter()
  const data = await new Promise((resolve, reject) => {
    exporter.parse(object, resolve, reject, { binary: true, trs: true })
  })
  await fs.writeFile(path.join(outDir, `${name}.glb`), Buffer.from(data))
}

await fs.mkdir(outDir, { recursive: true })
await exportGlb('player', createPlayer())
await exportGlb('tribe_hut', createHut())
await exportGlb('tribe_totem', createTotem())
await exportGlb('cave_entrance', createCave())

console.log(`Generated GLB game models in ${outDir}`)
