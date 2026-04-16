// Inverse of decodeRoute.ts: turns a RawMdtRoute back into a MDT export
// string compatible with the WoW addon. Pipeline:
//   1. LibSerialize → raw bytes
//   2. Raw DEFLATE compression (pako.deflateRaw)
//   3. EncodeForPrint (6-bit printable alphabet)
//   4. Prefix with "!WA:2!" so the addon recognizes the binary format

import pako from 'pako';
import { encodeForPrint } from './encodeForPrint';
import { serialize } from './libSerializeWriter';
import type { LuaValue } from './libSerialize';
import type { RawMdtRoute } from './types';

const BINARY_PREFIX = '!WA:2!';

export function encodeMdtRoute(raw: RawMdtRoute): string {
  const serialized = serialize(raw as LuaValue);
  const compressed = pako.deflateRaw(serialized);
  const encoded = encodeForPrint(compressed);
  return BINARY_PREFIX + encoded;
}
