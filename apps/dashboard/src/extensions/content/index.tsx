import { api, Button, defineDashboardExtension, Input, Page, PageTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useChannel, usePermissions } from '@vendure/dashboard';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { DocumentEditor, DocumentText } from './editor';
import { Detail, Document, PageSummary, pageFields, errorMessage, documentSignature } from './types';
import './style.css';

function useUnsaved(dirty: boolean) {
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    if (dirty) window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
}

function ContentRoute({ id }: { id?: string }) {
  const { activeChannel } = useChannel();
  const { hasPermissions } = usePermissions();
  return <Page pageId={id ? 'content-detail' : 'content-pages'}>
    <PageTitle>{id ? 'Dossier de page' : 'Pages'}</PageTitle>
    <div>
      <div className="content-workspace">
        <p className="content-context">Contenu · Canal {activeChannel?.code ?? 'en cours de chargement'}</p>
        {!hasPermissions(['ReadContent']) ? <p role="alert">Votre rôle ne permet pas de consulter les pages de ce canal.</p>
          : activeChannel && (id ? <PageDetail key={`${activeChannel.id}:${id}`} id={id} channelId={activeChannel.id} />
            : <PageList key={activeChannel.id} channelId={activeChannel.id} languages={activeChannel.availableLanguageCodes ?? [activeChannel.defaultLanguageCode]} defaultLanguage={activeChannel.defaultLanguageCode} />)}
      </div>
    </div>
  </Page>;
}

function PageList({ channelId, languages, defaultLanguage }: { channelId: string; languages: string[]; defaultLanguage: string }) {
  const { hasPermissions } = usePermissions();
  const canEdit = hasPermissions(['EditContent']);
  const [skip, setSkip] = useState(0);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [language, setLanguage] = useState(defaultLanguage);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['content-pages', channelId, skip], queryFn: () => api.query<{ contentPages: { items: PageSummary[]; totalItems: number } }>(`query($skip:Int!) { contentPages(skip:$skip, take:20) { items { ${pageFields} } totalItems } }`, { skip }), retry: false });
  useUnsaved(creating && !!(title || slug));
  // Navigate after React has removed the beforeunload guard for the saved form.
  useEffect(() => {
    if (createdId) window.location.assign(`/dashboard/content/${createdId}`);
  }, [createdId]);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const result = await api.query<{ createContentPage: { id: string } }>('mutation($input: CreateContentPageInput!) { createContentPage(input:$input) { id } }', { input: { slug, languageCode: language, document: { title, blocks: [] } } });
      setTitle(''); setSlug(''); setCreating(false);
      setCreatedId(result.createContentPage.id);
    } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(false); }
  }
  return <>
    <div className="content-heading"><div><h2>Préparer les pages de la boutique</h2><p>Rédigez, comparez les versions et choisissez celle à publier ensuite.</p></div>
      {canEdit && !creating && <Button onClick={() => setCreating(true)}>Créer une page</Button>}</div>
    {!canEdit && <p className="content-notice">Lecture seule. Vous pouvez consulter l’historique et les aperçus.</p>}
    {creating && <form className="content-panel content-create" onSubmit={event => void create(event)}>
      <h2>Nouvelle page</h2>
      <label>Titre<Input autoFocus required value={title} maxLength={160} onChange={event => setTitle(event.target.value)} /></label>
      <label>Adresse de la page<Input required value={slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} placeholder="notre-histoire" onChange={event => setSlug(event.target.value)} /><span className="content-note">Lettres minuscules, chiffres et tirets. L’adresse reste fixe pour cette page.</span></label>
      <label>Langue<Select value={language} onValueChange={value => { if (value) setLanguage(value); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{languages.map(code => <SelectItem key={code} value={code}>{code.toUpperCase()}</SelectItem>)}</SelectContent></Select></label>
      <div className="content-actions"><Button type="submit" disabled={busy}>{busy ? 'Création…' : 'Créer le brouillon'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setCreating(false)}>Annuler</Button></div>
    </form>}
    {message && <p role="alert" className="content-error">{message}</p>}
    {query.isPending ? <p role="status">Chargement des pages…</p> : query.isError ? <div role="alert" className="content-error"><p>{errorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button></div>
      : !query.data.contentPages.totalItems ? <div className="content-empty"><h2>Aucune page pour ce canal</h2><p>Créez un brouillon pour commencer à structurer le contenu de votre boutique.</p></div>
        : <div className="content-panel"><ul className="content-list">{query.data.contentPages.items.map(page => <li key={page.id}>
          <a href={`/dashboard/content/${page.id}`}><strong>{page.title}</strong><span className="content-note">/{page.slug} · {page.languageCode.toUpperCase()}</span></a>
          <div><span>Dernière version v{page.headVersion}</span><span className="content-note">{page.selectedVersion ? `v${page.selectedVersion} sélectionnée · Non publiée` : 'Aucune version sélectionnée'}</span></div>
        </li>)}</ul><div className="content-pagination"><span>{query.data.contentPages.totalItems} page(s)</span><Button variant="outline" disabled={!skip} onClick={() => setSkip(skip - 20)}>Précédentes</Button><Button variant="outline" disabled={skip + 20 >= query.data.contentPages.totalItems} onClick={() => setSkip(skip + 20)}>Suivantes</Button></div></div>}
  </>;
}

function PageDetail({ id, channelId }: { id: string; channelId: string }) {
  const { hasPermissions } = usePermissions();
  const canEdit = hasPermissions(['EditContent']);
  const canSelect = hasPermissions(['SelectContent']);
  const [draft, setDraft] = useState<Document | null>(null);
  const [baseRevision, setBaseRevision] = useState<number | null>(null);
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [lease, setLease] = useState<PageSummary | null>(null);
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useQuery({ queryKey: ['content-page', channelId, id], queryFn: () => api.query<{ contentPage: Detail }>(`query($id:ID!) { contentPage(id:$id) { ${pageFields} versions { version parentVersion state document contentDigest createdAt authorId } } }`, { id }), retry: false, refetchOnWindowFocus: false });
  const page = query.data?.contentPage;
  const head = page?.versions.find(version => version.version === page.headVersion);
  const dirty = !!draft && !!head && documentSignature(draft) !== documentSignature(head.document);
  useUnsaved(dirty);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (head && page && !draft) { setDraft(head.document); setBaseRevision(page.revision); setBaseVersion(head.version); setViewVersion(head.version); heading.current?.focus(); } }, [head, page, draft]);
  const held = !!lease && !!lease.expiresAt && new Date(lease.expiresAt).getTime() > now && lease.fencingToken === page?.fencingToken;
  const version = page?.versions.find(item => item.version === viewVersion);
  const parent = page?.versions.find(item => item.version === version?.parentVersion);
  async function action(kind: 'acquire' | 'renew' | 'release' | 'draft' | 'validate' | 'select') {
    if (!page) return;
    setBusy(true); setMessage(''); setSuccess('');
    try {
      const target = { pageId: id, expectedRevision: kind === 'draft' || kind === 'validate' ? baseRevision : page.revision, fencingToken: lease?.fencingToken ?? 0 };
      let result: PageSummary;
      if (kind === 'acquire') result = (await api.query<{ acquireContentLease: PageSummary }>(`mutation($id:ID!, $r:Int!) { acquireContentLease(pageId:$id, expectedRevision:$r) { ${pageFields} } }`, { id, r: page.revision })).acquireContentLease;
      else if (kind === 'renew' || kind === 'release') {
        const operation = kind === 'renew' ? 'renewContentLease' : 'releaseContentLease';
        result = (await api.query<Record<string, PageSummary>>(`mutation($id:ID!, $t:Int!) { ${operation}(pageId:$id, fencingToken:$t) { ${pageFields} } }`, { id, t: target.fencingToken }))[operation];
      } else if (kind === 'select') result = (await api.query<{ selectContentVersion: PageSummary }>(`mutation($input:SelectContentVersionInput!) { selectContentVersion(input:$input) { ${pageFields} } }`, { input: { ...target, version: viewVersion } })).selectContentVersion;
      else result = (await api.query<{ saveContentVersion: PageSummary }>(`mutation($input:SaveContentVersionInput!) { saveContentVersion(input:$input) { ${pageFields} } }`, { input: { ...target, document: draft, validate: kind === 'validate' } })).saveContentVersion;
      setLease(kind === 'release' ? null : result);
      await query.refetch();
      if (kind === 'draft' || kind === 'validate') { setViewVersion(result.headVersion); setBaseRevision(result.revision); setBaseVersion(result.headVersion); }
      if (kind === 'select' && baseRevision === page.revision) setBaseRevision(result.revision);
      setSuccess(kind === 'select' ? `Version v${viewVersion} sélectionnée. Elle n’est pas publiée.` : kind === 'draft' || kind === 'validate' ? `Version v${result.headVersion} enregistrée${kind === 'validate' ? ' et validée' : ' en brouillon'}.` : kind === 'release' ? 'Réservation libérée.' : 'Réservation d’édition active pour cinq minutes.');
    } catch (error) { setMessage(errorMessage(error)); } finally { setBusy(false); }
  }
  if (query.isPending) return <p role="status">Chargement du dossier de page…</p>;
  if (query.isError || !page) return <div role="alert" className="content-error"><p>{errorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button><a href="/dashboard/content">Retour aux pages</a></div>;
  return <>
    <a className="content-back" href="/dashboard/content">← Toutes les pages</a>
    <div className="content-heading"><div><h2 ref={heading} tabIndex={-1}>{page.title}</h2><p>/{page.slug} · {page.languageCode.toUpperCase()} · Révision {page.revision}</p></div><span className="content-badge">{page.selectedVersion ? `v${page.selectedVersion} sélectionnée` : 'Aucune version sélectionnée'}</span></div>
    <p className="content-note">Les versions enregistrées restent dans l’historique. La sélection prépare une future publication.</p>
    <section className="content-panel content-lease" aria-label="Réservation d’édition">
      <div><h3>{held ? 'Votre réservation est active' : canEdit ? 'Réserver cette page pour la modifier' : 'Consultation en lecture seule'}</h3>
        <p>{held ? `Expire à ${new Date(lease!.expiresAt!).toLocaleTimeString('fr-FR')}. Renouvelez-la avant de poursuivre.` : page.expiresAt && new Date(page.expiresAt).getTime() > now ? 'Une réservation est déjà active. Seul son détenteur peut enregistrer une version.' : 'L’historique et les aperçus restent consultables sans réservation.'}</p>
        {lease && !held && <p className="content-error" role="status">Votre réservation n’est plus active. Votre saisie est conservée.</p>}</div>
      {canEdit && <div className="content-actions">{held ? <><Button variant="outline" disabled={busy} onClick={() => void action('renew')}>Renouveler</Button><Button variant="ghost" disabled={busy} onClick={() => void action('release')}>Libérer</Button></> : <Button disabled={busy} onClick={() => void action('acquire')}>Réserver l’édition</Button>}</div>}
    </section>
    {message && <div role="alert" className="content-error"><p>{message}</p><Button variant="outline" disabled={busy} onClick={() => void query.refetch()}>Recharger l’historique</Button></div>}
    {success && <p role="status" className="content-success">{success}</p>}
    <div className="content-columns">
      <section className="content-panel"><div className="content-section-heading"><h2>Préparer la version suivante</h2><span className="content-note">Base v{baseVersion}{dirty ? ' · Saisie non enregistrée' : ''}</span></div>
        {baseRevision !== page.revision && <div className="content-error" role="alert"><p>Votre saisie repose sur une ancienne révision. Comparez-la avec l’historique avant de reprendre.</p><Button variant="outline" disabled={busy} onClick={() => {
          if (head && window.confirm('Remplacer votre saisie par la dernière version enregistrée ?')) { setDraft(head.document); setBaseRevision(page.revision); setBaseVersion(head.version); setMessage(''); }
        }}>Reprendre la dernière version</Button></div>}
        {draft && <DocumentEditor value={draft} onChange={setDraft} disabled={!held || !canEdit || busy} />}
        <div className="content-actions content-save"><Button variant="outline" disabled={!held || !canEdit || busy || baseRevision !== page.revision} onClick={() => void action('draft')}>Enregistrer un brouillon</Button><Button disabled={!held || !canEdit || busy || baseRevision !== page.revision} onClick={() => void action('validate')}>Enregistrer et valider</Button></div>
        <p className="content-note">Valider vérifie les blocs et leurs références. Cela ne vaut ni approbation d’une action ni publication.</p>
      </section>
      <aside className="content-panel"><h2>Historique</h2><ol className="content-history">{page.versions.map(item => <li key={item.version}><button type="button" aria-pressed={item.version === viewVersion} onClick={() => setViewVersion(item.version)}><strong>v{item.version} · {item.state === 'validated' ? 'Validée' : 'Brouillon'}</strong><span>{new Date(item.createdAt).toLocaleString('fr-FR')}</span><span>{item.parentVersion ? `Issue de v${item.parentVersion}` : 'Première version'}{item.version === page.selectedVersion ? ' · Sélectionnée' : ''}</span></button></li>)}</ol></aside>
    </div>
    {version && <section className="content-panel"><div className="content-section-heading"><h2>Comparer la version v{version.version}</h2><span className="content-badge">{version.state === 'validated' ? 'Validée' : 'Brouillon'}</span></div>
      <div className="content-comparison"><div><h3>{parent ? `Avant · v${parent.version}` : 'Avant · aucune version'}</h3>{parent ? <DocumentText document={parent.document} /> : <p className="content-note">Cette version est la première de la page.</p>}</div><div><h3>Après · v{version.version}</h3><DocumentText document={version.document} /></div></div>
      <p className="content-digest">Empreinte : {version.contentDigest}</p>
      <div className="content-actions"><Button disabled={!held || !canSelect || busy || version.state !== 'validated' || page.selectedVersion === version.version} onClick={() => void action('select')}>Sélectionner v{version.version} pour publication</Button></div>
      {!canSelect && <p className="content-note">Votre rôle ne permet pas de sélectionner une version.</p>}
      <ContentPreview id={id} channelId={channelId} version={version.version} />
    </section>}
  </>;
}

function ContentPreview({ id, channelId, version }: { id: string; channelId: string; version: number }) {
  type Preview = { title: string; blocks: (Document['blocks'][number] & { missing?: boolean; name?: string })[]; assets: { id: string; preview: string }[] };
  const query = useQuery({ queryKey: ['content-preview', channelId, id, version], queryFn: () => api.query<{ contentPreview: Preview }>('query($id:ID!, $v:Int!) { contentPreview(pageId:$id, version:$v) { title blocks assets { id preview } } }', { id, v: version }), retry: false });
  return <div className="content-preview"><h3>Aperçu local · v{version}</h3><p className="content-note">Cet aperçu n’est pas un site publié. Les prix, stocks et achats restent hors de cette vue.</p>
    {query.isPending ? <p role="status">Chargement de l’aperçu…</p> : query.isError ? <p role="alert">{errorMessage(query.error)}</p> : <article><h2>{query.data.contentPreview.title}</h2>{query.data.contentPreview.blocks.map(block => <div key={block.id}>
      {block.missing ? <p className="content-error">Référence absente du catalogue actuel.</p> : block.type === 'text' ? <p className="content-copy">{block.text}</p> : block.type === 'product' ? <div className="content-product"><span className="content-note">Produit lié · #{block.productId}</span><strong>{block.name}</strong></div> : <figure><img src={query.data.contentPreview.assets.find(asset => asset.id === block.assetId)?.preview} alt={block.alt} loading="lazy" /></figure>}
    </div>)}</article>}
  </div>;
}

defineDashboardExtension({
  navSections: [{ id: 'content', title: 'Boutique et contenu', order: 30 }],
  routes: [
    { path: '/content', component: () => <ContentRoute />, navMenuItem: { sectionId: 'content', title: 'Pages', requiresPermission: ['ReadContent'] } },
    { path: '/content/$id', component: route => <ContentRoute id={route.useParams().id} /> },
  ],
});
