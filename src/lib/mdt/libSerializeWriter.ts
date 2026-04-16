// Inverse of libSerialize.ts: serializes a Lua-shaped JS value into the
// LibSerialize binary format (version 1) used by the MDT addon.
//
// Tag byte layout (see libSerialize.ts for the matching reader):
//   NNNNNNN1 — 7-bit positive int (value << 1 | 1)
//   CCCCTT10 — embedded Str/Map/Array/Mixed with 4-bit count
//   NNNNS100 — 12-bit signed int (4 low bits in tag, 8 upper bits in next byte)
//   TTTTT000 — 5-bit explicit TypeTag
//
// We only emit the subset of types RawMdtRoute needs: Null/True/False,
// 7-bit/12-bit/Int16/24/32/64, Float, Str (embedded/8/16/24), Map, Array,
// StrRef. Mixed tables decode into plain JS objects, so we re-emit them as
// pure Map — the reader accepts it. Tables are never deduplicated (no MapRef)
// because RawMdtRoute doesn't contain shared sub-objects.

import type { LuaValue } from './libSerialize';

// TypeTag values — duplicated from libSerialize.ts since the enum there is
// private. Keep in sync if the reader spec changes.
const TAG_NULL = 0;
const TAG_INT16_POS = 1;
const TAG_INT16_NEG = 2;
const TAG_INT24_POS = 3;
const TAG_INT24_NEG = 4;
const TAG_INT32_POS = 5;
const TAG_INT32_NEG = 6;
const TAG_INT64_POS = 7;
const TAG_INT64_NEG = 8;
const TAG_FLOAT = 9;
const TAG_TRUE = 12;
const TAG_FALSE = 13;
const TAG_STR8 = 14;
const TAG_STR16 = 15;
const TAG_STR24 = 16;
const TAG_MAP8 = 17;
const TAG_MAP16 = 18;
const TAG_MAP24 = 19;
const TAG_ARRAY8 = 20;
const TAG_ARRAY16 = 21;
const TAG_ARRAY24 = 22;
const TAG_STRREF8 = 26;
const TAG_STRREF16 = 27;
const TAG_STRREF24 = 28;

// Embedded sub-tag (bits 2–3 of the tag byte).
const EMB_STR = 0;
const EMB_MAP = 1;
const EMB_ARRAY = 2;

interface State {
  bytes: number[];
  /** Deduplication table for strings > 2 bytes, mapping string → 1-based ref. */
  stringRefs: Map<string, number>;
}

/** Serialize a Lua-shaped JS value into the LibSerialize binary format. */
export function serialize(value: LuaValue): Uint8Array {
  const state: State = { bytes: [], stringRefs: new Map() };
  writeU8(state, 1); // Format version prefix (LibSerialize v1)
  writeValue(state, value);
  return Uint8Array.from(state.bytes);
}

function writeU8(s: State, b: number): void {
  s.bytes.push(b & 0xff);
}

function writeUintBE(s: State, n: number, nBytes: number): void {
  if (nBytes < 1 || nBytes > 7) {
    throw new Error(`LibSerialize writer: bad int width ${nBytes}`);
  }
  // Mirror the reader: use multiplication/division so 5–7 byte ints stay
  // exact up to Number.MAX_SAFE_INTEGER.
  const buf: number[] = new Array(nBytes);
  let v = n;
  for (let i = nBytes - 1; i >= 0; i--) {
    buf[i] = v % 256;
    v = Math.floor(v / 256);
  }
  for (const b of buf) s.bytes.push(b);
}

function writeF64BE(s: State, n: number): void {
  const buf = new ArrayBuffer(8);
  new DataView(buf).setFloat64(0, n, false);
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < 8; i++) s.bytes.push(u8[i]);
}

function writeBytes(s: State, bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length; i++) s.bytes.push(bytes[i]);
}

const textEncoder = new TextEncoder();

function writeValue(s: State, v: LuaValue): void {
  if (v === null || v === undefined) {
    writeU8(s, TAG_NULL << 3);
    return;
  }
  if (typeof v === 'boolean') {
    writeU8(s, (v ? TAG_TRUE : TAG_FALSE) << 3);
    return;
  }
  if (typeof v === 'number') {
    writeNumber(s, v);
    return;
  }
  if (typeof v === 'string') {
    writeString(s, v);
    return;
  }
  if (Array.isArray(v)) {
    writeArray(s, v);
    return;
  }
  if (typeof v === 'object') {
    writeMap(s, v as Record<string, LuaValue>);
    return;
  }
  throw new Error(`LibSerialize writer: unsupported type ${typeof v}`);
}

function writeNumber(s: State, n: number): void {
  if (Number.isFinite(n) && Number.isInteger(n)) {
    const isNeg = n < 0;
    const abs = isNeg ? -n : n;
    // 7-bit positive int (no negative form — the low bit is the tag marker)
    if (!isNeg && abs <= 127) {
      writeU8(s, (abs << 1) | 1);
      return;
    }
    // 12-bit signed int: low 4 bits in tag[4..7], upper 8 bits in next byte.
    // Sign bit is tag[3] (4 = positive, 12 = negative).
    if (abs <= 0xfff) {
      const tag = ((abs & 0xf) << 4) | (isNeg ? 12 : 4);
      const next = (abs >>> 4) & 0xff;
      writeU8(s, tag);
      writeU8(s, next);
      return;
    }
    if (abs <= 0xffff) {
      writeU8(s, (isNeg ? TAG_INT16_NEG : TAG_INT16_POS) << 3);
      writeUintBE(s, abs, 2);
      return;
    }
    if (abs <= 0xffffff) {
      writeU8(s, (isNeg ? TAG_INT24_NEG : TAG_INT24_POS) << 3);
      writeUintBE(s, abs, 3);
      return;
    }
    if (abs <= 0xffffffff) {
      writeU8(s, (isNeg ? TAG_INT32_NEG : TAG_INT32_POS) << 3);
      writeUintBE(s, abs, 4);
      return;
    }
    // Int64 (7 bytes on the wire, capped at 2^53 - 1)
    writeU8(s, (isNeg ? TAG_INT64_NEG : TAG_INT64_POS) << 3);
    writeUintBE(s, abs, 7);
    return;
  }
  // Non-integer or non-finite → 8-byte big-endian double.
  writeU8(s, TAG_FLOAT << 3);
  writeF64BE(s, n);
}

function writeString(s: State, str: string): void {
  const bytes = textEncoder.encode(str);
  const len = bytes.length;

  // Strings ≤ 2 bytes are never pushed to stringRefs by the reader, so we
  // can't dedup them. For longer strings, check if we've already emitted it.
  if (len > 2) {
    const ref = s.stringRefs.get(str);
    if (ref !== undefined) {
      writeStrRef(s, ref);
      return;
    }
  }

  if (len <= 15) {
    // Embedded: tag = (len << 4) | (EmbeddedStr << 2) | 2
    writeU8(s, (len << 4) | (EMB_STR << 2) | 2);
    writeBytes(s, bytes);
  } else if (len <= 0xff) {
    writeU8(s, TAG_STR8 << 3);
    writeU8(s, len);
    writeBytes(s, bytes);
  } else if (len <= 0xffff) {
    writeU8(s, TAG_STR16 << 3);
    writeUintBE(s, len, 2);
    writeBytes(s, bytes);
  } else {
    writeU8(s, TAG_STR24 << 3);
    writeUintBE(s, len, 3);
    writeBytes(s, bytes);
  }

  // Reader pushes strings > 2 bytes regardless of tag variant. Match that.
  if (len > 2) {
    s.stringRefs.set(str, s.stringRefs.size + 1);
  }
}

function writeStrRef(s: State, oneBased: number): void {
  if (oneBased <= 0xff) {
    writeU8(s, TAG_STRREF8 << 3);
    writeU8(s, oneBased);
  } else if (oneBased <= 0xffff) {
    writeU8(s, TAG_STRREF16 << 3);
    writeUintBE(s, oneBased, 2);
  } else {
    writeU8(s, TAG_STRREF24 << 3);
    writeUintBE(s, oneBased, 3);
  }
}

function writeArray(s: State, arr: LuaValue[]): void {
  const len = arr.length;
  if (len <= 15) {
    writeU8(s, (len << 4) | (EMB_ARRAY << 2) | 2);
  } else if (len <= 0xff) {
    writeU8(s, TAG_ARRAY8 << 3);
    writeU8(s, len);
  } else if (len <= 0xffff) {
    writeU8(s, TAG_ARRAY16 << 3);
    writeUintBE(s, len, 2);
  } else {
    writeU8(s, TAG_ARRAY24 << 3);
    writeUintBE(s, len, 3);
  }
  for (const v of arr) writeValue(s, v);
}

function writeMap(s: State, obj: Record<string, LuaValue>): void {
  // Filter out undefined values so optional fields that weren't set don't
  // break the encoding (LibSerialize has no "undefined" type).
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  const len = entries.length;
  if (len <= 15) {
    writeU8(s, (len << 4) | (EMB_MAP << 2) | 2);
  } else if (len <= 0xff) {
    writeU8(s, TAG_MAP8 << 3);
    writeU8(s, len);
  } else if (len <= 0xffff) {
    writeU8(s, TAG_MAP16 << 3);
    writeUintBE(s, len, 2);
  } else {
    writeU8(s, TAG_MAP24 << 3);
    writeUintBE(s, len, 3);
  }
  for (const [key, value] of entries) {
    // JS object keys are always strings. If the key looks like a safe
    // integer, emit it as a Lua number so the MDT addon sees an integer-keyed
    // table entry (enemyIndex → clone array) rather than a string key.
    if (/^-?\d+$/.test(key)) {
      const n = Number(key);
      if (Number.isSafeInteger(n)) {
        writeValue(s, n);
        writeValue(s, value);
        continue;
      }
    }
    writeValue(s, key);
    writeValue(s, value);
  }
}
