import { canonical } from './canonical';
import * as generated from './generated/validators';
export * from './generated/contracts';

const validators = generated as Record<string, (value: unknown) => boolean>;
export function validate<T>(name: string, value: unknown): T {
  canonical(value);
  if (!validators[name]?.(value)) throw new Error(`INVALID_${name.toUpperCase()}`);
  return value as T;
}

export class OperationError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export function refuse(code: string): never {
  throw new OperationError(code);
}
export function fault(code: string, retry: 'never' | 'after_revalidation' | 'reconcile_first' = 'after_revalidation') {
  return { code, retry, message: code };
}
