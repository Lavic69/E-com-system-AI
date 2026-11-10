import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, PermissionDefinition, PluginCommonModule, RequestContext, VendurePlugin } from '@vendure/core';
import gql from 'graphql-tag';
import { OperationsService } from './operations.service';
import { OPERATIONS_OPTIONS, type Intent, type OperationsOptions } from './types';
import type { Connection, Money } from './contracts';

export const operationPermissions = [
  'ReadOperations',
  'ProposeOperations',
  'ApplyOperations',
  'ApproveOperations',
  'ExecuteOperations',
  'ManageOperations',
].map((name) => new PermissionDefinition({ name, description: `S12 : ${name}` }));
const permission = (name: string) => operationPermissions.find((p) => p.Permission === name)!.Permission;

@Resolver()
export class OperationsResolver {
  constructor(private readonly operations: OperationsService) {}
  @Query()
  @Allow(permission('ReadOperations'))
  operationDossiers(@Ctx() ctx: RequestContext, @Args('id') id?: string) {
    return this.operations.dossier(ctx, id);
  }
  @Query()
  @Allow(permission('ReadOperations'))
  operationConnections(@Ctx() ctx: RequestContext) {
    return this.operations.connections(ctx);
  }
  @Query()
  @Allow(permission('ReadOperations'))
  operationBudget(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.operations.budget(ctx, id);
  }
  @Mutation()
  @Allow(permission('ProposeOperations'))
  proposeOperation(
    @Ctx() ctx: RequestContext,
    @Args('input') input: Intent,
    @Args('delegationId') delegationId?: string,
  ) {
    return this.operations.propose(ctx, input, delegationId);
  }
  @Mutation()
  @Allow(permission('ApproveOperations'))
  approveOperation(
    @Ctx() ctx: RequestContext,
    @Args('id') id: string,
    @Args('bindingDigest') binding: string,
    @Args('expiresAt') expires: string,
  ) {
    return this.operations.approve(ctx, id, binding, expires);
  }
  @Mutation()
  @Allow(permission('ExecuteOperations'))
  executeOperation(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.operations.executeFromApi(ctx, id);
  }
  @Mutation()
  @Allow(permission('ManageOperations'))
  configureOperationConnection(@Ctx() ctx: RequestContext, @Args('input') input: Connection) {
    return this.operations.configureConnection(ctx, input);
  }
  @Mutation()
  @Allow(permission('ManageOperations'))
  configureOperationBudget(@Ctx() ctx: RequestContext, @Args('id') id: string, @Args('ceiling') ceiling: Money) {
    return this.operations.configureBudget(ctx, id, ceiling);
  }
  @Mutation()
  @Allow(permission('ManageOperations'))
  grantOperationDelegation(
    @Ctx() ctx: RequestContext,
    @Args('userId') userId: string,
    @Args('agentId') agentId: string,
    @Args('capabilities') capabilities: string[],
    @Args('ceiling') ceiling: Money,
    @Args('expiresAt') expiresAt: string,
  ) {
    return this.operations.grantDelegation(ctx, userId, agentId, capabilities, ceiling, expiresAt);
  }
  @Mutation()
  @Allow(permission('ManageOperations'))
  revokeOperationDelegation(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    return this.operations.revokeDelegation(ctx, id);
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [OperationsService, { provide: OPERATIONS_OPTIONS, useFactory: () => OperationsPlugin.options }],
  exports: [OperationsService],
  configuration: (config) => {
    config.authOptions.customPermissions.push(...operationPermissions);
    return config;
  },
  adminApiExtensions: {
    schema: gql`
      extend type Query {
        operationDossiers(id: String): JSON!
        operationConnections: JSON!
        operationBudget(id: String!): JSON!
      }
      extend type Mutation {
        proposeOperation(input: JSON!, delegationId: String): JSON!
        approveOperation(id: String!, bindingDigest: String!, expiresAt: String!): JSON!
        executeOperation(id: String!): JSON!
        configureOperationConnection(input: JSON!): Boolean!
        configureOperationBudget(id: String!, ceiling: JSON!): JSON!
        grantOperationDelegation(
          userId: String!
          agentId: String!
          capabilities: [String!]!
          ceiling: JSON!
          expiresAt: String!
        ): String!
        revokeOperationDelegation(id: String!): Boolean!
      }
    `,
    resolvers: [OperationsResolver],
  },
  dashboard: '../../../../dashboard/src/extensions/operations/index.tsx',
  compatibility: '3.8.0',
})
export class OperationsPlugin {
  static options: OperationsOptions;
  static init(options: OperationsOptions) {
    if (!options.shopId || !options.policyVersion || options.adapters.length === 0)
      throw new Error('OPERATIONS_CONFIGURATION_REQUIRED');
    this.options = options;
    return OperationsPlugin;
  }
}
