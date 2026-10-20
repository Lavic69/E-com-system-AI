import { Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, PermissionDefinition, PluginCommonModule, RequestContext, VendurePlugin } from '@vendure/core';
import gql from 'graphql-tag';
import { readSession } from '../../runtime';

export const readFoundation = new PermissionDefinition({
  name: 'ReadPlatformFoundation',
  description: 'Consulter la page de vérification du socle local.',
});

@Resolver()
export class FoundationResolver {
  @Query()
  @Allow(readFoundation.Permission)
  platformFoundation(@Ctx() ctx: RequestContext) {
    return {
      sessionId: readSession().id,
      channelCode: ctx.channel.code,
      message: 'Connexion autorisée au socle',
    };
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: config => {
    config.authOptions.customPermissions.push(readFoundation);
    return config;
  },
  adminApiExtensions: {
    schema: gql`
      type PlatformFoundation {
        sessionId: String!
        channelCode: String!
        message: String!
      }
      extend type Query { platformFoundation: PlatformFoundation! }
    `,
    resolvers: [FoundationResolver],
  },
  dashboard: '../../../../dashboard/src/extensions/foundation.tsx',
  compatibility: '3.8.0',
})
export class FoundationPlugin {}
