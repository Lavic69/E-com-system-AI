/* Generated from packages/contracts/contracts.schema.json; sha256:5b962bdfc9581084a408f5e170a45ed902464f7e7c799f8f68b8c65f7f79cfed. Do not edit. */

export interface Contracts {
  Scope?: Scope;
  Reference?: Reference;
  VersionedReference?: VersionedReference;
  Error?: Error;
  Money?: Money;
  Actor?: Actor;
  Context?: Context;
  AmountObservation?: AmountObservation;
  Quote?: Quote;
  Event?: Event;
  Operation?: Operation;
  Authorization?: Authorization;
  Action?: Action;
  Connection?: Connection;
  BudgetReservation?: BudgetReservation;
  ContentVersion?: ContentVersion;
  EditLease?: EditLease;
  CacheDimensions?: CacheDimensions;
  Publication?: Publication;
  Exposure?: Exposure;
  ReservationLine?: ReservationLine;
  StockReservation?: StockReservation;
  PaymentAttempt?: PaymentAttempt;
  AudienceMember?: AudienceMember;
  Creation?: Creation;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Scope".
 */
export interface Scope {
  shopId: string;
  marketId: string;
  channelId: string;
  languageCode: string;
  currencyCode: "EUR" | "USD";
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Reference".
 */
export interface Reference {
  shopId: string;
  kind: string;
  id: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "VersionedReference".
 */
export interface VersionedReference {
  shopId: string;
  kind: string;
  id: string;
  version: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Error".
 */
export interface Error {
  code: string;
  retry: "never" | "reconcile_first" | "after_revalidation";
  message: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Money".
 */
export interface Money {
  minor: number;
  currency: "EUR" | "USD";
  scale: 2;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Actor".
 */
export interface Actor {
  kind: "member" | "customer" | "guest" | "agent" | "system";
  id: string;
  delegationId: string | null;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Context".
 */
export interface Context {
  scope: Scope;
  actor: Actor;
  /**
   * @minItems 0
   */
  permissionCodes: string[];
  policyVersion: string;
  resolvedAt: string;
  requestId: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "AmountObservation".
 */
export interface AmountObservation {
  status: "known" | "estimated" | "unknown";
  value: Money | null;
  sourceRef: string;
  observedAt: string;
  validUntil: string | null;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Quote".
 */
export interface Quote {
  id: string;
  scope: Scope;
  order: VersionedReference;
  status: "known" | "estimated";
  netMinor: number;
  taxMinor: number;
  total: Money;
  roundingPolicy: string;
  taxConfigurationRef: string;
  calculatedAt: string;
  validUntil: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Event".
 */
export interface Event {
  eventId: string;
  schemaVersion: 1;
  type: string;
  payloadVersion: number;
  scope: Scope;
  source: {
    kind: "server" | "provider" | "browser";
    module: string;
    accountId: string | null;
    sourceEventId: string;
  };
  deduplicationKey: string;
  occurredAt: string;
  receivedAt: string;
  recordedAt: string;
  aggregate: Reference;
  sequence: number | null;
  correlationId: string;
  causationId: string | null;
  payload: {
    [k: string]: unknown;
  };
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Operation".
 */
export interface Operation {
  operationId: string;
  idempotencyKey: string;
  requestDigest: string;
  capability: string;
  connectionId: string | null;
  budgetReservationId: string | null;
  state: "prepared" | "running" | "awaiting_provider" | "succeeded" | "failed" | "uncertain" | "cancelled";
  attemptCount: number;
  providerRequestId: string | null;
  /**
   * @minItems 0
   */
  evidenceRefs: string[];
  error: Error | null;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Authorization".
 */
export interface Authorization {
  kind: "approval" | "delegation";
  referenceId: string;
  actorId: string;
  bindingDigest: string;
  policyVersion: string;
  issuedAt: string;
  expiresAt: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Action".
 */
export interface Action {
  id: string;
  revision: number;
  context: Context;
  target: VersionedReference;
  proposal: {
    version: string;
    changeRef: string;
    bindingDigest: string;
    costCeiling: Money;
  };
  authorization: Authorization | null;
  state:
    | "prepared"
    | "awaiting_approval"
    | "queued"
    | "running"
    | "awaiting_provider"
    | "succeeded"
    | "partial"
    | "failed"
    | "uncertain"
    | "cancelled";
  /**
   * @minItems 1
   */
  operations: [Operation, ...Operation[]];
  error: Error | null;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Connection".
 */
export interface Connection {
  id: string;
  shopId: string;
  provider: string;
  accountId: string;
  environment: "simulation" | "sandbox" | "production";
  state: "connected" | "expired" | "revoked" | "unavailable" | "unknown";
  secretRef: string;
  /**
   * @minItems 1
   */
  capabilities: [
    {
      code: string;
      idempotency: "supported" | "unsupported" | "unknown";
      lookup: "supported" | "unsupported" | "unknown";
      idempotencyWindowSeconds: number | null;
    },
    ...{
      code: string;
      idempotency: "supported" | "unsupported" | "unknown";
      lookup: "supported" | "unsupported" | "unknown";
      idempotencyWindowSeconds: number | null;
    }[]
  ];
  quota: {
    status: "known" | "unknown";
    remaining: number | null;
    unit: string;
    observedAt: string;
    resetsAt: string | null;
  };
  perOperationCeiling: Money;
  checkedAt: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "BudgetReservation".
 */
export interface BudgetReservation {
  id: string;
  shopId: string;
  budgetId: string;
  operationId: string;
  connectionId: string;
  periodStart: string;
  periodEnd: string;
  state: "held" | "uncertain" | "reconciled" | "released";
  ceiling: Money;
  held: Money;
  knownCost: Money | null;
  /**
   * @minItems 0
   */
  evidenceRefs: string[];
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "ContentVersion".
 */
export interface ContentVersion {
  scope: Scope;
  pageId: string;
  version: string;
  parentVersion: string | null;
  state: "draft" | "validated";
  contentDigest: string;
  themeVersion: string;
  validatedAt: string | null;
  /**
   * @minItems 0
   */
  evidenceRefs: string[];
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "EditLease".
 */
export interface EditLease {
  id: string;
  scope: Scope;
  target: VersionedReference;
  /**
   * @minItems 1
   */
  paths: [string, ...string[]];
  holder: Reference;
  reason: "editing" | "experiment";
  state: "active" | "released" | "expired";
  fencingToken: number;
  acquiredAt: string;
  expiresAt: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "CacheDimensions".
 */
export interface CacheDimensions {
  scope: Scope;
  publicationId: string;
  artifactId: string;
  pageId: string;
  pageVersion: string;
  experimentId: string;
  experimentVersion: string;
  variantId: string;
  audiencePartition: string;
  catalogRevision: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Publication".
 */
export interface Publication {
  id: string;
  scope: Scope;
  revision: number;
  previousPublicationId: string | null;
  page: VersionedReference;
  themeVersion: string;
  artifact: {
    id: string;
    digest: string;
    /**
     * @minItems 1
     */
    verificationRefs: [string, ...string[]];
  };
  state: "preview" | "published" | "superseded";
  publishedAt: string | null;
  cache: CacheDimensions;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Exposure".
 */
export interface Exposure {
  id: string;
  scope: Scope;
  experimentId: string;
  experimentVersion: string;
  protocolVersion: string;
  variantId: string;
  assignmentId: string;
  subjectPseudonym: string;
  page: VersionedReference;
  artifactId: string;
  renderedAt: string;
  deduplicationKey: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "ReservationLine".
 */
export interface ReservationLine {
  orderLineId: string;
  variant: Reference;
  stockLocation: Reference;
  quantity: number;
  /**
   * @minItems 1
   */
  allocationIds: [string, ...string[]];
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "StockReservation".
 */
export interface StockReservation {
  id: string;
  scope: Scope;
  revision: number;
  order: VersionedReference;
  orderDigest: string;
  state: "held" | "payment_pending" | "uncertain" | "confirmed" | "expired" | "released";
  /**
   * @minItems 1
   */
  lines: [ReservationLine, ...ReservationLine[]];
  paymentAttemptId: string | null;
  createdAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  /**
   * @minItems 0
   */
  evidenceRefs: string[];
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "PaymentAttempt".
 */
export interface PaymentAttempt {
  id: string;
  scope: Scope;
  order: VersionedReference;
  reservationId: string;
  connectionId: string;
  operationId: string;
  idempotencyKey: string;
  requestDigest: string;
  amount: Money;
  state:
    | "prepared"
    | "submitted"
    | "pending"
    | "authorized"
    | "settled"
    | "declined"
    | "cancel_pending"
    | "cancelled"
    | "unknown";
  vendurePaymentId: string | null;
  providerPaymentId: string | null;
  observedAt: string;
  /**
   * @minItems 0
   */
  evidenceRefs: string[];
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "AudienceMember".
 */
export interface AudienceMember {
  scope: Scope;
  customer: Reference;
  /**
   * @minItems 0
   */
  groupIds: string[];
  membershipObservedAt: string;
  destinationRef: string;
  purpose: "marketing" | "transactional";
  channel: "email" | "sms";
  consent: {
    version: string;
    status: "granted" | "denied" | "withdrawn" | "unknown";
    effectiveAt: string;
    validUntil: string | null;
    evidenceRef: string | null;
  };
  suppression: {
    active: boolean;
    effectiveAt: string | null;
    evidenceRef: string | null;
  };
  evaluatedAt: string;
  validUntil: string;
}
/**
 * This interface was referenced by `Contracts`'s JSON-Schema
 * via the `definition` "Creation".
 */
export interface Creation {
  id: string;
  scope: Scope;
  version: string;
  /**
   * @minItems 1
   */
  products: [VersionedReference, ...VersionedReference[]];
  briefVersion: string;
  provider: {
    connectionId: string;
    model: string;
    modelVersion: string;
    requestId: string;
  } | null;
  /**
   * @minItems 1
   */
  provenanceRefs: [string, ...string[]];
  artifact: {
    id: string;
    digest: string;
  };
  fidelityStatus: "unreviewed" | "approved" | "rejected";
  fidelityEvidenceRef: string | null;
  rights: {
    status: "unknown" | "restricted" | "cleared" | "expired";
    holder: string | null;
    /**
     * @minItems 0
     */
    uses: string[];
    /**
     * @minItems 0
     */
    channels: string[];
    /**
     * @minItems 0
     */
    territories: string[];
    validFrom: string | null;
    validUntil: string | null;
    evidenceRef: string | null;
  };
}
