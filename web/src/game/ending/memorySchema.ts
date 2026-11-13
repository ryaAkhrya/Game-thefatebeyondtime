export interface PersonalMemory {
  id: string; caption: string; date?: string; image: string; durationMs: number;
  transition: 'fade' | 'hold' | 'pan'; note?: string; group?: string;
}
export interface AnniversaryContent {
  version: 1; memories: PersonalMemory[]; message: { paragraphs: string[]; signature: string };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max && !/[\u0000-\u001f]/.test(v);
const only = (v: Record<string, unknown>, keys: string[]): boolean => Object.keys(v).every(k => keys.includes(k));

/** Used by the build process AND runtime/unit QA. Rejects remote URLs, traversal, placeholders and unknown fields. */
export function validateAnniversary(raw: unknown): AnniversaryContent {
  if (!object(raw) || !only(raw, ['version', 'memories', 'message']) || raw.version !== 1 || !Array.isArray(raw.memories) || raw.memories.length > 100) throw new Error('Invalid anniversary manifest');
  const ids = new Set<string>();
  const memories = raw.memories.map((m: unknown) => {
    if (!object(m) || !only(m, ['id', 'caption', 'date', 'image', 'durationMs', 'transition', 'note', 'group'])) throw new Error('Invalid memory');
    if (!text(m.id, 64) || !/^[a-z0-9][a-z0-9_-]*$/i.test(m.id) || ids.has(m.id)) throw new Error('Invalid/duplicate memory ID');
    ids.add(m.id);
    if (!text(m.caption, 220) || !text(m.image, 180) || !/^images\/[a-z0-9_./-]+\.(png|jpe?g|webp)$/i.test(m.image) || m.image.split('/').some(p => p === '..' || p === '.' || p === '')) throw new Error('Invalid caption/image reference');
    if (typeof m.durationMs !== 'number' || !Number.isInteger(m.durationMs) || m.durationMs < Math.max(4000, m.caption.length * 55) || m.durationMs > 60000 || typeof m.transition !== 'string' || !['fade', 'hold', 'pan'].includes(m.transition)) throw new Error('Invalid memory timing');
    for (const [key, max] of [['date', 48], ['note', 180], ['group', 80]] as const) if (m[key] !== undefined && !text(m[key], max)) throw new Error(`Invalid ${key}`);
    if (m.note && m.durationMs < (m.caption.length + String(m.note).length) * 55) throw new Error('Insufficient reading time');
    return { ...m } as unknown as PersonalMemory;
  });
  if (!object(raw.message) || !only(raw.message, ['paragraphs', 'signature']) || !Array.isArray(raw.message.paragraphs) || raw.message.paragraphs.length < 1 || raw.message.paragraphs.length > 12 || !raw.message.paragraphs.every(p => text(p, 450)) || !text(raw.message.signature, 80)) throw new Error('A real user-authored message is required');
  const joined = JSON.stringify(raw);
  if (/\[(?:PESAN|NAMA|KENANGAN|TANGGAL|ISI)|INSERT (?:PHOTO|MESSAGE)|REPLACE_ME/i.test(joined)) throw new Error('Unfilled personal template');
  return { version: 1, memories, message: { paragraphs: [...raw.message.paragraphs] as string[], signature: raw.message.signature } };
}
