import { createHash } from 'node:crypto';

// s12-c14n-v1: UTF-8, sorted UTF-16 keys, NFC strings, safe integers only.
export function canonical(value: unknown, depth = 0): string {
  if (depth > 32) throw new Error('AMBIGUOUS_VALUE');
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error('AMBIGUOUS_NUMBER');
    return String(value);
  }
  if (typeof value === 'string') {
    if (
      value !== value.normalize('NFC') ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)
    )
      throw new Error('AMBIGUOUS_STRING');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1)
      throw new Error('AMBIGUOUS_ARRAY');
    const items = [];
    for (let index = 0; index < value.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !('value' in descriptor)) throw new Error('AMBIGUOUS_ARRAY');
      items.push(canonical(descriptor.value, depth + 1));
    }
    return `[${items.join(',')}]`;
  }
  if (typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    if (Reflect.ownKeys(value).length !== Object.keys(value).length) throw new Error('AMBIGUOUS_OBJECT');
    return `{${Object.keys(value)
      .sort()
      .map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
        if (!('value' in descriptor)) throw new Error('AMBIGUOUS_OBJECT');
        return `${canonical(key)}:${canonical(descriptor.value, depth + 1)}`;
      })
      .join(',')}}`;
  }
  throw new Error('AMBIGUOUS_VALUE');
}

export function digest(value: unknown): string {
  const encoded = canonical(value);
  if (Buffer.byteLength(encoded, 'utf8') > 65_536) throw new Error('INPUT_TOO_LARGE');
  return `sha256:${createHash('sha256').update(encoded, 'utf8').digest('hex')}`;
}
