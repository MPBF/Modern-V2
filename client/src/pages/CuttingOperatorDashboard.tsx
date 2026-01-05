import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import PageLayout from "../components/layout/PageLayout";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { formatNumberAr } from "../../../shared/number-utils";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { 
  Package, 
  Scissors,
  CheckCircle2,
  Loader2,
  Info,
  Weight
} from "lucide-react";

interface RollDetails {
  roll_id: number;
  roll_number: string;
  roll_seq: number;
  weight_kg: string | number;
  waste_kg: string | number;
  stage: string;
  roll_created_at: string;
  printed_at: string | null;
  cut_completed_at: string | null;
}

interface ProductionOrderWithRolls {
  production_order_id: number;
  production_order_number: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  rolls: RollDetails[];
  total_rolls: number;
  total_weight: number;
  cutting_length_cm?: number;
  punching?: string;
}

interface CuttingOperatorDashboardProps {
  hideLayout?: boolean;
}

export default function CuttingOperatorDashboard({ hideLayout = false }: CuttingOperatorDashboardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [processingRollIds, setProcessingRollIds] = useState<Set<number>>(new Set());
  const [selectedRoll, setSelectedRoll] = useState<RollDetails | null>(null);
  const [netWeight, setNetWeight] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: productionOrders = [], isLoading } = useQuery<ProductionOrderWithRolls[]>({
    queryKey: ["/api/rolls/active-for-cutting"],
    refetchInterval: 30000,
  });

  const completeCuttingMutation = useMutation({
    mutationFn: async ({ rollId, netWeight }: { rollId: number; netWeight: number }) => {
      return await apiRequest(`/api/rolls/${rollId}/complete-cutting`, {
        method: "POST",
        body: JSON.stringify({ net_weight: netWeight }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rolls/active-for-cutting"] });
      setIsDialogOpen(false);
      setSelectedRoll(null);
      setNetWeight("");
      toast({ 
        title: t('operators.common.success'), 
        description: t('operators.cutting.cuttingCompleted'), 
        variant: "default" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: t('operators.common.error'), 
        description: error.message || t('operators.cutting.cuttingFailed'), 
        variant: "destructive" 
      });
    },
  });

  const handleOpenCuttingDialog = (roll: RollDetails) => {
    setSelectedRoll(roll);
    setNetWeight(roll.weight_kg.toString());
    setIsDialogOpen(true);
  };

  const handleCompleteCutting = () => {
    if (!selectedRoll) return;
    
    const netWeightNum = parseFloat(netWeight);
    const grossWeight = parseFloat(selectedRoll.weight_kg.toString());
    
    if (isNaN(netWeightNum) || netWeightNum <= 0) {
      toast({ 
        title: t('operators.common.error'), 
        description: t('operators.cutting.invalidNetWeight'), 
        variant: "destructive" 
      });
      return;
    }
    
    if (netWeightNum > grossWeight) {
      toast({ 
        title: t('operators.common.error'), 
        description: t('operators.cutting.netWeightTooHigh'), 
        variant: "destructive" 
      });
      return;
    }
    
    completeCuttingMutation.mutate({ 
      rollId: selectedRoll.roll_id, 
      netWeight: netWeightNum 
    });
  };

  const stats = {
    totalOrders: productionOrders.length,
    totalRolls: productionOrders.reduce((sum, order) => sum + order.total_rolls, 0),
    totalWeight: productionOrders.reduce((sum, order) => sum + order.total_weight, 0),
  };

  if (isLoading) {
    const loadingContent = (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 text-lg">{t('operators.cutting.loadingRolls')}</p>
        </div>
      </div>
    );

    if (hideLayout) {
      return loadingContent;
    }

    return (
      <PageLayout title={t('operators.cutting.title')} description={t('operators.cutting.description')}>
        {loadingContent}
      </PageLayout>
    );
  }

  const mainContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card data-testid="card-active-orders">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('operators.common.activeOrders')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-active-orders">{stats.totalOrders}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('operators.common.productionOrder')}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-rolls">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('operators.common.totalRolls')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-rolls">{stats.totalRolls}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('operators.common.roll')}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-weight">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('operators.common.totalWeight')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-weight">{formatNumberAr(stats.totalWeight)}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('operators.common.kilogram')}</p>
              </CardContent>
            </Card>
          </div>

          {productionOrders.length === 0 ? (
            <Card className="p-8" data-testid="card-no-rolls">
              <div className="text-center">
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('operators.cutting.noRolls')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400" data-testid="text-no-rolls">
                  {t('operators.cutting.noRollsReady')}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {productionOrders.map((order) => {
                const completedRolls = order.rolls.filter(r => r.cut_completed_at).length;
                const progress = order.total_rolls > 0 ? (completedRolls / order.total_rolls) * 100 : 0;

                return (
                  <Card 
                    key={order.production_order_id} 
                    className="transition-all hover:shadow-lg"
                    data-testid={`card-production-order-${order.production_order_id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg" data-testid={`text-order-number-${order.production_order_id}`}>
                            {order.production_order_number}
                          </CardTitle>
                          <CardDescription data-testid={`text-order-ref-${order.production_order_id}`}>
                            {t('operators.common.order')}: {order.order_number}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Scissors className="h-3 w-3 ml-1" />
                          {order.total_rolls} {t('operators.common.roll')}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t('operators.common.customer')}</p>
                          <p className="font-medium" data-testid={`text-customer-${order.production_order_id}`}>{order.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t('operators.common.product')}</p>
                          <p className="font-medium" data-testid={`text-product-${order.production_order_id}`}>{order.product_name}</p>
                        </div>
                      </div>

                      {(order.cutting_length_cm || order.punching) && (
                        <div className="grid grid-cols-2 gap-4 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          {order.cutting_length_cm && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">{t('operators.cutting.length')}</p>
                              <p className="font-medium" data-testid={`text-cutting-length-${order.production_order_id}`}>{order.cutting_length_cm} cm</p>
                            </div>
                          )}
                          {order.punching && (
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">{t('operators.cutting.punchingType')}</p>
                              <p className="font-medium" data-testid={`text-punching-${order.production_order_id}`}>{order.punching}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('operators.common.progress')}</span>
                          <span className="font-medium" data-testid={`text-progress-${order.production_order_id}`}>
                            {completedRolls} / {order.total_rolls} {t('operators.common.roll')}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" data-testid={`progress-bar-${order.production_order_id}`} />
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{t('operators.common.totalWeight')}:</span>
                        <span className="font-medium">{formatNumberAr(order.total_weight)} {t('operators.common.kg')}</span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('operators.common.availableRolls')}:</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {order.rolls.map((roll) => (
                            <div 
                              key={roll.roll_id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                              data-testid={`roll-item-${roll.roll_id}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm" data-testid={`text-roll-number-${roll.roll_id}`}>
                                    {roll.roll_number}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {t('operators.common.weight')}: {formatNumberAr(Number(roll.weight_kg))} {t('operators.common.kg')}
                                </div>
                              </div>
                              
                              <Button
                                onClick={() => handleOpenCuttingDialog(roll)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`button-cut-${roll.roll_id}`}
                              >
                                <Scissors className="h-4 w-4 ml-1" />
                                <span className="hidden sm:inline">{t('operators.cutting.cut')}</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
    </div>
  );

  const dialogContent = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-cutting">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5 text-green-600" />
            {t('operators.cutting.enterNetWeight')}
          </DialogTitle>
          <DialogDescription>
            {t('operators.cutting.enterNetWeightDesc')}
          </DialogDescription>
        </DialogHeader>
        
        {selectedRoll && (
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">{t('operators.cutting.rollNumber')}</p>
                  <p className="font-medium" data-testid="text-selected-roll-number">{selectedRoll.roll_number}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">{t('operators.cutting.grossWeight')}</p>
                  <p className="font-medium" data-testid="text-selected-roll-gross-weight">
                    {formatNumberAr(Number(selectedRoll.weight_kg))} {t('operators.common.kg')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="netWeight">{t('operators.cutting.netWeightKg')}</Label>
              <Input
                id="netWeight"
                type="number"
                step="0.01"
                min="0"
                max={selectedRoll.weight_kg.toString()}
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value)}
                placeholder={t('operators.cutting.enterNetWeightPlaceholder')}
                className="text-right"
                data-testid="input-net-weight"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="text-expected-waste">
                {t('operators.cutting.expectedWaste')}: {formatNumberAr(
                  Math.max(0, Number(selectedRoll.weight_kg) - Number(netWeight || 0))
                )} {t('operators.common.kg')}
              </p>
            </div>
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(false)}
            disabled={completeCuttingMutation.isPending}
            data-testid="button-cancel-cutting"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCompleteCutting}
            disabled={completeCuttingMutation.isPending || !netWeight}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-confirm-cutting"
          >
            {completeCuttingMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                {t('operators.cutting.processing')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 ml-2" />
                {t('operators.cutting.confirmCut')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (hideLayout) {
    return (
      <>
        {mainContent}
        {dialogContent}
      </>
    );
  }

  return (
    <PageLayout title={t('operators.cutting.title')} description={t('operators.cutting.description')}>
      {mainContent}
      {dialogContent}
    </PageLayout>
  );
}
