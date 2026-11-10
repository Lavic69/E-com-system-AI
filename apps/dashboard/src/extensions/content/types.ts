export type Block = { id: string } & (
  { type: 'text'; text: string } | { type: 'media'; assetId: string; alt: string } | { type: 'product'; productId: string }
);
export interface Document { title: string; blocks: Block[] }
export interface PageSummary {
  id: string; channelId: string; slug: string; title: string; languageCode: string;
  revision: number; headVersion: number; selectedVersion: number | null;
  fencingToken: number; leaseHolder: string | null; expiresAt: string | null;
}
export interface Version {
  version: number; parentVersion: number | null; state: 'draft' | 'validated'; document: Document;
  contentDigest: string; createdAt: string; authorId: string;
}
export interface Detail extends PageSummary { versions: Version[] }
export const pageFields = 'id channelId slug title languageCode revision headVersion selectedVersion fencingToken leaseHolder expiresAt';
// PostgreSQL jsonb does not preserve object key order.
export const documentSignature = (document: Document) => JSON.stringify(document, ['title', 'blocks', 'id', 'type', 'text', 'assetId', 'alt', 'productId']);

export function errorMessage(error: unknown): string {
  const errors = (error as { fieldErrors?: { extensions?: { code?: string }; message?: string }[] })?.fieldErrors;
  const code = errors?.[0]?.extensions?.code;
  const messages: Record<string, string> = {
    TARGET_VERSION_CHANGED: 'La page a changé. Votre saisie est conservée. Rechargez la version actuelle avant de la reprendre.',
    EDIT_RESERVED: 'Cette page est réservée par un autre éditeur ou protégée par une expérience. Vous pouvez consulter ses versions.',
    EDIT_LEASE_LOST: 'Votre réservation a expiré ou a été remplacée. Votre saisie est conservée. Réservez à nouveau avant de sauvegarder.',
    CONTENT_REFERENCE_NOT_FOUND: 'Un produit ou un média est absent de ce canal. Vérifiez les références des blocs.',
    CONTENT_SLUG_EXISTS: 'Cette adresse existe déjà dans cette langue. Choisissez une autre adresse.',
    CONTENT_NOT_FOUND: 'Cette page n’est pas accessible dans le canal actif.',
    CONTENT_NOT_VALIDATED: 'Choisissez une version validée pour préparer sa publication.',
    FORBIDDEN: 'Votre rôle ne permet pas cette action dans le canal actif.',
    UNAUTHORIZED: 'Votre session a expiré. Reconnectez-vous.',
    INVALID_CONTENT: errors?.[0]?.message ?? 'Vérifiez la structure et le contenu des blocs.',
  };
  return code && messages[code] || 'La requête n’a pas été confirmée. Votre saisie est conservée. Rechargez l’historique pour vérifier son résultat avant de réessayer.';
}
