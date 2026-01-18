import crypto from "node:crypto";

export function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function isSha256Hex(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}

