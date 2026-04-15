// Hand-port of LibSerialize's binary deserializer (version 1 / 2).
//
// The format is documented in LibSerialize's Lua source and has been
// reimplemented in Rust by weakauras-codec-rs. This TypeScript port
// translates the Rust deserializer 1:1, preserving the type-tag table:
//
//   Upstream Lua:  https://github.com/rossnichols/LibSerialize
//   Rust source:   https://github.com/Zireael-N/weakauras-codec-rs
//                  crates/lib_serialize/src/deserialization/mod.rs
//
// Tag byte layout:
//   NNNNNNN1 — 7-bit non-negative int (value >> 1)
//   CCCCTT10 — embedded type TT (Str/Map/Array/Mixed) with 4-bit count
//   NNNNS100 — low 4 bits + sign bit of a 12-bit int (next byte = upper bits)
//   TTTTT000 — 5-bit explicit TypeTag (Int, Float, Str, Map, Array, Mixed, *Ref)
//
// Strings longer than 2 bytes and every table/array/map get pushed into
// string_refs / table_refs so future *Ref tags can resolve them by index.

export type LuaValue =
  | null
  | boolean
  | number
  | string
  | LuaValue[]
  | { [key: string]: LuaValue; [key: number]: LuaValue };

type LuaMap = { [key: string]: LuaValue; [key: number]: LuaValue };

const MAX_DEPTH = 128;

enum TypeTag {
  Null = 0,
  Int16Pos = 1,
  Int16Neg = 2,
  Int24Pos = 3,
  Int24Neg = 4,
  Int32Pos = 5,
  Int32Neg = 6,
  Int64Pos = 7,
  Int64Neg = 8,
  Float = 9,
  FloatStrPos = 10,
  FloatStrNeg = 11,
  True = 12,
  False = 13,
  Str8 = 14,
  Str16 = 15,
  Str24 = 16,
  Map8 = 17,
  Map16 = 18,
  Map24 = 19,
  Array8 = 20,
  Array16 = 21,
  Array24 = 22,
  Mixed8 = 23,
  Mixed16 = 24,
  Mixed24 = 25,
  StrRef8 = 26,
  StrRef16 = 27,
  StrRef24 = 28,
  MapRef8 = 29,
  MapRef16 = 30,
  MapRef24 = 31,
}

enum EmbeddedTag {
  Str = 0,
  Map = 1,
  Array = 2,
  Mixed = 3,
}

class Reader {
  constructor(
    private readonly bytes: Uint8Array,
    public pos = 0,
  ) {}

  eof(): boolean {
    return this.pos >= this.bytes.length;
  }

  readU8(): number {
    if (this.pos >= this.bytes.length) throw new Error('LibSerialize: unexpected EOF');
    return this.bytes[this.pos++];
  }

  readF64BE(): number {
    if (this.pos + 8 > this.bytes.length) throw new Error('LibSerialize: unexpected EOF (f64)');
    const dv = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.pos, 8);
    this.pos += 8;
    return dv.getFloat64(0, false);
  }

  /** Read an unsigned big-endian int of 1..7 bytes. */
  readUintBE(nBytes: number): number {
    if (nBytes < 1 || nBytes > 7) throw new Error(`LibSerialize: bad int width ${nBytes}`);
    if (this.pos + nBytes > this.bytes.length) throw new Error('LibSerialize: unexpected EOF (int)');
    let v = 0;
    for (let i = 0; i < nBytes; i++) {
      // JS bitwise ops are 32-bit signed — use multiplication instead so 5–7
      // byte widths stay exact up to Number.MAX_SAFE_INTEGER (2^53 - 1).
      v = v * 256 + this.bytes[this.pos++];
    }
    return v;
  }

  readBytes(len: number): Uint8Array {
    if (this.pos + len > this.bytes.length) throw new Error('LibSerialize: unexpected EOF (bytes)');
    const out = this.bytes.subarray(this.pos, this.pos + len);
    this.pos += len;
    return out;
  }
}

const textDecoder = new TextDecoder('utf-8', { fatal: false });

export function deserialize(bytes: Uint8Array): LuaValue {
  if (bytes.length === 0) throw new Error('LibSerialize: empty input');
  const reader = new Reader(bytes);

  const prefix = reader.readU8();
  if (prefix !== 1 && prefix !== 2) {
    throw new Error(`LibSerialize: invalid format prefix 0x${prefix.toString(16)}`);
  }

  const state: State = {
    reader,
    stringRefs: [],
    tableRefs: [],
    depth: 0,
  };

  const first = readValue(state);
  if (first === UNSET) throw new Error('LibSerialize: no value after header');
  return first;
}

interface State {
  reader: Reader;
  stringRefs: string[];
  tableRefs: LuaValue[];
  depth: number;
}

const UNSET = Symbol('unset');
type ValueOrUnset = LuaValue | typeof UNSET;

function readValue(state: State): ValueOrUnset {
  if (state.reader.eof()) return UNSET;
  const tag = state.reader.readU8();

  if ((tag & 1) === 1) {
    // 7-bit positive int
    return tag >>> 1;
  }

  if ((tag & 3) === 2) {
    // Embedded type with a 4-bit count
    const embedded = ((tag & 0x0f) >>> 2) as EmbeddedTag;
    const len = tag >>> 4;
    return readEmbedded(state, embedded, len);
  }

  if ((tag & 7) === 4) {
    // 12-bit int: low 4 bits come from the tag byte, upper 8 bits from next byte.
    const next = state.reader.readU8();
    const packed = (next << 8) | tag;
    const magnitude = packed >>> 4;
    // Sign bit is bit 3 of the tag byte (tag & 15 === 12 → negative, === 4 → positive)
    return (tag & 15) === 12 ? -magnitude : magnitude;
  }

  const explicit = (tag >>> 3) as TypeTag;
  return readExplicit(state, explicit);
}

function extract(state: State): LuaValue {
  const v = readValue(state);
  if (v === UNSET) throw new Error('LibSerialize: unexpected EOF mid-value');
  return v;
}

function readEmbedded(state: State, tag: EmbeddedTag, len: number): LuaValue {
  switch (tag) {
    case EmbeddedTag.Str:
      return readString(state, len);
    case EmbeddedTag.Map:
      return readMap(state, len);
    case EmbeddedTag.Array:
      return readArray(state, len);
    case EmbeddedTag.Mixed: {
      // The 4-bit count holds two 2-bit counts, each off-by-one.
      const arrLen = (len & 3) + 1;
      const mapLen = ((len >>> 2) & 3) + 1;
      return readMixed(state, arrLen, mapLen);
    }
  }
}

function readExplicit(state: State, tag: TypeTag): LuaValue {
  switch (tag) {
    case TypeTag.Null:
      return null;
    case TypeTag.Int16Pos:
      return state.reader.readUintBE(2);
    case TypeTag.Int16Neg:
      return -state.reader.readUintBE(2);
    case TypeTag.Int24Pos:
      return state.reader.readUintBE(3);
    case TypeTag.Int24Neg:
      return -state.reader.readUintBE(3);
    case TypeTag.Int32Pos:
      return state.reader.readUintBE(4);
    case TypeTag.Int32Neg:
      return -state.reader.readUintBE(4);
    case TypeTag.Int64Pos:
      return state.reader.readUintBE(7);
    case TypeTag.Int64Neg:
      return -state.reader.readUintBE(7);
    case TypeTag.Float:
      return state.reader.readF64BE();
    case TypeTag.FloatStrPos:
      return readFloatStr(state);
    case TypeTag.FloatStrNeg:
      return -readFloatStr(state);
    case TypeTag.True:
      return true;
    case TypeTag.False:
      return false;
    case TypeTag.Str8:
      return readString(state, state.reader.readU8());
    case TypeTag.Str16:
      return readString(state, state.reader.readUintBE(2));
    case TypeTag.Str24:
      return readString(state, state.reader.readUintBE(3));
    case TypeTag.Map8:
      return readMap(state, state.reader.readU8());
    case TypeTag.Map16:
      return readMap(state, state.reader.readUintBE(2));
    case TypeTag.Map24:
      return readMap(state, state.reader.readUintBE(3));
    case TypeTag.Array8:
      return readArray(state, state.reader.readU8());
    case TypeTag.Array16:
      return readArray(state, state.reader.readUintBE(2));
    case TypeTag.Array24:
      return readArray(state, state.reader.readUintBE(3));
    case TypeTag.Mixed8: {
      const arrLen = state.reader.readU8();
      const mapLen = state.reader.readU8();
      return readMixed(state, arrLen, mapLen);
    }
    case TypeTag.Mixed16: {
      const arrLen = state.reader.readUintBE(2);
      const mapLen = state.reader.readUintBE(2);
      return readMixed(state, arrLen, mapLen);
    }
    case TypeTag.Mixed24: {
      const arrLen = state.reader.readUintBE(3);
      const mapLen = state.reader.readUintBE(3);
      return readMixed(state, arrLen, mapLen);
    }
    case TypeTag.StrRef8:
      return resolveStrRef(state, state.reader.readU8());
    case TypeTag.StrRef16:
      return resolveStrRef(state, state.reader.readUintBE(2));
    case TypeTag.StrRef24:
      return resolveStrRef(state, state.reader.readUintBE(3));
    case TypeTag.MapRef8:
      return resolveTableRef(state, state.reader.readU8());
    case TypeTag.MapRef16:
      return resolveTableRef(state, state.reader.readUintBE(2));
    case TypeTag.MapRef24:
      return resolveTableRef(state, state.reader.readUintBE(3));
    default:
      throw new Error(`LibSerialize: unknown type tag ${tag}`);
  }
}

function resolveStrRef(state: State, oneBased: number): string {
  if (oneBased < 1 || oneBased > state.stringRefs.length) {
    throw new Error(`LibSerialize: invalid string ref ${oneBased}`);
  }
  return state.stringRefs[oneBased - 1];
}

function resolveTableRef(state: State, oneBased: number): LuaValue {
  if (oneBased < 1 || oneBased > state.tableRefs.length) {
    throw new Error(`LibSerialize: invalid table ref ${oneBased}`);
  }
  return state.tableRefs[oneBased - 1];
}

function readString(state: State, len: number): string {
  const bytes = state.reader.readBytes(len);
  const s = textDecoder.decode(bytes);
  if (len > 2) state.stringRefs.push(s);
  return s;
}

function readFloatStr(state: State): number {
  const len = state.reader.readU8();
  const bytes = state.reader.readBytes(len);
  const s = textDecoder.decode(bytes);
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`LibSerialize: invalid float string "${s}"`);
  return n;
}

function enterRecursion<T>(state: State, fn: () => T): T {
  if (state.depth >= MAX_DEPTH) throw new Error('LibSerialize: recursion limit');
  state.depth++;
  try {
    return fn();
  } finally {
    state.depth--;
  }
}

function readMap(state: State, len: number): LuaValue {
  const obj: LuaMap = {};
  for (let i = 0; i < len; i++) {
    enterRecursion(state, () => {
      const key = extract(state);
      const value = extract(state);
      setMapKey(obj, key, value);
    });
  }
  state.tableRefs.push(obj);
  return obj;
}

function readArray(state: State, len: number): LuaValue {
  const arr: LuaValue[] = [];
  for (let i = 0; i < len; i++) {
    enterRecursion(state, () => {
      arr.push(extract(state));
    });
  }
  state.tableRefs.push(arr);
  return arr;
}

function readMixed(state: State, arrLen: number, mapLen: number): LuaValue {
  // Mixed: array portion uses implicit 1..N integer keys, map portion is key/value pairs.
  // Lua indexes arrays from 1, so we preserve that when representing as an object.
  const obj: LuaMap = {};
  for (let i = 1; i <= arrLen; i++) {
    enterRecursion(state, () => {
      obj[i] = extract(state);
    });
  }
  for (let i = 0; i < mapLen; i++) {
    enterRecursion(state, () => {
      const key = extract(state);
      const value = extract(state);
      setMapKey(obj, key, value);
    });
  }
  state.tableRefs.push(obj);
  return obj;
}

function setMapKey(obj: LuaMap, key: LuaValue, value: LuaValue): void {
  if (typeof key === 'number') {
    obj[key] = value;
  } else if (typeof key === 'string') {
    obj[key] = value;
  } else if (typeof key === 'boolean') {
    obj[String(key)] = value;
  } else {
    // Tables/nulls as keys are valid Lua but not representable in JS objects;
    // stringify so the data isn't lost.
    obj[JSON.stringify(key)] = value;
  }
}
