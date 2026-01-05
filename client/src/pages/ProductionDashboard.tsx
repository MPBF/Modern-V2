import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useAuth } from "../hooks/use-auth";
import { userHasPermission } from "../utils/roleUtils";
import PageLayout from "../components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Film, Printer, Scissors, AlertCircle } from "lucide-react";
import FilmOperatorDashboard from "./FilmOperatorDashboard";
import PrintingOperatorDashboard from "./PrintingOperatorDashboard";
import CuttingOperatorDashboard from "./CuttingOperatorDashboard";

export default function ProductionDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const canViewFilm = useMemo(() => 
    userHasPermission(user, 'view_film_dashboard'), 
    [user]
  );
  
  const canViewPrinting = useMemo(() => 
    userHasPermission(user, 'view_printing_dashboard'), 
    [user]
  );
  
  const canViewCutting = useMemo(() => 
    userHasPermission(user, 'view_cutting_dashboard'), 
    [user]
  );

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (canViewFilm) tabs.push('film');
    if (canViewPrinting) tabs.push('printing');
    if (canViewCutting) tabs.push('cutting');
    return tabs;
  }, [canViewFilm, canViewPrinting, canViewCutting]);

  const [activeTab, setActiveTab] = useState(availableTabs[0] || 'film');

  if (availableTabs.length === 0) {
    return (
      <PageLayout title={t('production.dashboard.title')}>
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-yellow-500" />
              <div>
                <CardTitle>{t('production.dashboard.noPermissions')}</CardTitle>
                <CardDescription>
                  {t('production.dashboard.noPermissionsDescription')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('production.dashboard.contactAdmin')}
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title={t('production.dashboard.title')}
      description={t('production.dashboard.description')}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-2 h-auto bg-transparent">
              {canViewFilm && (
                <TabsTrigger
                  value="film"
                  className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-md p-4 h-auto"
                  data-testid="tab-film-operator"
                >
                  <Film className="h-5 w-5" />
                  <div className="text-right">
                    <div className="font-semibold">{t('production.dashboard.filmOperator')}</div>
                    <div className="text-xs text-muted-foreground">{t('production.dashboard.createRolls')}</div>
                  </div>
                  {activeTab === 'film' && (
                    <Badge variant="default" className="mr-auto">{t('production.dashboard.active')}</Badge>
                  )}
                </TabsTrigger>
              )}

              {canViewPrinting && (
                <TabsTrigger
                  value="printing"
                  className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-md p-4 h-auto"
                  data-testid="tab-printing-operator"
                >
                  <Printer className="h-5 w-5" />
                  <div className="text-right">
                    <div className="font-semibold">{t('production.dashboard.printingOperator')}</div>
                    <div className="text-xs text-muted-foreground">{t('production.dashboard.printRolls')}</div>
                  </div>
                  {activeTab === 'printing' && (
                    <Badge variant="default" className="mr-auto">{t('production.dashboard.active')}</Badge>
                  )}
                </TabsTrigger>
              )}

              {canViewCutting && (
                <TabsTrigger
                  value="cutting"
                  className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-md p-4 h-auto"
                  data-testid="tab-cutting-operator"
                >
                  <Scissors className="h-5 w-5" />
                  <div className="text-right">
                    <div className="font-semibold">{t('production.dashboard.cuttingOperator')}</div>
                    <div className="text-xs text-muted-foreground">{t('production.dashboard.cutRolls')}</div>
                  </div>
                  {activeTab === 'cutting' && (
                    <Badge variant="default" className="mr-auto">{t('production.dashboard.active')}</Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            {canViewFilm && (
              <TabsContent value="film" className="mt-0">
                <FilmOperatorDashboard hideLayout={true} />
              </TabsContent>
            )}

            {canViewPrinting && (
              <TabsContent value="printing" className="mt-0">
                <PrintingOperatorDashboard hideLayout={true} />
              </TabsContent>
            )}

            {canViewCutting && (
              <TabsContent value="cutting" className="mt-0">
                <CuttingOperatorDashboard hideLayout={true} />
              </TabsContent>
            )}
          </Tabs>
    </PageLayout>
  );
}
