// 碰撞检测工具函数

/**
 * 检测矩形碰撞
 * @param {Object} rect1 - 矩形1 {x, y, width, height}
 * @param {Object} rect2 - 矩形2 {x, y, width, height}
 * @returns {boolean} 是否碰撞
 */
export const checkRectCollision = (rect1, rect2) => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  )
}

/**
 * 检测点与矩形的碰撞
 * @param {number} x - 点的x坐标
 * @param {number} y - 点的y坐标
 * @param {Object} rect - 矩形 {x, y, width, height}
 * @returns {boolean} 是否在矩形内
 */
export const checkPointInRect = (x, y, rect) => {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  )
}

/**
 * 计算两点距离
 * @param {number} x1 - 点1的x坐标
 * @param {number} y1 - 点1的y坐标
 * @param {number} x2 - 点2的x坐标
 * @param {number} y2 - 点2的y坐标
 * @returns {number} 距离
 */
export const distance = (x1, y1, x2, y2) => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * 生成随机整数
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
export const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 限制数值在范围内
 * @param {number} value - 值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 限制后的值
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max)
}
