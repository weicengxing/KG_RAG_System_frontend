import fs from 'node:fs/promises'
import path from 'node:path'

const align4 = (buffer, padByte = 0) => {
  const padding = (4 - (buffer.length % 4)) % 4
  if (!padding) return buffer
  return Buffer.concat([buffer, Buffer.alloc(padding, padByte)])
}

const mimeTypeFor = (file) => {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  return 'application/octet-stream'
}

async function packGltfToGlb(inputFile, outputFile) {
  const inputDir = path.dirname(inputFile)
  const gltf = JSON.parse(await fs.readFile(inputFile, 'utf8'))
  const chunks = []
  let byteOffset = 0

  const append = (data) => {
    const aligned = align4(Buffer.from(data), 0)
    const offset = byteOffset
    chunks.push(aligned)
    byteOffset += aligned.length
    return { offset, length: Buffer.from(data).length }
  }

  if (!Array.isArray(gltf.buffers) || gltf.buffers.length !== 1 || !gltf.buffers[0].uri) {
    throw new Error(`Expected one external buffer in ${inputFile}`)
  }

  const bufferData = await fs.readFile(path.join(inputDir, gltf.buffers[0].uri))
  const mainBuffer = append(bufferData)
  gltf.buffers = [{ byteLength: 0 }]

  for (const view of gltf.bufferViews || []) {
    view.buffer = 0
    view.byteOffset = (view.byteOffset || 0) + mainBuffer.offset
  }

  for (const image of gltf.images || []) {
    if (!image.uri) continue
    const imageData = await fs.readFile(path.join(inputDir, image.uri))
    const imageBuffer = append(imageData)
    const bufferViewIndex = gltf.bufferViews.length
    gltf.bufferViews.push({
      buffer: 0,
      byteOffset: imageBuffer.offset,
      byteLength: imageBuffer.length
    })
    image.bufferView = bufferViewIndex
    image.mimeType = image.mimeType || mimeTypeFor(image.uri)
    delete image.uri
  }

  const binChunk = Buffer.concat(chunks)
  gltf.buffers[0].byteLength = binChunk.length

  const jsonChunk = align4(Buffer.from(JSON.stringify(gltf)), 0x20)
  const glbLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(glbLength, 8)

  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonChunk.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)

  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binChunk.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)

  await fs.writeFile(outputFile, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]))
}

const modelsDir = path.resolve('public/game-assets/models')
const kaykitDir = path.join(modelsDir, 'kaykit')

await packGltfToGlb(path.join(kaykitDir, 'tent.gltf'), path.join(modelsDir, 'tribe_hut.glb'))
await packGltfToGlb(path.join(kaykitDir, 'flag_green.gltf'), path.join(modelsDir, 'tribe_totem.glb'))
await packGltfToGlb(path.join(kaykitDir, 'building_mine_green.gltf'), path.join(modelsDir, 'cave_entrance.glb'))

console.log('Packed KayKit glTF assets into GLB files.')
