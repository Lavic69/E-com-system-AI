import { createHash } from 'node:crypto';
import { GraphQLError } from 'graphql';

export type ContentBlock =
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'media'; assetId: string; alt: string }
  | { id: string; type: 'product'; productId: string };
export interface PageDocument { title: string; blocks: ContentBlock[] }

export function fail(code: string, message: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_CONTENT', 'Objet de contenu attendu.');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: string[]) {
  if (Object.keys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    fail('INVALID_CONTENT', 'Champs de contenu inconnus ou manquants.');
  }
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('INVALID_CONTENT', 'Texte vide ou trop long.');
  return value;
}
function reference(value: unknown): string {
  const id = text(value, 160);
  if (!/^[1-9][0-9]*$/.test(id) || Number(id) > 2147483647) fail('INVALID_CONTENT', 'Référence catalogue invalide.');
  return id;
}

/** Fixed field order makes digests independent of incoming JSON key order. No HTML is executed. */
export function validateDocument(input: unknown): PageDocument {
  const value = object(input);
  keys(value, ['title', 'blocks']);
  const title = text(value.title, 160);
  if (!Array.isArray(value.blocks) || value.blocks.length > 100) fail('INVALID_CONTENT', '100 blocs maximum.');
  const ids = new Set<string>();
  const blocks = value.blocks.map(inputBlock => {
    const block = object(inputBlock);
    const id = text(block.id, 80);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) fail('INVALID_CONTENT', 'Identifiant de bloc invalide ou répété.');
    ids.add(id);
    switch (block.type) {
      case 'text':
        keys(block, ['id', 'type', 'text']);
        return { id, type: 'text' as const, text: text(block.text, 20000) };
      case 'media':
        keys(block, ['id', 'type', 'assetId', 'alt']);
        return { id, type: 'media' as const, assetId: reference(block.assetId), alt: text(block.alt, 500) };
      case 'product':
        keys(block, ['id', 'type', 'productId']);
        return { id, type: 'product' as const, productId: reference(block.productId) };
      default: return fail('INVALID_CONTENT', 'Type de bloc inconnu.');
    }
  });
  if (Buffer.byteLength(JSON.stringify({ title, blocks }), 'utf8') > 256000) fail('INVALID_CONTENT', 'Contenu trop volumineux.');
  return { title, blocks };
}

export const contentDigest = (document: PageDocument) => `sha256:${createHash('sha256').update(JSON.stringify(document)).digest('hex')}`;
