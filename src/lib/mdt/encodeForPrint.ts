// Hand-port of LibDeflate's "EncodeForPrint" decoder.
//
// LibDeflate (used by the MDT and WeakAuras addons) packs bytes into a
// 64-character printable alphabet with 6 bits per character, in
// little-endian order: every group of 3 bytes becomes 4 characters, with
// any 1 or 2 trailing bytes producing 2 or 3 characters respectively.
//
// Upstream: https://github.com/SafeteeWoW/LibDeflate/blob/main/LibDeflate.lua
// Cross-reference: https://github.com/Zireael-N/weakauras-codec-rs
//   (crates/base64/src/decode/scalar.rs uses the same alphabet)

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789()';

const CHAR_TO_6BIT = new Int16Array(128).fill(-1);
for (let i = 0; i < ALPHABET.length; i++) {
  CHAR_TO_6BIT[ALPHABET.charCodeAt(i)] = i;
}

export function decodeForPrint(input: string): Uint8Array {
  const len = input.length;
  // Output size: 3 bytes per 4 chars, plus 1 or 2 for trailing 2- or 3-char groups.
  const fullGroups = Math.floor(len / 4);
  const rem = len % 4;
  const out = new Uint8Array(fullGroups * 3 + (rem === 3 ? 2 : rem === 2 ? 1 : 0));

  let outIdx = 0;
  let i = 0;
  for (let g = 0; g < fullGroups; g++) {
    const c0 = CHAR_TO_6BIT[input.charCodeAt(i)];
    const c1 = CHAR_TO_6BIT[input.charCodeAt(i + 1)];
    const c2 = CHAR_TO_6BIT[input.charCodeAt(i + 2)];
    const c3 = CHAR_TO_6BIT[input.charCodeAt(i + 3)];
    if (c0 < 0 || c1 < 0 || c2 < 0 || c3 < 0) {
      throw new Error(`EncodeForPrint: invalid character at offset ${i}`);
    }
    // Bits are packed little-endian: c0 in bits 0–5, c1 in 6–11, c2 in 12–17, c3 in 18–23.
    const word = c0 | (c1 << 6) | (c2 << 12) | (c3 << 18);
    out[outIdx++] = word & 0xff;
    out[outIdx++] = (word >>> 8) & 0xff;
    out[outIdx++] = (word >>> 16) & 0xff;
    i += 4;
  }

  if (rem === 3) {
    const c0 = CHAR_TO_6BIT[input.charCodeAt(i)];
    const c1 = CHAR_TO_6BIT[input.charCodeAt(i + 1)];
    const c2 = CHAR_TO_6BIT[input.charCodeAt(i + 2)];
    if (c0 < 0 || c1 < 0 || c2 < 0) {
      throw new Error(`EncodeForPrint: invalid character at offset ${i}`);
    }
    const word = c0 | (c1 << 6) | (c2 << 12);
    out[outIdx++] = word & 0xff;
    out[outIdx++] = (word >>> 8) & 0xff;
  } else if (rem === 2) {
    const c0 = CHAR_TO_6BIT[input.charCodeAt(i)];
    const c1 = CHAR_TO_6BIT[input.charCodeAt(i + 1)];
    if (c0 < 0 || c1 < 0) {
      throw new Error(`EncodeForPrint: invalid character at offset ${i}`);
    }
    const word = c0 | (c1 << 6);
    out[outIdx++] = word & 0xff;
  } else if (rem === 1) {
    throw new Error('EncodeForPrint: stray character at end of input');
  }

  return out;
}
