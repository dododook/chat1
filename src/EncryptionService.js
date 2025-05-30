// src/EncryptionService.js

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util'; // { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 }

export class EncryptionService {
  constructor(roomPassword, roomSalt /* 通常是房间名 */) {
    if (!roomPassword || !roomSalt) {
      throw new Error("EncryptionService: 房间密码和盐值不能为空。");
    }
    this.roomPassword = roomPassword;
    this.roomSalt = roomSalt;
    this.e2eeKey = null; // Uint8Array, 32字节 (nacl.secretbox.keyLength)
    this._keyInitializationPromise = null;
  }

  async _deriveKey() {
    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
      throw new Error("Web Crypto API (crypto.subtle) for PBKDF2 not available.");
    }
    try {
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        naclUtil.decodeUTF8(this.roomPassword), // 密码转为 Uint8Array
        { name: "PBKDF2" },
        false,
        ["deriveBits"] // 对于 deriveBits，不需要 "deriveKey" usage
      );

      // 使用 PBKDF2 派生出适合 nacl.secretbox 的密钥长度 (32字节)
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: naclUtil.decodeUTF8(this.roomSalt), // 盐转为 Uint8Array
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        nacl.secretbox.keyLength * 8 // 转换为位数 (32 bytes * 8 bits/byte = 256 bits)
      );
      return new Uint8Array(derivedBits); // 最终的32字节密钥
    } catch (error) {
      console.error("密钥派生失败 (EncryptionService - PBKDF2):", error);
      throw new Error(`密钥派生失败: ${error.message}`);
    }
  }

  async initializeKey() {
    if (this.e2eeKey) {
      return this.e2eeKey;
    }
    if (!this._keyInitializationPromise) {
      this._keyInitializationPromise = this._deriveKey().then(key => {
        this.e2eeKey = key;
        console.log("E2EE key (for TweetNaCl) derived and initialized successfully.");
        return key;
      }).catch(err => {
        this._keyInitializationPromise = null;
        throw err;
      });
    }
    return this._keyInitializationPromise;
  }

  isKeyInitialized() {
    return !!this.e2eeKey;
  }

  async encrypt(plaintext) { // encrypt 现在是同步的，如果密钥已准备好
    if (!this.isKeyInitialized()) {
      await this.initializeKey(); // 确保密钥已初始化
      if (!this.e2eeKey) throw new Error("加密密钥尚未初始化 (TweetNaCl)。");
    }
    
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength); // 24字节 nonce
    const messageUint8 = naclUtil.decodeUTF8(plaintext);
    
    try {
      const box = nacl.secretbox(messageUint8, nonce, this.e2eeKey);
      return {
        nonce: naclUtil.encodeBase64(nonce),
        ciphertext: naclUtil.encodeBase64(box), // TweetNaCl 将加密后的内容称为 "box"
      };
    } catch (error) {
      console.error("加密失败 (TweetNaCl):", error);
      throw new Error(`加密失败: ${error.message}`);
    }
  }

  async decrypt(e2eePayload) { // decrypt 现在是同步的，如果密钥已准备好
    if (!this.isKeyInitialized()) {
      await this.initializeKey();
      if (!this.e2eeKey) throw new Error("解密密钥尚未初始化 (TweetNaCl)。");
    }
    
    if (!e2eePayload || typeof e2eePayload.nonce !== 'string' || typeof e2eePayload.ciphertext !== 'string') {
      console.warn("无效的 e2eePayload 结构用于解密 (TweetNaCl), 原样返回:", e2eePayload);
      return typeof e2eePayload === 'string' ? e2eePayload : JSON.stringify(e2eePayload);
    }

    try {
      const nonce = naclUtil.decodeBase64(e2eePayload.nonce);
      const ciphertext = naclUtil.decodeBase64(e2eePayload.ciphertext);
      
      const decryptedMessageUint8 = nacl.secretbox.open(ciphertext, nonce, this.e2eeKey);

      if (!decryptedMessageUint8) {
        throw new Error("解密失败！密文可能被篡改或密钥/nonce不匹配。");
      }
      return naclUtil.encodeUTF8(decryptedMessageUint8);
    } catch (error) {
      console.error("解密失败 (TweetNaCl):", error, "Payload:", e2eePayload);
      return "[解密失败：内容或密钥不匹配]";
    }
  }
}

