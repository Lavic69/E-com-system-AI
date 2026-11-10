import {
  api, Button, defineDashboardExtension, Input, Page, PageBlock, PageLayout, PageTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, useChannel, usePermissions,
} from '@vendure/dashboard';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

type Context = { channelCode: string; currencyCode: string; languageCode: string; pricesIncludeTax: boolean; stockLocations: { id: string; name: string }[] };
type Row = { line: number; key: string; name: string; sku: string; price: number | null; stock: number | null; status: string; message: string; productId?: string };
type Result = { previewHash: string; rows: Row[] };
const fields = 'previewHash rows { line key name sku price stock status message productId }';
const labels: Record<string, string> = { ready: 'Prêt', invalid: 'À corriger', conflict: 'Conflit', imported: 'Importé', alreadyImported: 'Déjà importé', failed: 'À vérifier' };
const sample = 'key,name,sku,price,stock\nexemple-tasse,Tasse de démonstration,TASSE-DEMO,1290,12\n';

function ImportForm({ channelId }: { channelId: string }) {
  const { hasPermissions } = usePermissions();
  const allowed = hasPermissions(['CreateCatalog']) || hasPermissions(['CreateProduct']);
  const [csv, setCsv] = useState('');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState<Result>();
  const [busy, setBusy] = useState<'preview' | 'apply' | 'file'>();
  const [error, setError] = useState('');
  const context = useQuery({
    queryKey: ['catalogue-import-context', channelId], enabled: allowed, retry: false,
    queryFn: () => api.query<{ catalogueImportContext: Context }>(`query { catalogueImportContext { channelCode currencyCode languageCode pricesIncludeTax stockLocations { id name } } }`),
  });
  const market = context.data?.catalogueImportContext;
  const stockLocationId = location || market?.stockLocations[0]?.id || '';
  const ready = result?.rows.filter(row => row.status === 'ready').length ?? 0;
  const edit = (value: string) => { setCsv(value); setResult(undefined); setError(''); };

  async function run(apply: boolean) {
    setBusy(apply ? 'apply' : 'preview'); setError('');
    try {
      const variables = { csv, stockLocationId, previewHash: result?.previewHash };
      if (apply) {
        const data = await api.query<{ applyCatalogueImport: Result }>(`mutation Import($csv: String!, $stockLocationId: ID!, $previewHash: String!) {
          applyCatalogueImport(csv: $csv, stockLocationId: $stockLocationId, previewHash: $previewHash) { ${fields} }
        }`, variables);
        setResult(data.applyCatalogueImport);
      } else {
        const data = await api.query<{ previewCatalogueImport: Result }>(`query Preview($csv: String!, $stockLocationId: ID!) {
          previewCatalogueImport(csv: $csv, stockLocationId: $stockLocationId) { ${fields} }
        }`, variables);
        setResult(data.previewCatalogueImport);
      }
    } catch {
      setResult(undefined);
      setError(apply
        ? 'Le résultat n’a pas été reçu. Refaire l’aperçu avec le même fichier et les mêmes clés avant de reprendre.'
        : 'Aperçu indisponible. Vérifier l’accès à l’API, le marché, l’emplacement et le format CSV indiqué ci-dessous.');
    } finally { setBusy(undefined); }
  }

  return <Page pageId="catalogue-import">
    <PageTitle>Importer des produits</PageTitle>
    <PageLayout><PageBlock column="main" blockId="catalogue-import-form">
      {!allowed ? <p role="alert">Accès refusé. La création de produits est nécessaire pour importer un catalogue.</p>
        : context.isPending ? <p role="status">Chargement du marché et des emplacements…</p>
        : context.isError ? <div className="space-y-4"><p role="alert">Le marché n’a pas pu être chargé. Vérifier la connexion et les permissions.</p><Button onClick={() => void context.refetch()}>Réessayer</Button></div>
        : <div className="space-y-6 min-w-0">
          <p className="text-muted-foreground">Un produit et une variante par ligne, jusqu’à 100 lignes. L’aperçu ne modifie pas le catalogue. Les produits importés seront activés. Les clés déjà importées sont conservées pour permettre une reprise.</p>
          <dl className="grid gap-4 sm:grid-cols-3 text-sm">
            <div><dt className="text-muted-foreground">Marché actif</dt><dd className="font-medium break-all">{market?.channelCode}</dd></div>
            <div><dt className="text-muted-foreground">Prix du marché</dt><dd>{market?.currencyCode} · {market?.pricesIncludeTax ? 'Taxes incluses' : 'Hors taxes'}</dd></div>
            <div><dt className="text-muted-foreground">Langue des produits</dt><dd>{market?.languageCode}</dd></div>
          </dl>
          <div className="space-y-2">
            <label htmlFor="import-location" className="font-medium text-sm">Emplacement du stock</label>
            <Select value={stockLocationId} disabled={!!busy} onValueChange={value => { setLocation(value ?? ''); setResult(undefined); }}>
              <SelectTrigger id="import-location" className="w-full min-h-11"><SelectValue placeholder="Choisir un emplacement">{market?.stockLocations.find(item => item.id === stockLocationId)?.name}</SelectValue></SelectTrigger>
              <SelectContent>{market?.stockLocations.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
            {!stockLocationId && <p role="alert">Créer ou affecter un emplacement à ce marché avant l’import.</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="import-file" className="font-medium text-sm">Fichier CSV</label>
            <Input id="import-file" type="file" accept=".csv,text/csv" disabled={!!busy} className="min-h-11" onChange={async event => {
              const file = event.target.files?.[0]; if (!file) return;
              if (file.size > 65536) { setError('Fichier limité à 64 Ko.'); return; }
              setBusy('file');
              try { edit(await file.text()); } catch { setError('Le fichier n’a pas pu être lu.'); }
              finally { setBusy(undefined); }
            }} />
          </div>
          <div className="space-y-2">
            <label htmlFor="import-csv" className="font-medium text-sm">Contenu à vérifier</label>
            <Textarea id="import-csv" aria-describedby="import-format" value={csv} disabled={!!busy} onChange={event => edit(event.target.value)} rows={7} className="font-mono text-sm w-full" placeholder="key,name,sku,price,stock" />
            <p id="import-format" className="text-sm text-muted-foreground break-words">Colonnes : key, name, sku, price, stock. Séparateur : virgule. Prix entier en centimes, par exemple 1290 pour 12,90 EUR ou 12,90 USD. Stock entier positif ou nul. Clé stable et unique par marché. Les lignes invalides seront ignorées.</p>
            <Button variant="ghost" disabled={!!busy} onClick={() => edit(sample)}>Charger un exemple</Button>
          </div>
          {error && <p role="alert" className="text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="min-h-11" disabled={!!busy || !csv.trim() || !stockLocationId} onClick={() => void run(false)}>{busy === 'preview' ? 'Vérification…' : 'Vérifier le fichier'}</Button>
            <Button className="min-h-11 whitespace-normal" disabled={!!busy || ready === 0} onClick={() => void run(true)}>{busy === 'apply' ? 'Import en cours…' : `Importer ${ready} ligne${ready > 1 ? 's' : ''} valide${ready > 1 ? 's' : ''}`}</Button>
          </div>
          {busy && <p role="status">{busy === 'apply' ? 'Création des produits. En cas d’interruption, reprendre avec les mêmes clés.' : 'Vérification en cours…'}</p>}
          {result && <section aria-label="Résultats de l’import" className="space-y-3">
            <h2 className="font-semibold">{result.rows.length} ligne{result.rows.length > 1 ? 's' : ''} vérifiée{result.rows.length > 1 ? 's' : ''}</h2>
            <p role="status" className="text-sm">{ready ? `${ready} ligne(s) prête(s). Vérifier les montants et le stock avant de confirmer.` : 'Consulter le résultat de chaque ligne ci-dessous.'}</p>
            <ol className="divide-y rounded-md border">{result.rows.map(row => <li key={row.line} className="p-4 space-y-2 min-w-0">
              <div className="flex flex-wrap justify-between gap-2"><strong className="break-all">Ligne {row.line} · {row.name || 'Sans nom'}</strong><span className="text-sm font-medium">{labels[row.status] ?? row.status}</span></div>
              <p className="font-mono text-xs break-all">Clé {row.key || 'absente'} · SKU {row.sku || 'absent'}</p>
              <p className="text-sm tabular-nums">Prix du fichier : {row.price === null ? 'invalide' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: market?.currencyCode || 'EUR' }).format(row.price / 100)} · Stock du fichier : {row.stock ?? 'invalide'}</p>
              <p className="text-sm text-muted-foreground break-words">{row.message}</p>
              {row.productId && <a className="text-primary underline underline-offset-4 text-sm" href={`/dashboard/products/${row.productId}`}>Ouvrir le produit</a>}
            </li>)}</ol>
          </section>}
        </div>}
    </PageBlock></PageLayout>
  </Page>;
}

function ImportPage() {
  const { activeChannel } = useChannel();
  return <ImportForm key={activeChannel?.id} channelId={activeChannel?.id ?? ''} />;
}

defineDashboardExtension({
  routes: [{ path: '/catalogue-import', component: ImportPage,
    navMenuItem: { sectionId: 'catalog', title: 'Importer des produits', requiresPermission: ['CreateCatalog', 'CreateProduct'] },
  }],
});
