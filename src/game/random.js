export function hashStringToSeed(input) {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed) {
  let value = seed >>> 0
  return function next() {
    value += 0x6D2B79F5
    let t = value
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rngForKey(key, globalSeed = 0) {
  const seed = (hashStringToSeed(`${key}:${globalSeed}`) ^ (globalSeed >>> 0)) >>> 0
  return mulberry32(seed)
}

