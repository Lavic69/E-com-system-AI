export const CSV_HEADER = ['key', 'name', 'sku', 'price', 'stock'];
export const MAX_IMPORT_ROWS = 100;
export const MAX_CSV_BYTES = 64 * 1024;
export interface ImportRow {
  line: number; key: string; name: string; sku: string; price: number; stock: number; errors: string[];
}

/** Small RFC 4180 reader: comma, escaped quotes, CRLF and quoted newlines. */
export function parseCatalogueCsv(source: string): ImportRow[] {
  if (Buffer.byteLength(source, 'utf8') > MAX_CSV_BYTES) throw new Error('Fichier limité à 64 Ko.');
  const csv = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const records: { values: string[]; line: number }[] = [];
  let record: string[] = [], field = '', quoted = false, closed = false;
  let line = 1, recordLine = 1;
  const endField = () => { record.push(field); field = ''; closed = false; };
  const endRecord = () => {
    endField();
    if (record.some(value => value.length)) records.push({ values: record, line: recordLine });
    record = [];
    recordLine = line;
    if (records.length > MAX_IMPORT_ROWS + 1) throw new Error('Import limité à 100 lignes.');
  };
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '\n') line++;
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ',') endField();
    else if (c === '\n') endRecord();
    else if (c === '"' && !field && !closed) quoted = true;
    else if (c === '"' || closed || c === '\r') throw new Error('CSV invalide : vérifier les guillemets et séparateurs.');
    else field += c;
  }
  if (quoted) throw new Error('CSV invalide : guillemet non fermé.');
  if (field || record.length || closed) endRecord();
  if (records.shift()?.values.map(value => value.trim()).join(',') !== CSV_HEADER.join(',')) {
    throw new Error(`En-tête attendu : ${CSV_HEADER.join(',')}.`);
  }
  if (!records.length) throw new Error('Le fichier ne contient aucune ligne à importer.');
  const rows = records.map(({ values, line }): ImportRow => {
    const [key = '', name = '', sku = '', price = '', stock = ''] = values.map(value => value.trim());
    const errors: string[] = [];
    if (values.length !== 5) errors.push('Cinq colonnes sont attendues.');
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(key)) errors.push('Clé : 1 à 100 caractères alphanumériques, point, tiret ou souligné.');
    if (!name || name.length > 200 || /[\u0000-\u001f]/.test(name)) errors.push('Nom : 1 à 200 caractères, sans saut de ligne.');
    if (!sku || sku.length > 100 || /[\u0000-\u001f]/.test(sku)) errors.push('SKU : 1 à 100 caractères, sans saut de ligne.');
    for (const [label, value] of [['Prix', price], ['Stock', stock]]) {
      if (!/^(0|[1-9]\d*)$/.test(value) || Number(value) > 2147483647) errors.push(`${label} : entier de 0 à 2147483647.`);
    }
    return { line, key, name, sku, price: Number(price), stock: Number(stock), errors };
  });
  for (const row of rows) {
    if (rows.filter(other => other.key === row.key).length > 1) row.errors.push('Clé répétée dans le fichier.');
    if (rows.filter(other => other.sku === row.sku).length > 1) row.errors.push('SKU répété dans le fichier.');
  }
  return rows;
}
