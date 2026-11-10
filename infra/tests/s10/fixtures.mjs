import { randomBytes } from 'node:crypto';
import { apiClient, createMember } from './runtime.mjs';

export async function seed(session) {
  const admin = apiClient(session); await admin.login();
  await admin.query('mutation{updateGlobalSettings(input:{availableLanguages:[en,fr]}){... on GlobalSettings{id} ... on ErrorResult{errorCode}}}');
  const { createZone: zone } = await admin.query('mutation{createZone(input:{name:"S10 - zone de démonstration"}){id}}');
  const { activeChannel } = await admin.query('query{activeChannel{id}}');
  await admin.query('mutation($input:UpdateChannelInput!){updateChannel(input:$input){... on Channel{id}}}', {
    input: { id: activeChannel.id, defaultTaxZoneId: zone.id, defaultShippingZoneId: zone.id },
  });
  const { createTaxCategory: tax } = await admin.query('mutation{createTaxCategory(input:{name:"S10 - catégorie de test",isDefault:true}){id}}');
  const channels = {};
  for (const [key, code, language, currency] of [['be', 'Belgique', 'fr', 'EUR'], ['us', 'États-Unis', 'en', 'USD']]) {
    const input = { code, token: `s10-${key}-${randomBytes(8).toString('hex')}`, defaultLanguageCode: language,
      availableLanguageCodes: [language], defaultCurrencyCode: currency, availableCurrencyCodes: [currency],
      pricesIncludeTax: false, defaultTaxZoneId: zone.id, defaultShippingZoneId: zone.id, trackInventory: true };
    const { createChannel: channel } = await admin.query(`mutation($input:CreateChannelInput!){createChannel(input:$input){... on Channel{id code token} ... on ErrorResult{errorCode message}}}`, { input });
    if (!channel.id) throw new Error(`Canal non créé : ${channel.errorCode}`);
    channels[key] = channel;
  }
  const be = apiClient(session, { channel: channels.be.token }); await be.login();
  const us = apiClient(session, { channel: channels.us.token }); await us.login();
  const locations = [];
  for (const name of ['Entrepôt Belgique', 'Magasin Belgique']) {
    const { createStockLocation } = await be.query('mutation($input:CreateStockLocationInput!){createStockLocation(input:$input){id name}}', { input: { name } });
    locations.push(createStockLocation);
  }
  const { createStockLocation: usLocation } = await us.query('mutation{createStockLocation(input:{name:"Entrepôt États-Unis"}){id name}}');
  const password = randomBytes(24).toString('hex');
  const reader = await createMember(admin, [channels.be.id], 's10-reader', password, ['ReadCatalog', 'ReadCustomer', 'ReadCustomerGroup', 'ReadStockLocation']);
  const editor = await createMember(admin, [channels.be.id], 's10-editor', password, ['ReadCatalog', 'CreateCatalog', 'UpdateCatalog', 'ReadStockLocation', 'ReadCustomer', 'CreateCustomer', 'UpdateCustomer', 'ReadCustomerGroup', 'CreateCustomerGroup', 'UpdateCustomerGroup']);
  const creator = await createMember(admin, [channels.be.id], 's10-product-creator', password, ['ReadProduct', 'CreateProduct']);
  return { channels, locations, usLocation, tax, password, reader, editor, creator };
}
