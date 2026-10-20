import {
  api, Button, defineDashboardExtension, Page, PageBlock, PageLayout, PageTitle, usePermissions,
} from '@vendure/dashboard';
import { useQuery } from '@tanstack/react-query';

const permission = 'ReadPlatformFoundation';
type FoundationData = {
  platformFoundation: { sessionId: string; channelCode: string; message: string };
};

function FoundationPage() {
  const { hasPermissions } = usePermissions();
  const allowed = hasPermissions([permission]);
  const result = useQuery({
    queryKey: ['platform-foundation'],
    queryFn: () => api.query<FoundationData>(`query Foundation {
      platformFoundation { sessionId channelCode message }
    }`),
    enabled: allowed,
    retry: false,
  });

  return (
    <Page pageId="platform-foundation">
      <PageTitle>Vérification du socle</PageTitle>
      <PageLayout>
        <PageBlock column="main" blockId="foundation-status">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Environnement local de démonstration. Cette page vérifie le raccordement d’une extension à l’administration.
            </p>
            {!allowed ? (
              <p role="alert">Accès refusé. Votre rôle ne permet pas de consulter le socle.</p>
            ) : result.isPending ? (
              <p role="status">Vérification de la connexion…</p>
            ) : result.isError ? (
              <p role="alert">La vérification a échoué. Vérifiez que l’API est disponible et que votre accès est toujours autorisé.</p>
            ) : (
              <div className="space-y-3">
                <p role="status" className="font-medium">{result.data.platformFoundation.message}</p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div><dt className="text-muted-foreground">Session locale</dt><dd>{result.data.platformFoundation.sessionId}</dd></div>
                  <div><dt className="text-muted-foreground">Canal actif</dt><dd className="break-all">{result.data.platformFoundation.channelCode}</dd></div>
                </dl>
              </div>
            )}
            {allowed && (
              <Button variant="outline" disabled={result.isFetching} onClick={() => void result.refetch()}>
                {result.isFetching ? 'Vérification…' : 'Vérifier à nouveau'}
              </Button>
            )}
          </div>
        </PageBlock>
      </PageLayout>
    </Page>
  );
}

// Point d'entrée de l'extension S00 ; le registre serveur la découvre.
defineDashboardExtension({
  navSections: [{ id: 'platform-foundation', title: 'Environnement local', order: 100 }],
  routes: [{
    path: '/platform-foundation',
    component: () => <FoundationPage />,
    navMenuItem: {
      sectionId: 'platform-foundation',
      title: 'Vérification du socle',
      requiresPermission: [permission],
    },
  }],
});
