require('reflect-metadata');

const { Query, Resolver } = require('@nestjs/graphql');
const { Allow, PermissionDefinition, PluginCommonModule, VendurePlugin } = require('@vendure/core');
const gql = require('graphql-tag');

const readProbe = new PermissionDefinition({
  name: 'ReadPlatformProbe',
  description: 'Read the local validation probe',
});

class ProbeResolver {
  platformProbe() {
    return 'extension-authentifiee';
  }
}

// CJS keeps the validation independent of a TypeScript compilation pipeline.
Resolver()(ProbeResolver);
const descriptor = Object.getOwnPropertyDescriptor(ProbeResolver.prototype, 'platformProbe');
Query(() => String)(ProbeResolver.prototype, 'platformProbe', descriptor);
Allow(readProbe.Permission)(ProbeResolver.prototype, 'platformProbe', descriptor);

class ProbePlugin {}
VendurePlugin({
  imports: [PluginCommonModule],
  configuration(config) {
    if (!config.authOptions.customPermissions.some(permission => permission.name === readProbe.name)) {
      config.authOptions.customPermissions.push(readProbe);
    }
    return config;
  },
  adminApiExtensions: {
    schema: gql`extend type Query { platformProbe: String! }`,
    resolvers: [ProbeResolver],
  },
  compatibility: '^3.8.0',
})(ProbePlugin);

module.exports = { ProbePlugin, readProbe };
