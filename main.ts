// news-image-20261117 entry, round 2 (Node 22, standard library only):
// one front page, entry.png beside this file, written to
// /output/entry.png byte for byte. The image sums up the world's news
// of Tuesday 17 November 2026 in four panels: the Kerch Bridge strike,
// Trump landing in Manila for ASEAN, tankers hit near Hormuz, and the
// EU states' Rwanda return hub, with a ticker of the day's other
// stories. v2 vs v1: the Rwanda panel is regenerated (terraced Rwandan
// hills, a modern reception centre, a landing plane, travellers with
// suitcases — v1's generic airport world-map showed nothing of Rwanda),
// region kickers above each headline make the day's breadth read at a
// glance, the Kerch caption is fixed (v1 cut it off mid-sentence), and
// the ticker strip is taller with larger type. The layout (masthead,
// kickers, captions, ticker) was composed with PIL so every word is
// spelled exactly right.
// The file is JPEG bytes in a file still named entry.png: the gate tells
// the format from the first bytes, and JPEG keeps this photo-heavy page
// well under the 1 MiB gate (verified locally: 334,442 bytes at
// 1024x1024, and two runs write identical bytes).
// Before writing, the program checks the file is really a PNG or a JPEG
// (its magic bytes) and fits the gate (at most 1 MiB, at most 1024 by 1024
// pixels, read from the IHDR chunk or the JPEG SOF marker), so a bad file
// fails loudly instead of submitting something the gate would refuse.
// The copy is deterministic: both grading runs write the identical bytes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, 'entry.png');
const out = join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'entry.png');

const buf = readFileSync(src);
if (buf.length > 1048576) {
  throw new Error(`entry.png is ${buf.length} bytes, over the 1 MiB gate`);
}

// Detect the format from the first bytes: PNG 89 50 4E 47, JPEG FF D8 FF.
const isPng = buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
if (!isPng && !isJpeg) {
  throw new Error('entry.png is neither a PNG nor a JPEG file');
}

let width;
let height;
if (isPng) {
  if (buf.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('entry.png has no IHDR chunk where a PNG should');
  }
  width = buf.readUInt32BE(16);
  height = buf.readUInt32BE(20);
} else {
  // Walk the JPEG markers to the first start-of-frame segment (SOF0/SOF2)
  // and read its height and width (big-endian, 2 bytes each).
  let pos = 2;
  let found = false;
  while (pos + 9 < buf.length && !found) {
    if (buf[pos] !== 0xff) {
      throw new Error('entry.png has a broken JPEG marker stream');
    }
    const marker = buf[pos + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      height = buf.readUInt16BE(pos + 5);
      width = buf.readUInt16BE(pos + 7);
      found = true;
    } else if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      pos += 2; // standalone marker, no length field
    } else {
      pos += 2 + buf.readUInt16BE(pos + 2);
    }
  }
  if (!found) {
    throw new Error('entry.png has no JPEG start-of-frame marker');
  }
}
if (width > 1024 || height > 1024) {
  throw new Error(`entry.png is ${width}x${height}, over the 1024x1024 gate`);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buf);
console.log(`wrote ${out} (${width}x${height}, ${buf.length} bytes, ${isPng ? 'PNG' : 'JPEG'})`);
