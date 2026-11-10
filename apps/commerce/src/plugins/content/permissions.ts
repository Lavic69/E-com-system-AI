import { PermissionDefinition } from '@vendure/core';

export const readContent = new PermissionDefinition({ name: 'ReadContent', description: 'Consulter les pages, leurs versions et leur aperçu local.' });
export const editContent = new PermissionDefinition({ name: 'EditContent', description: 'Créer des versions de pages et réserver leur édition.' });
export const selectContent = new PermissionDefinition({ name: 'SelectContent', description: 'Sélectionner une version validée pour une future publication.' });
