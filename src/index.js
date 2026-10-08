import { parseMtn } from "./mtn.js";

const PARSERS = [parseMtn];

export function parseMessage(text) {
  for (const parse of PARSERS) {
    const result = parse(text);
    if (result) return result;
  }
  return null;
}
export function splitMessages(blob) {
  return blob
    .split(/\n\s*\n|\n(?=[A-Z0-9]{10}\s+Confirmed|\s*Y[’']ello\.)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}