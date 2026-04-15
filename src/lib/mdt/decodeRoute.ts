// Decodes an MDT export string into a raw Lua-shaped object.
//
// Two string formats are supported:
//   "!WA:2!..."  binary LibSerialize payload    (newer WeakAuras-style)
//   "!..."       text AceSerializer payload     (what MDT currently emits)
//
// Both share the same outer wrapper:
//   1. Strip the format prefix.
//   2. Reverse LibDeflate's EncodeForPrint (custom 64-char alphabet).
//   3. Inflate raw DEFLATE (no zlib header).
//   4. Deserialize with LibSerialize (binary) or AceSerializer (text).
//
// Reference: weakauras-codec-rs/crates/weakauras-codec/src/lib.rs

import pako from 'pako';
import { decodeForPrint } from './encodeForPrint';
import { deserialize, type LuaValue } from './libSerialize';
import { aceDeserialize } from './aceSerialize';
import { MdtDecodeError, type RawMdtRoute } from './types';

const BINARY_PREFIX = '!WA:2!';
const DEFLATE_PREFIX = '!';

type Format = 'binary' | 'text';

export function decodeMdtString(input: string): RawMdtRoute {
  const trimmed = input.trim();
  if (!trimmed) throw new MdtDecodeError('empty', 'Paste an MDT export string to import a route.');

  let payload: string;
  let format: Format;
  if (trimmed.startsWith(BINARY_PREFIX)) {
    payload = trimmed.slice(BINARY_PREFIX.length);
    format = 'binary';
  } else if (trimmed.startsWith(DEFLATE_PREFIX)) {
    payload = trimmed.slice(DEFLATE_PREFIX.length);
    format = 'text';
  } else {
    throw new MdtDecodeError(
      'prefix',
      "That doesn't look like an MDT export string (expected \"!\u2026\" or \"!WA:2!\u2026\").",
    );
  }

  let compressed: Uint8Array;
  try {
    compressed = decodeForPrint(payload);
  } catch (err) {
    throw new MdtDecodeError('base64', `Couldn't decode the MDT string: ${(err as Error).message}`);
  }

  let inflated: Uint8Array;
  try {
    inflated = pako.inflateRaw(compressed);
  } catch (err) {
    throw new MdtDecodeError(
      'inflate',
      `Couldn't decompress the MDT payload: ${(err as Error).message}`,
    );
  }

  let value: LuaValue;
  try {
    if (format === 'binary') {
      value = deserialize(inflated);
    } else {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(inflated);
      value = aceDeserialize(text);
    }
  } catch (err) {
    throw new MdtDecodeError(
      'serialize',
      `Couldn't deserialize the MDT payload: ${(err as Error).message}`,
    );
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new MdtDecodeError('shape', 'Decoded payload is not an MDT route object.');
  }
  return value as RawMdtRoute;
}
