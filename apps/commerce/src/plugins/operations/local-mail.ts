import { Connection, refuse, validate } from './contracts';
import type { Receipt, Transport } from './types';

// Test receiver only. No SMTP or external host can be configured here.
export class LocalMailTransport implements Transport {
  private readonly origin: string;
  constructor(
    origin: string,
    private readonly timeoutMs = 3000,
  ) {
    const url = new URL(origin);
    if (
      url.protocol !== 'http:' ||
      url.hostname !== '127.0.0.1' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      refuse('LOCAL_RECEIVER_REQUIRED');
    this.origin = url.origin;
  }
  private async request(path: string, init?: RequestInit): Promise<Receipt | null> {
    const response = await fetch(this.origin + path, {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('LOCAL_PROVIDER_UNAVAILABLE');
    const receipt = (await response.json()) as Receipt;
    validate('Money', receipt.cost);
    if (
      typeof receipt.providerRequestId !== 'string' ||
      typeof receipt.evidenceRef !== 'string' ||
      typeof receipt.requestDigest !== 'string'
    )
      throw new Error('INVALID_RECEIPT');
    return receipt;
  }
  async send(connection: Connection, key: string, requestDigest: string, payload: Record<string, unknown>) {
    if (connection.environment !== 'simulation') refuse('SIMULATION_ONLY');
    const result = await this.request('/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: connection.accountId, key, requestDigest, payload }),
    });
    if (!result) throw new Error('UNKNOWN_PROVIDER_RESULT');
    return result;
  }
  lookup(connection: Connection, key: string) {
    if (connection.environment !== 'simulation') refuse('SIMULATION_ONLY');
    return this.request(`/messages/${encodeURIComponent(connection.accountId)}/${encodeURIComponent(key)}`);
  }
}
