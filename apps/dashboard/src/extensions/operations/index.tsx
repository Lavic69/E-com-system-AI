import {
  api,
  defineDashboardExtension,
  Page,
  PageBlock,
  PageLayout,
  PageTitle,
  useChannel,
  usePermissions,
} from '@vendure/dashboard';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { OperationsView, type Dossier } from './dossier';

function OperationsPage() {
  const { hasPermissions } = usePermissions();
  const { activeChannel } = useChannel();
  const allowed = hasPermissions(['ReadOperations']);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['operation-dossiers', activeChannel?.id],
    queryFn: () => api.query<{ operationDossiers: Dossier[] }>('query { operationDossiers }'),
    enabled: allowed,
    retry: false,
  });
  return (
    <Page pageId="operations">
      <PageTitle>Actions</PageTitle>
      <PageLayout>
        <PageBlock column="main" blockId="operation-dossiers">
          <OperationsView
            dossiers={query.data?.operationDossiers ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={query.isPending}
            error={query.isError}
            allowed={allowed}
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        </PageBlock>
      </PageLayout>
    </Page>
  );
}

defineDashboardExtension({
  navSections: [{ id: 'operations', title: 'Activité', order: 50 }],
  routes: [
    {
      path: '/operations',
      component: () => <OperationsPage />,
      navMenuItem: { sectionId: 'operations', title: 'Actions', requiresPermission: ['ReadOperations'] },
    },
  ],
});
