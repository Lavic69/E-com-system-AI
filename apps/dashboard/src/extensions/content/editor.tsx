import { Button, Input, Textarea } from '@vendure/dashboard';
import type { Block, Document } from './types';

export function DocumentEditor({ value, onChange, disabled }: { value: Document; onChange: (value: Document) => void; disabled: boolean }) {
  const update = (index: number, block: Block) => onChange({ ...value, blocks: value.blocks.map((old, i) => i === index ? block : old) });
  const move = (index: number, offset: number) => {
    const blocks = [...value.blocks];
    [blocks[index], blocks[index + offset]] = [blocks[index + offset], blocks[index]];
    onChange({ ...value, blocks });
  };
  function add(type: Block['type']) {
    const id = crypto.randomUUID();
    const block: Block = type === 'text' ? { id, type, text: '' } : type === 'media' ? { id, type, assetId: '', alt: '' } : { id, type, productId: '' };
    onChange({ ...value, blocks: [...value.blocks, block] });
  }
  return <fieldset disabled={disabled} className="content-editor">
    <label>Titre de la page<Input value={value.title} maxLength={160} onChange={event => onChange({ ...value, title: event.target.value })} /></label>
    {value.blocks.map((block, index) => <fieldset className="content-block" key={block.id}>
      <legend>{index + 1}. {block.type === 'text' ? 'Texte' : block.type === 'media' ? 'Média' : 'Référence produit'}</legend>
      {block.type === 'text' && <label>Texte du bloc {index + 1}<Textarea value={block.text} maxLength={20000} rows={5} onChange={event => update(index, { ...block, text: event.target.value })} /></label>}
      {block.type === 'media' && <>
        <label>Identifiant du média<Input inputMode="numeric" value={block.assetId} onChange={event => update(index, { ...block, assetId: event.target.value })} /></label>
        <label>Texte alternatif<Input value={block.alt} maxLength={500} onChange={event => update(index, { ...block, alt: event.target.value })} /></label>
        <p className="content-note">Utilisez une image de la bibliothèque du canal actif.</p>
      </>}
      {block.type === 'product' && <>
        <label>Identifiant du produit<Input inputMode="numeric" value={block.productId} onChange={event => update(index, { ...block, productId: event.target.value })} /></label>
        <p className="content-note">Le produit reste lié au catalogue. Ses prix et stocks ne sont pas copiés dans la page.</p>
      </>}
      <div className="content-actions">
        <Button type="button" variant="outline" disabled={disabled || index === 0} aria-label={`Monter le bloc ${index + 1}`} onClick={() => move(index, -1)}>Monter</Button>
        <Button type="button" variant="outline" disabled={disabled || index === value.blocks.length - 1} aria-label={`Descendre le bloc ${index + 1}`} onClick={() => move(index, 1)}>Descendre</Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({ ...value, blocks: value.blocks.filter((_, i) => i !== index) })} aria-label={`Retirer le bloc ${index + 1}`}>Retirer</Button>
      </div>
    </fieldset>)}
    {!value.blocks.length && <p className="content-note">Ajoutez un premier bloc à votre page.</p>}
    <div className="content-actions">
      <Button type="button" variant="outline" disabled={disabled || value.blocks.length >= 100} onClick={() => add('text')}>Ajouter un texte</Button>
      <Button type="button" variant="outline" disabled={disabled || value.blocks.length >= 100} onClick={() => add('media')}>Ajouter un média</Button>
      <Button type="button" variant="outline" disabled={disabled || value.blocks.length >= 100} onClick={() => add('product')}>Ajouter un produit</Button>
    </div>
  </fieldset>;
}

export function DocumentText({ document }: { document: Document }) {
  return <div className="content-document"><h3>{document.title}</h3>{document.blocks.map(block => <div key={block.id}>
    {block.type === 'text' ? <p className="content-copy">{block.text}</p> : block.type === 'media' ? <p>Média #{block.assetId} · {block.alt}</p> : <p>Produit #{block.productId}</p>}
  </div>)}</div>;
}
