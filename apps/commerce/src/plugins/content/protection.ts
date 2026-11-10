import { RequestContext } from '@vendure/core';
import { ContentPage } from './content.entity';

export const CONTENT_PROTECTION = Symbol('CONTENT_PROTECTION');
export interface ContentProtection {
  /** Called inside the transaction holding the page row lock, including after lease expiry.
   * S51 must take the same lock when activating/deactivating a protection, and query its
   * durable registry through this ctx. Fail closed when that registry is unavailable. */
  assertEditable(ctx: RequestContext, page: ContentPage): Promise<void>;
}
export const noExperimentsYet: ContentProtection = { async assertEditable() {} };
