import { describe, it, expect, beforeEach } from "vitest";

// Set a test key before importing the module
beforeEach(() => {
  process.env.SMTP_ENCRYPTION_KEY = "a".repeat(64); // 32 bytes of 0xAA
});

// Dynamic import so the env var is set before module initialisation
async function getEncrypt() {
  return await import("../lib/encrypt");
}

describe("encrypt / decrypt", () => {
  it("round-trips a plaintext value", async () => {
    const { encryptValue, decryptValue } = await getEncrypt();
    const original = "super-secret-smtp-password";
    const encrypted = encryptValue(original);
    expect(encrypted).toMatch(/^enc:/);
    expect(encrypted).not.toContain(original);
    expect(decryptValue(encrypted)).toBe(original);
  });

  it("produces different ciphertexts for the same input (random IV)", async () => {
    const { encryptValue } = await getEncrypt();
    const a = encryptValue("same");
    const b = encryptValue("same");
    expect(a).not.toBe(b);
  });

  it("returns legacy plaintext values unchanged (migration path)", async () => {
    const { decryptValue } = await getEncrypt();
    expect(decryptValue("plaintext-legacy-password")).toBe("plaintext-legacy-password");
  });

  it("throws on tampered ciphertext", async () => {
    const { encryptValue, decryptValue } = await getEncrypt();
    const encrypted = encryptValue("value");
    const tampered = encrypted.replace(/enc:/, "enc:ff");
    expect(() => decryptValue(tampered)).toThrow();
  });
});
