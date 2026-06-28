import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALG = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.SMTP_ENCRYPTION_KEY;
  if (!raw) throw new Error("SMTP_ENCRYPTION_KEY is not set");
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) throw new Error("SMTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  return buf;
}

// Returns "iv:ciphertext:authTag" as hex segments, prefixed with "enc:" for detection.
export function encryptValue(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}:${enc.toString("hex")}:${tag.toString("hex")}`;
}

// Decrypts a value produced by encryptValue. If the value is not prefixed with "enc:",
// returns it as-is to support legacy plaintext values during migration.
export function decryptValue(value: string): string {
  if (!value.startsWith("enc:")) return value;
  const parts = value.slice(4).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted value format");
  const [ivHex, encHex, tagHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const encBuf = Buffer.from(encHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv(ALG, key, iv, { authTagLength: 16 }); // reject truncated GCM tags
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString("utf8");
}
