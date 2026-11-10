import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, ID, PluginCommonModule, RequestContext, VendurePlugin } from '@vendure/core';
import gql from 'graphql-tag';
import { ContentLeaseEvent, ContentPage, ContentRevision } from './content.entity';
import { ContentService, WriteTarget } from './content.service';
import { readContent, editContent, selectContent } from './permissions';
import { CONTENT_PROTECTION, ContentProtection, noExperimentsYet } from './protection';

@Resolver()
export class ContentResolver {
  constructor(private service: ContentService) {}
  @Query() @Allow(readContent.Permission)
  contentPages(@Ctx() ctx: RequestContext, @Args() args: { skip?: number; take?: number }) { return this.service.list(ctx, args.skip, args.take); }
  @Query() @Allow(readContent.Permission)
  contentPage(@Ctx() ctx: RequestContext, @Args('id') id: ID) { return this.service.detail(ctx, id); }
  @Query() @Allow(readContent.Permission)
  contentPreview(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID; version: number }) { return this.service.preview(ctx, args.pageId, args.version); }
  @Mutation() @Allow(editContent.Permission)
  createContentPage(@Ctx() ctx: RequestContext, @Args('input') input: { slug: string; languageCode: string; document: unknown }) { return this.service.create(ctx, input); }
  @Mutation() @Allow(editContent.Permission)
  acquireContentLease(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID; expectedRevision: number }) { return this.service.acquire(ctx, args.pageId, args.expectedRevision); }
  @Mutation() @Allow(editContent.Permission)
  renewContentLease(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID; fencingToken: number }) { return this.service.renew(ctx, args.pageId, args.fencingToken); }
  @Mutation() @Allow(editContent.Permission)
  releaseContentLease(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID; fencingToken: number }) { return this.service.release(ctx, args.pageId, args.fencingToken); }
  @Mutation() @Allow(editContent.Permission)
  saveContentVersion(@Ctx() ctx: RequestContext, @Args('input') input: WriteTarget & { document: unknown; validate: boolean }) { return this.service.save(ctx, input); }
  @Mutation() @Allow(selectContent.Permission)
  selectContentVersion(@Ctx() ctx: RequestContext, @Args('input') input: WriteTarget & { version: number }) { return this.service.select(ctx, input); }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [ContentPage, ContentRevision, ContentLeaseEvent],
  providers: [ContentService, { provide: CONTENT_PROTECTION, useFactory: () => ContentPlugin.protection }],
  exports: [ContentService],
  configuration: config => {
    config.authOptions.customPermissions.push(readContent, editContent, selectContent);
    return config;
  },
  adminApiExtensions: {
    schema: gql`
      type ContentPage implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        channelId: ID!
        languageCode: String!
        slug: String!
        title: String!
        revision: Int!
        headVersion: Int!
        selectedVersion: Int
        fencingToken: Int!
        leaseHolder: String
        acquiredAt: DateTime
        expiresAt: DateTime
      }
      type ContentPageDetail {
        id: ID!
        channelId: ID!
        languageCode: String!
        slug: String!
        title: String!
        revision: Int!
        headVersion: Int!
        selectedVersion: Int
        fencingToken: Int!
        leaseHolder: String
        acquiredAt: DateTime
        expiresAt: DateTime
        versions: [ContentRevision!]!
      }
      type ContentRevision {
        version: Int!
        parentVersion: Int
        state: String!
        document: JSON!
        contentDigest: String!
        themeVersion: String!
        createdAt: DateTime!
        validatedAt: DateTime
        evidenceRefs: [String!]!
        authorId: String!
      }
      type ContentPageList { items: [ContentPage!]! totalItems: Int! }
      type ContentPreview { pageId: ID! version: Int! title: String! blocks: JSON! localOnly: Boolean! assets: [Asset!]! }
      input CreateContentPageInput { slug: String! languageCode: String! document: JSON! }
      input SaveContentVersionInput { pageId: ID! expectedRevision: Int! fencingToken: Int! document: JSON! validate: Boolean! }
      input SelectContentVersionInput { pageId: ID! expectedRevision: Int! fencingToken: Int! version: Int! }
      extend type Query {
        contentPages(skip: Int, take: Int): ContentPageList!
        contentPage(id: ID!): ContentPageDetail!
        contentPreview(pageId: ID!, version: Int!): ContentPreview!
      }
      extend type Mutation {
        createContentPage(input: CreateContentPageInput!): ContentPage!
        acquireContentLease(pageId: ID!, expectedRevision: Int!): ContentPage!
        renewContentLease(pageId: ID!, fencingToken: Int!): ContentPage!
        releaseContentLease(pageId: ID!, fencingToken: Int!): ContentPage!
        saveContentVersion(input: SaveContentVersionInput!): ContentPage!
        selectContentVersion(input: SelectContentVersionInput!): ContentPage!
      }
    `,
    resolvers: [ContentResolver],
  },
  dashboard: '../../../../dashboard/src/extensions/content/index.tsx',
  compatibility: '3.8.0',
})
export class ContentPlugin {
  static protection: ContentProtection = noExperimentsYet;
  static init(options: { protection: ContentProtection }) { this.protection = options.protection; return ContentPlugin; }
}
