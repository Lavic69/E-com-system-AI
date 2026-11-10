import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, LanguageCode, Permission, PluginCommonModule, RequestContext, VendurePlugin } from '@vendure/core';
import gql from 'graphql-tag';
import { CatalogueImportReceipt } from './catalogue-import.entity';
import { CatalogueImportService } from './catalogue-import.service';

@Resolver()
export class CatalogueResolver {
  constructor(private imports: CatalogueImportService) {}
  @Query()
  @Allow(Permission.CreateCatalog, Permission.CreateProduct)
  catalogueImportContext(@Ctx() ctx: RequestContext) { return this.imports.context(ctx); }

  @Query()
  @Allow(Permission.CreateCatalog, Permission.CreateProduct)
  previewCatalogueImport(@Ctx() ctx: RequestContext, @Args() args: { csv: string; stockLocationId: ID }) {
    return this.imports.preview(ctx, args.csv, args.stockLocationId);
  }

  @Mutation()
  @Allow(Permission.CreateCatalog, Permission.CreateProduct)
  applyCatalogueImport(@Ctx() ctx: RequestContext, @Args() args: { csv: string; stockLocationId: ID; previewHash: string }) {
    return this.imports.apply(ctx, args.csv, args.stockLocationId, args.previewHash);
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [CatalogueImportReceipt],
  providers: [CatalogueImportService],
  configuration: config => {
    config.customFields.Customer.push(
      { name: 'preferredLanguage', type: 'string', nullable: true, public: false,
        label: [{ languageCode: LanguageCode.en, value: 'Preferred language' }, { languageCode: LanguageCode.fr, value: 'Langue préférée' }],
        options: [{ value: 'fr' }, { value: 'en' }] },
      { name: 'contactPreference', type: 'string', nullable: true, public: false,
        label: [{ languageCode: LanguageCode.en, value: 'Contact preference (not marketing consent)' }, { languageCode: LanguageCode.fr, value: 'Contact préféré (hors consentement marketing)' }],
        options: [{ value: 'email' }, { value: 'phone' }, { value: 'none' }] },
    );
    return config;
  },
  adminApiExtensions: {
    schema: gql`
      type CatalogueImportLocation { id: ID! name: String! }
      type CatalogueImportContext {
        channelId: ID! channelCode: String! currencyCode: String! languageCode: String! pricesIncludeTax: Boolean!
        stockLocations: [CatalogueImportLocation!]!
      }
      type CatalogueImportRow {
        line: Int! key: String! name: String! sku: String! status: String! message: String!
        productId: ID variantId: ID price: Int stock: Int
      }
      type CatalogueImportResult { previewHash: String! rows: [CatalogueImportRow!]! }
      extend type Query {
        catalogueImportContext: CatalogueImportContext!
        previewCatalogueImport(csv: String!, stockLocationId: ID!): CatalogueImportResult!
      }
      extend type Mutation {
        applyCatalogueImport(csv: String!, stockLocationId: ID!, previewHash: String!): CatalogueImportResult!
      }
    `,
    resolvers: [CatalogueResolver],
  },
  dashboard: '../../../../dashboard/src/extensions/catalogue/index.tsx',
  compatibility: '3.8.0',
})
export class CataloguePlugin {}
