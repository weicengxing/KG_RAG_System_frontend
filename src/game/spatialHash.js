export class SpatialHash {
  constructor(cellSize = 10) {
    this.cellSize = cellSize
    this.buckets = new Map()
  }

  clear() {
    this.buckets.clear()
  }

  _key(ix, iz) {
    return `${ix},${iz}`
  }

  _cellIndex(v) {
    return Math.floor(v / this.cellSize)
  }

  insert(item, x, z, radius) {
    const minX = this._cellIndex(x - radius)
    const maxX = this._cellIndex(x + radius)
    const minZ = this._cellIndex(z - radius)
    const maxZ = this._cellIndex(z + radius)

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        const key = this._key(ix, iz)
        let bucket = this.buckets.get(key)
        if (!bucket) {
          bucket = []
          this.buckets.set(key, bucket)
        }
        bucket.push(item)
      }
    }
  }

  query(x, z, radius) {
    const minX = this._cellIndex(x - radius)
    const maxX = this._cellIndex(x + radius)
    const minZ = this._cellIndex(z - radius)
    const maxZ = this._cellIndex(z + radius)

    const results = []
    const seen = new Set()

    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        const bucket = this.buckets.get(this._key(ix, iz))
        if (!bucket) continue
        for (const item of bucket) {
          if (seen.has(item)) continue
          seen.add(item)
          results.push(item)
        }
      }
    }

    return results
  }
}

