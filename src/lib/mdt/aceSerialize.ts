// Hand-port of AceSerializer-3.0's text deserializer.
//
// The older "!"-prefixed export format (still used by MDT today) wraps an
// Ace-serialized text payload in LibDeflate compression. AceSerializer uses
// 2-byte identifiers that start with `^` followed by a second ASCII byte:
//
//   ^1  version prefix                 ^^  end marker
//   ^Z  nil                            ^B / ^b  true / false
//   ^S  string (until next `^`)        ^N  number (text form until next `^`)
//   ^F  float mantissa, then ^f ...    ^T ... ^t  table
//
// Strings use `~` as an escape prefix for bytes outside the safe range.
// Reference: weakauras-codec-rs crates/ace_serialize/src/deserialization/

import type { LuaValue } from './libSerialize';

const MAX_DEPTH = 128;

export function aceDeserialize(input: string): LuaValue {
  const reader = new StrReader(input);
  const prefix = reader.readIdentifier();
  if (prefix !== '^1') throw new Error(`AceSerialize: invalid prefix "${prefix}"`);

  const state = { reader, depth: 0 };
  const v = readValue(state);
  if (v === END) throw new Error('AceSerialize: no value after header');
  return v;
}

const END = Symbol('end');
type ValueOrEnd = LuaValue | typeof END;

interface State {
  reader: StrReader;
  depth: number;
}

function readValue(state: State): ValueOrEnd {
  const id = state.reader.readIdentifier();
  switch (id) {
    case '^^':
      return END;
    case '^Z':
      return null;
    case '^B':
      return true;
    case '^b':
      return false;
    case '^S':
      return state.reader.parseStr();
    case '^N':
      return parseNumberText(state.reader.readUntilNext());
    case '^F': {
      const mantissa = parseNumberText(state.reader.readUntilNext());
      const expId = state.reader.readIdentifier();
      if (expId !== '^f') throw new Error('AceSerialize: float missing exponent');
      const exponent = parseNumberText(state.reader.readUntilNext());
      return mantissa * Math.pow(2, exponent);
    }
    case '^T':
      return readTable(state);
    default:
      throw new Error(`AceSerialize: invalid identifier "${id}"`);
  }
}

function readTable(state: State): LuaValue {
  if (state.depth >= MAX_DEPTH) throw new Error('AceSerialize: recursion limit');
  state.depth++;
  try {
    const keys: LuaValue[] = [];
    const values: LuaValue[] = [];
    for (;;) {
      const peek = state.reader.peekIdentifier();
      if (peek === '^t') {
        state.reader.readIdentifier();
        break;
      }
      const key = readValue(state);
      if (key === END) throw new Error('AceSerialize: unclosed table');
      const peekValue = state.reader.peekIdentifier();
      if (peekValue === '^t') throw new Error('AceSerialize: table key without value');
      const value = readValue(state);
      if (value === END) throw new Error('AceSerialize: unclosed table');
      keys.push(key);
      values.push(value);
    }

    // If all keys are 1..N integers, emit an array. Otherwise, emit a map-like object
    // matching the shape produced by the LibSerialize port so downstream code is uniform.
    const isArray = keys.every(
      (k, i) => typeof k === 'number' && k === i + 1,
    );
    if (isArray) return values;

    const obj: { [k: string]: LuaValue; [k: number]: LuaValue } = {};
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (typeof k === 'number' || typeof k === 'string') {
        obj[k] = values[i];
      } else if (typeof k === 'boolean') {
        obj[String(k)] = values[i];
      } else {
        obj[JSON.stringify(k)] = values[i];
      }
    }
    return obj;
  } finally {
    state.depth--;
  }
}

function parseNumberText(text: string): number {
  if (text === '1.#INF' || text === 'inf') return Infinity;
  if (text === '-1.#INF' || text === '-inf') return -Infinity;
  const n = Number(text);
  if (!Number.isFinite(n) && !Number.isNaN(n)) return n;
  if (Number.isNaN(n)) throw new Error(`AceSerialize: invalid number "${text}"`);
  return n;
}

class StrReader {
  private readonly s: string;
  private i = 0;
  constructor(s: string) {
    this.s = s;
  }

  readIdentifier(): string {
    if (this.i + 1 >= this.s.length) throw new Error('AceSerialize: unexpected EOF');
    const c0 = this.s.charCodeAt(this.i);
    const c1 = this.s.charCodeAt(this.i + 1);
    if (c0 !== 0x5e /* ^ */ || c1 > 0x79) {
      throw new Error(`AceSerialize: invalid identifier at ${this.i}`);
    }
    const id = this.s.slice(this.i, this.i + 2);
    this.i += 2;
    return id;
  }

  peekIdentifier(): string {
    if (this.i + 1 >= this.s.length) throw new Error('AceSerialize: unexpected EOF');
    const c0 = this.s.charCodeAt(this.i);
    const c1 = this.s.charCodeAt(this.i + 1);
    if (c0 !== 0x5e || c1 > 0x79) {
      throw new Error(`AceSerialize: invalid identifier at ${this.i}`);
    }
    return this.s.slice(this.i, this.i + 2);
  }

  /** Read raw text up to (but not including) the next `^` marker. */
  readUntilNext(): string {
    const start = this.i;
    while (this.i < this.s.length && this.s.charCodeAt(this.i) !== 0x5e /* ^ */) {
      this.i++;
    }
    if (this.i >= this.s.length) throw new Error('AceSerialize: unexpected EOF');
    return this.s.slice(start, this.i);
  }

  /** Read an escaped string up to the next `^` marker. */
  parseStr(): string {
    let out = '';
    let copyFrom = this.i;
    while (this.i < this.s.length) {
      const ch = this.s.charCodeAt(this.i);
      if (ch === 0x5e /* ^ */) {
        if (out.length === 0) return this.s.slice(copyFrom, this.i);
        return out + this.s.slice(copyFrom, this.i);
      }
      if (ch === 0x7e /* ~ */) {
        out += this.s.slice(copyFrom, this.i);
        this.i++;
        if (this.i >= this.s.length) throw new Error('AceSerialize: unexpected EOF');
        const esc = this.s.charCodeAt(this.i);
        let replacement: number;
        if ((esc >= 0x40 && esc <= 0x5d) || (esc >= 0x5f && esc <= 0x60)) {
          replacement = esc - 64;
        } else if (esc === 0x7a) {
          replacement = 0x1e;
        } else if (esc === 0x7b) {
          replacement = 0x7f;
        } else if (esc === 0x7c) {
          replacement = 0x7e;
        } else if (esc === 0x7d) {
          replacement = 0x5e;
        } else {
          throw new Error(`AceSerialize: invalid escape "~${String.fromCharCode(esc)}"`);
        }
        out += String.fromCharCode(replacement);
        this.i++;
        copyFrom = this.i;
      } else {
        this.i++;
      }
    }
    throw new Error('AceSerialize: unexpected EOF in string');
  }
}
