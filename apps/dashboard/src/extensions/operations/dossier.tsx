import type {
  Action,
  Authorization,
  BudgetReservation,
} from '../../../../commerce/src/plugins/operations/generated/contracts';
import './operations.css';

export interface Dossier {
  action: Action;
  approvals: Authorization[];
  reservations: BudgetReservation[];
}
export const stateLabels: Record<string, string> = {
  prepared: 'Préparée',
  awaiting_approval: 'À valider',
  queued: 'En file',
  running: 'En cours',
  awaiting_provider: 'En attente du fournisseur',
  succeeded: 'Réussie',
  partial: 'Partielle',
  failed: 'Échec confirmé',
  uncertain: 'À rapprocher',
  cancelled: 'Annulée',
};
const errorLabels: Record<string, string> = {
  TARGET_VERSION_CHANGED:
    'La cible a changé depuis la proposition. Préparez une nouvelle proposition sur sa version actuelle.',
  EDIT_LEASE_LOST: 'La réservation d’édition a expiré ou changé. Réservez la page et préparez une nouvelle proposition.',
  CONTENT_REFERENCE_NOT_FOUND: 'Un produit ou média référencé est absent de ce marché. Corrigez la page avant de reprendre.',
  CONTENT_NOT_FOUND: 'La page est absente de ce canal.',
  INVALID_CONTENT_ACTION: 'La proposition de contenu est invalide. Préparez une nouvelle proposition.',
  FORBIDDEN: 'Les droits nécessaires ont été retirés. Une nouvelle autorisation est requise.',
  DELEGATION_REVOKED: 'La délégation de cet agent ne permet plus cette action.',
  BUDGET_EXCEEDED: 'Le budget disponible ne permet pas de réserver ce montant.',
  COST_CEILING_EXCEEDED:
    'Le reçu dépasse le plafond approuvé. Le coût réel est conservé et les nouveaux appels sur ce budget sont bloqués.',
  MANUAL_RECONCILIATION_REQUIRED:
    'Cette connexion ne permet pas de retrouver le message. Vérifiez son résultat avant toute nouvelle action.',
  PROVIDER_RESULT_UNKNOWN:
    'Le fournisseur n’a pas confirmé le résultat. La réservation est conservée pendant le rapprochement.',
  POLICY_CHANGED: 'Les règles d’autorisation ont changé. La proposition doit être réexaminée.',
  APPROVAL_EXPIRED: 'L’approbation a expiré. Une nouvelle validation est nécessaire.',
};
const amount = (minor: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(minor / 100);
const date = (value: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function DossierDetail({ dossier }: { dossier: Dossier }) {
  const { action, approvals, reservations } = dossier;
  const operation = action.operations[0];
  const currency = action.proposal.costCeiling.currency;
  const known = reservations.length
    ? reservations.every((r) => r.knownCost !== null)
    : operation.state === 'succeeded' && !operation.connectionId;
  const knownMinor = reservations.reduce((sum, r) => sum + (r.knownCost?.minor ?? 0), 0);
  const held = reservations.reduce((sum, r) => sum + r.held.minor, 0);
  return (
    <article className="ops-dossier" aria-label={`Dossier ${action.target.id}`}>
      <header className="ops-detail-header">
        <div>
          <p className="ops-eyebrow">Dossier d’action</p>
          <h2>{action.target.kind === 'content-page' ? `Page ${action.target.id}` : action.target.id}</h2>
        </div>
        <span className={`ops-state ops-state-${action.state}`}>{stateLabels[action.state]}</span>
      </header>
      {action.target.kind === 'content-page' && (
        <a href={`/dashboard/content/${encodeURIComponent(action.target.id)}`}>Ouvrir la page et son historique</a>
      )}
      {action.target.kind === 's12-fixture' && (
        <p className="ops-notice">Démonstration locale sur une cible de test.</p>
      )}
      <section aria-labelledby="ops-target">
        <h3 id="ops-target">Objet et proposition</h3>
        <dl className="ops-fields">
          <div>
            <dt>Version visée</dt>
            <dd>{action.target.version}</dd>
          </div>
          <div>
            <dt>Proposition</dt>
            <dd>{action.proposal.version}</dd>
          </div>
          <div>
            <dt>Marché · langue</dt>
            <dd>
              {action.context.scope.marketId} · {action.context.scope.languageCode}
            </dd>
          </div>
          <div>
            <dt>Préparée le</dt>
            <dd>{date(action.context.resolvedAt)}</dd>
          </div>
        </dl>
        <p className="ops-reference">Référence de la modification : {action.proposal.changeRef}</p>
      </section>
      <section aria-labelledby="ops-decision">
        <h3 id="ops-decision">Décision et coût</h3>
        <dl className="ops-costs">
          <div>
            <dt>
              {action.authorization && action.state !== 'awaiting_approval' ? 'Plafond approuvé' : 'Plafond proposé'}
            </dt>
            <dd>{amount(action.proposal.costCeiling.minor, currency)}</dd>
          </div>
          <div>
            <dt>Montant réservé</dt>
            <dd>{amount(held, currency)}</dd>
          </div>
          <div>
            <dt>Coût connu</dt>
            <dd>{known ? amount(knownMinor, currency) : 'Inconnu'}</dd>
          </div>
        </dl>
        <p>
          {action.authorization
            ? action.state === 'awaiting_approval'
              ? 'L’approbation précédente est conservée dans l’historique. Cette action attend une nouvelle validation.'
              : `Approbation enregistrée le ${date(action.authorization.issuedAt)}. Valable jusqu’au ${date(action.authorization.expiresAt)}.`
            : 'Cette proposition attend une approbation.'}
        </p>
        {held > 0 && (
          <p className="ops-metadata">
            Le montant réservé reste engagé tant que le coût n’est pas rapproché, y compris après la fin de période.
          </p>
        )}
      </section>
      <section aria-labelledby="ops-result">
        <h3 id="ops-result">Résultat et preuves</h3>
        {action.error && (
          <p className="ops-notice" role="status">
            {errorLabels[action.error.code] ?? 'L’action est bloquée. Consultez le motif conservé dans sa trace.'}
          </p>
        )}
        {operation.evidenceRefs.length ? (
          <ul className="ops-evidence">
            {operation.evidenceRefs.map((ref) => (
              <li key={ref}>
                <span>Preuve conservée</span>
                <code>{ref}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ops-metadata">Aucune preuve de réussite enregistrée.</p>
        )}
        {operation.connectionId && (
          <p className="ops-metadata">Transport local de test. Aucun envoi dans une boîte réelle n’est démontré.</p>
        )}
        <details>
          <summary>Consulter la trace du dossier</summary>
          <dl className="ops-fields ops-trace">
            <div>
              <dt>Dossier</dt>
              <dd>{action.id}</dd>
            </div>
            <div>
              <dt>Opération</dt>
              <dd>{operation.operationId}</dd>
            </div>
            <div>
              <dt>Transmissions</dt>
              <dd>{operation.attemptCount}</dd>
            </div>
            <div>
              <dt>Révision du dossier</dt>
              <dd>{action.revision}</dd>
            </div>
            <div>
              <dt>Motif conservé</dt>
              <dd>{action.error?.code ?? 'Aucun'}</dd>
            </div>
          </dl>
          <p className="ops-metadata">Liaison d’approbation</p>
          <code className="ops-digest">{action.proposal.bindingDigest}</code>
          <p className="ops-metadata">
            {approvals.length} approbation{approvals.length > 1 ? 's' : ''} conservée{approvals.length > 1 ? 's' : ''}{' '}
            dans l’historique.
          </p>
        </details>
      </section>
    </article>
  );
}

export function OperationsView({
  dossiers,
  selectedId,
  onSelect,
  loading,
  error,
  allowed,
  onRefresh,
  refreshing = false,
}: {
  dossiers: Dossier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  error: boolean;
  allowed: boolean;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const selected = dossiers.find((d) => d.action.id === selectedId) ?? dossiers[0];
  return (
    <div className="ops-screen">
      <div className="ops-intro">
        <p>Retrouvez la décision, le budget engagé et la preuve de chaque action.</p>
        {allowed && (
          <button type="button" className="ops-refresh" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
        )}
      </div>
      {!allowed ? (
        <p className="ops-empty" role="alert">
          Accès refusé. Votre rôle ne permet pas de lire les dossiers d’action.
        </p>
      ) : loading ? (
        <p className="ops-empty" role="status">
          Chargement des dossiers…
        </p>
      ) : error ? (
        <p className="ops-empty" role="alert">
          Les dossiers n’ont pas pu être chargés. Vérifiez votre connexion puis actualisez.
        </p>
      ) : dossiers.length === 0 ? (
        <div className="ops-empty">
          <h2>Aucun dossier sur ce canal</h2>
          <p>Les propositions et leurs résultats apparaîtront ici lorsqu’une action sera préparée.</p>
        </div>
      ) : (
        <div className="ops-layout">
          <nav className="ops-list" aria-label="Dossiers d’action">
            <p className="ops-eyebrow">Dossiers récents · {dossiers.length}</p>
            {dossiers.map(({ action }) => (
              <button
                key={action.id}
                type="button"
                aria-current={selected?.action.id === action.id ? 'true' : undefined}
                onClick={() => onSelect(action.id)}
              >
                <strong>{action.target.kind === 'content-page' ? `Page ${action.target.id}` : action.target.id}</strong>
                <span>{stateLabels[action.state]}</span>
                <small>
                  Proposition {action.proposal.version} · cible v{action.target.version}
                </small>
              </button>
            ))}
            {dossiers.length === 100 && (
              <p className="ops-metadata">Les 100 dossiers les plus récents sont affichés.</p>
            )}
          </nav>
          {selected && <DossierDetail dossier={selected} />}
        </div>
      )}
    </div>
  );
}
