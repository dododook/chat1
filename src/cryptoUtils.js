// src/cryptoUtils.js

/**
 * 生成一个适合用作“强密码”的随机字符串。
 * @returns {string} - 一个UUID字符串。
 */
export function generateRandomStrongPassword() {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID === 'undefined') {
    // 备用方案，如果 crypto.randomUUID 不可用（不太可能在现代浏览器中发生）
    let d = new Date().getTime();
    let d2 = (performance && performance.now && (performance.now() * 1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Math.random() * 16;
      if (d > 0) {
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  return crypto.randomUUID();
}

