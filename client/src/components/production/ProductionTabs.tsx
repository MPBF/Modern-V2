import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useProductionSSE } from "../../hooks/use-production-sse";
import { useAuth } from "../../hooks/use-auth";
import type { Section } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Play, Package, Scissors, RefreshCw } from "lucide-react";
import ProductionOrdersTable from "./ProductionOrdersTable";
import RollsTable from "./RollsTable";
import ProductionQueue from "./ProductionQueue";
import GroupedPrintingQueue from "./GroupedPrintingQueue";
import GroupedCuttingQueue from "./GroupedCuttingQueue";
import HierarchicalOrdersView from "./HierarchicalOrdersView";
import ProductionStageStats from "./ProductionStageStats";
import PrintingOperatorDashboard from "../../pages/PrintingOperatorDashboard";
import CuttingOperatorDashboard from "../../pages/CuttingOperatorDashboard";

interface ProductionTabsProps {
  onCreateRoll: (productionOrderId?: number) => void;
}

const stages = [
  {
    id: "film",
    key: "film",
    icon: Package,
  },
  {
    id: "printing",
    key: "printing",
    icon: Play,
  },
  {
    id: "cutting",
    key: "cutting",
    icon: Scissors,
  },
];

export default function ProductionTabs({ onCreateRoll }: ProductionTabsProps) {
  const { t } = useTranslation();
  const [activeStage, setActiveStage] = useState<string>("film");

  // Get current user information from auth context
  const { user: currentUser } = useAuth();

  // Use SSE for real-time production updates instead of polling
  const { refreshProductionData } = useProductionSSE();

  // Get sections to map section IDs to names
  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter stages based on user's role and section
  const visibleStages = useMemo(() => {
    if (!currentUser) return stages;

    const userRole = currentUser.role_id;
    const userSectionId = currentUser.section_id;

    // Managers and Production Managers can see all tabs
    if (userRole === 1 || userRole === 2) {
      // Manager, Production Manager
      return stages;
    }

    // Get section information to match with production stages
    const userSection = sections.find(
      (section) => Number(section.id) === userSectionId || section.id === String(userSectionId),
    );
    const sectionName = userSection?.name?.toLowerCase();

    // Map sections to stages
    if (sectionName?.includes("film") || sectionName?.includes("فيلم")) {
      return stages.filter((stage) => stage.key === "film");
    }

    if (sectionName?.includes("print") || sectionName?.includes("طباعة")) {
      return stages.filter((stage) => stage.key === "printing");
    }

    if (sectionName?.includes("cut") || sectionName?.includes("تقطيع")) {
      return stages.filter((stage) => stage.key === "cutting");
    }

    // Default: show all stages if no specific section match
    return stages;
  }, [currentUser, sections]);

  // Fetch production queues - Reduced polling for better performance
  const { data: filmQueue = [] } = useQuery<any[]>({
    queryKey: ["/api/production/film-queue"],
    refetchInterval: false, // Disabled polling - rely on manual refetch or SSE
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce server load
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const { data: printingQueue = [] } = useQuery<any[]>({
    queryKey: ["/api/production/printing-queue"],
    refetchInterval: false, // Disabled polling - rely on manual refetch or SSE
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce server load
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const { data: cuttingQueue = [] } = useQuery<any[]>({
    queryKey: ["/api/production/cutting-queue"],
    refetchInterval: false, // Disabled polling - rely on manual refetch or SSE
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce server load
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const { data: groupedCuttingQueue = [] } = useQuery<any[]>({
    queryKey: ["/api/production/grouped-cutting-queue"],
    refetchInterval: false, // Disabled polling - rely on manual refetch or SSE
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce server load
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  const { data: hierarchicalOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/production/hierarchical-orders"],
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Set default active stage based on visible stages
  const defaultStage = visibleStages.length > 0 ? visibleStages[0].id : "film";

  // Update active stage if it's not visible anymore
  if (!visibleStages.some((stage) => stage.id === activeStage)) {
    setActiveStage(defaultStage);
  }

  const getStageName = (key: string) => {
    return t(`production.stageNames.${key}`);
  };

  return (
    <Card className="border-2 shadow-md">
      <Tabs value={activeStage} onValueChange={setActiveStage}>
        <CardHeader className="p-3 md:p-4 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl md:text-2xl">
              {t("production.title")}
            </CardTitle>
            <Button
              variant="outline"
              size="default"
              onClick={refreshProductionData}
              className="flex items-center gap-2 border-2"
              data-testid="button-refresh-production"
            >
              <RefreshCw className="h-5 w-5" />
              <span className="hidden sm:inline">{t("common.refresh")}</span>
            </Button>
          </div>
          <TabsList
            className={`grid w-full mt-3 ${
              visibleStages.length === 1
                ? "grid-cols-1"
                : visibleStages.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
            } bg-muted p-1`}
          >
            {visibleStages.map((stage) => {
              const Icon = stage.icon;
              let queueCount = 0;

              if (stage.key === "film") queueCount = filmQueue.length;
              else if (stage.key === "printing")
                queueCount = printingQueue.length;
              else if (stage.key === "cutting")
                queueCount = cuttingQueue.length;

              const stageName = getStageName(stage.key);

              return (
                <TabsTrigger
                  key={stage.id}
                  value={stage.id}
                  className="py-3 md:py-4 text-base md:text-lg font-semibold flex items-center justify-center gap-2"
                  data-testid={`tab-${stage.key}`}
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="hidden sm:inline">{stageName}</span>
                  <span className="sm:hidden">{stageName.split(' ')[1] || stageName}</span>
                  {queueCount > 0 && (
                    <Badge variant="secondary" className="text-xs md:text-sm">
                      {queueCount}
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </CardHeader>

        {/* Film Stage - Hierarchical Orders View */}
        {visibleStages.some((stage) => stage.key === "film") && (
          <TabsContent value="film" className="mt-0">
            <CardContent className="p-2 md:p-4">
              <ProductionStageStats stage="film" data={hierarchicalOrders} />
              <HierarchicalOrdersView
                stage="film"
                onCreateRoll={onCreateRoll}
              />
            </CardContent>
          </TabsContent>
        )}

        {/* Printing Stage - Rolls Ready for Printing */}
        {visibleStages.some((stage) => stage.key === "printing") && (
          <TabsContent value="printing" className="mt-0">
            {/* Check if user is specifically in printing section */}
            {(() => {
              const userSection = sections.find(
                (section) => section.id === String(currentUser?.section_id)
              );
              const isPrintingOperator = 
                userSection?.name?.toLowerCase().includes("print") || 
                userSection?.name?.toLowerCase().includes("طباعة");
              
              // Show dedicated dashboard for printing operators
              if (isPrintingOperator && currentUser?.role_id !== 1 && currentUser?.role_id !== 2) {
                return <PrintingOperatorDashboard />;
              }
              
              // Show standard view for managers
              return (
                <CardContent className="p-2 md:p-4">
                  <ProductionStageStats stage="printing" data={printingQueue} />
                  <GroupedPrintingQueue items={printingQueue} />
                </CardContent>
              );
            })()}
          </TabsContent>
        )}

        {/* Cutting Stage - Printed Rolls Ready for Cutting */}
        {visibleStages.some((stage) => stage.key === "cutting") && (
          <TabsContent value="cutting" className="mt-0">
            {/* Check if user is specifically in cutting section */}
            {(() => {
              const userSection = sections.find(
                (section) => section.id === String(currentUser?.section_id)
              );
              const isCuttingOperator = 
                userSection?.name?.toLowerCase().includes("cut") || 
                userSection?.name?.toLowerCase().includes("تقطيع");
              
              // Show dedicated dashboard for cutting operators
              if (isCuttingOperator && currentUser?.role_id !== 1 && currentUser?.role_id !== 2) {
                return <CuttingOperatorDashboard />;
              }
              
              // Show standard view for managers
              return (
                <CardContent className="p-2 md:p-4">
                  <ProductionStageStats stage="cutting" data={groupedCuttingQueue} />
                  <GroupedCuttingQueue items={groupedCuttingQueue} />
                </CardContent>
              );
            })()}
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
