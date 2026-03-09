import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useLocalizedName } from "../hooks/use-localized-name";
import PageLayout from "../components/layout/PageLayout";
import RollCreationModalEnhanced from "../components/modals/RollCreationModalEnhanced";
import FilmMaterialMixingTab from "../components/production/FilmMaterialMixingTab";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { formatNumberAr } from "../../../shared/number-utils";
import { printRollLabel } from "../components/production/RollLabelPrint";
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Plus,
  Flag,
  Loader2,
  Info,
  Printer,
  User,
  Beaker
} from "lucide-react";

interface ActiveProductionOrderDetails {
  id: number;
  production_order_number: string;
  order_id: number;
  customer_product_id: number;
  quantity_kg: string | number;
  final_quantity_kg: string | number;
  produced_quantity_kg?: string | number;
  status: string;
  created_at: string;
  order_number: string;
  customer_name: string;
  customer_name_ar?: string;
  customer_name_en?: string;
  product_name: string;
  product_name_ar?: string;
  product_name_en?: string;
  rolls_count: number;
  total_weight_produced: string | number;
  remaining_quantity: string | number;
  is_final_roll_created: boolean;
  film_completed?: boolean;
  production_start_time?: string;
  production_end_time?: string;
  production_time_minutes?: number;
  category_id?: string;
  category_name?: string;
  size_caption?: string;
  raw_material?: string;
  thickness?: string;
  master_batch_id?: string;
  master_batch_name?: string;
  overrun_percentage?: string | number;
}

interface Roll {
  id: number;
  roll_number: string;
  roll_seq: number;
  weight_kg: number | string;
  status: string;
  created_by_name?: string;
  created_at?: string;
  production_order_id: number;
  production_order_number?: string;
  machine_id?: string;
  film_machine_id?: string;
  film_machine_name?: string;
  qr_code_text?: string;
  qr_png_base64?: string;
}

interface FilmOperatorDashboardProps {
  hideLayout?: boolean;
}

export default function FilmOperatorDashboard({ hideLayout = false }: FilmOperatorDashboardProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const ln = useLocalizedName();
  const [selectedProductionOrder, setSelectedProductionOrder] = useState<ActiveProductionOrderDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinalRoll, setIsFinalRoll] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const { data: productionOrders = [], isLoading } = useQuery<ActiveProductionOrderDetails[]>({
    queryKey: ["/api/production-orders/active-for-operator"],
    refetchInterval: 30000,
  });

  const { data: allRolls = [] } = useQuery<Roll[]>({
    queryKey: ["/api/rolls"],
    refetchInterval: 30000,
  });

  const handleCreateRoll = (order: ActiveProductionOrderDetails, final: boolean = false) => {
    setSelectedProductionOrder(order);
    setIsFinalRoll(final);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProductionOrder(null);
    setIsFinalRoll(false);
  };

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handlePrintLabel = async (roll: Roll) => {
    try {
      const response = await fetch(`/api/rolls/${roll.id}/label`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const labelData = await response.json();
      
      if (!labelData || !labelData.roll) {
        throw new Error("Invalid label data received");
      }
      
      printRollLabel({
        roll: labelData.roll,
        productionOrder: labelData.productionOrder,
        order: labelData.order
      });
    } catch (error) {
      console.error("Error printing label:", error);
      alert(`${t('operators.common.printLabelError')}: ${error instanceof Error ? error.message : t('operators.common.unknownError')}`);
    }
  };

  const stats = {
    totalOrders: productionOrders.length,
    totalRequired: productionOrders.reduce((sum: number, order: ActiveProductionOrderDetails) => 
      sum + Number(order.final_quantity_kg || order.quantity_kg || 0), 0),
    totalProduced: productionOrders.reduce((sum: number, order: ActiveProductionOrderDetails) => 
      sum + Number(order.total_weight_produced || 0), 0),
    ordersNearCompletion: productionOrders.filter((order: ActiveProductionOrderDetails) => {
      const progress = (Number(order.total_weight_produced || 0) / Number(order.final_quantity_kg || 1)) * 100;
      return progress >= 80 && !order.is_final_roll_created;
    }).length,
  };

  if (isLoading) {
    const loadingContent = (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">{t('operators.film.loadingOrders')}</p>
        </div>
      </div>
    );

    if (hideLayout) {
      return loadingContent;
    }

    return (
      <PageLayout title={t('operators.film.title')} description={t('operators.film.description')}>
        {loadingContent}
      </PageLayout>
    );
  }

  const mainContent = (
    <div className="space-y-6">
          <Tabs defaultValue="production" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="production" className="flex items-center gap-2" data-testid="tab-production">
                <Package className="h-4 w-4" />
                {t('operators.film.productionOrdersTab')}
              </TabsTrigger>
              <TabsTrigger value="mixing" className="flex items-center gap-2" data-testid="tab-mixing">
                <Beaker className="h-4 w-4" />
                {t('operators.film.materialMixingTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="production" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card data-testid="card-active-orders">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('operators.common.activeOrders')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-active-orders">{stats.totalOrders}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('operators.common.productionOrder')}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-required">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('operators.common.requiredQuantity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-required">{formatNumberAr(stats.totalRequired)}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('operators.common.kilogram')}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-produced">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('operators.common.producedQuantity')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-produced">{formatNumberAr(stats.totalProduced)}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('operators.common.kilogram')}</p>
              </CardContent>
            </Card>

            <Card data-testid="card-near-completion">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{t('operators.common.nearCompletion')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="stat-near-completion">
                  {stats.ordersNearCompletion}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('operators.common.productionOrder')}</p>
              </CardContent>
            </Card>
          </div>

          {productionOrders.length === 0 ? (
            <Card className="p-8" data-testid="card-no-orders">
              <div className="text-center">
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('operators.film.noActiveOrders')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400" data-testid="text-no-orders">
                  {t('operators.film.noActiveOrdersDesc')}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {productionOrders.map((order: ActiveProductionOrderDetails) => {
                const progress = (Number(order.total_weight_produced || 0) / Number(order.final_quantity_kg || 1)) * 100;
                const isNearCompletion = progress >= 80;
                const isComplete = order.is_final_roll_created;

                return (
                  <Card 
                    key={order.id} 
                    className={`${isComplete ? 'opacity-60' : ''} transition-all hover:shadow-lg`}
                    data-testid={`card-production-order-${order.id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg" data-testid={`text-order-number-${order.id}`}>
                            {order.production_order_number}
                          </CardTitle>
                          <CardDescription data-testid={`text-order-ref-${order.id}`}>
                            {t('operators.common.order')}: {order.order_number}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {isComplete && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800" data-testid={`badge-complete-${order.id}`}>
                              <CheckCircle2 className="h-3 w-3 ml-1" />
                              {t('operators.common.completed')}
                            </Badge>
                          )}
                          {isNearCompletion && !isComplete && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800" data-testid={`badge-near-completion-${order.id}`}>
                              <AlertTriangle className="h-3 w-3 ml-1" />
                              {t('operators.common.nearCompletionBadge')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t('operators.common.customer')}</p>
                          <p className="font-bold text-gray-900 dark:text-white" data-testid={`text-customer-${order.id}`}>{ln(order.customer_name_ar, order.customer_name_en) || order.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">{t('operators.common.product')}</p>
                          <p className="font-medium" data-testid={`text-product-${order.id}`}>{ln(order.product_name_ar, order.product_name_en) || order.product_name}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        {order.category_name && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('operators.common.category')}</p>
                            <p className="font-medium" data-testid={`text-category-${order.id}`}>{order.category_name}</p>
                          </div>
                        )}
                        {order.size_caption && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('operators.common.size')}</p>
                            <p className="font-medium" data-testid={`text-size-${order.id}`}>{order.size_caption}</p>
                          </div>
                        )}
                        {order.raw_material && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('operators.common.rawMaterialType')}</p>
                            <p className="font-medium" data-testid={`text-raw-material-${order.id}`}>{order.raw_material}</p>
                          </div>
                        )}
                        {order.thickness && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{t('operators.common.thickness')}</p>
                            <p className="font-medium" data-testid={`text-thickness-${order.id}`}>{order.thickness}</p>
                          </div>
                        )}
                        {order.master_batch_id && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">{isArabic ? "لون الماستر باتش" : "Masterbatch Color"}</p>
                            <p className="font-medium" data-testid={`text-masterbatch-${order.id}`}>{order.master_batch_name || order.master_batch_id}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('operators.common.requiredQuantity')}</span>
                          <span className="font-medium" data-testid={`text-required-qty-${order.id}`}>
                            {formatNumberAr(Number(order.final_quantity_kg))} {t('operators.common.kg')}
                            {order.overrun_percentage && Number(order.overrun_percentage) > 0 && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 mr-1 ml-1">
                                ({isArabic ? "شامل" : "incl."} {formatNumberAr(Number(order.overrun_percentage))}%)
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('operators.common.producedQuantity')}</span>
                          <span className="font-medium" data-testid={`text-produced-qty-${order.id}`}>{formatNumberAr(Number(order.total_weight_produced))} {t('operators.common.kg')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('operators.common.remainingQuantity')}</span>
                          <span className="font-medium text-orange-600" data-testid={`text-remaining-qty-${order.id}`}>
                            {formatNumberAr(Number(order.remaining_quantity))} {t('operators.common.kg')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('operators.common.progress')}</span>
                          <span className="font-medium" data-testid={`text-progress-${order.id}`}>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" data-testid={`progress-bar-${order.id}`} />
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">{t('operators.common.rollsCount')}:</span>
                          <span className="font-medium" data-testid={`text-rolls-count-${order.id}`}>{order.rolls_count}</span>
                        </div>
                        {order.production_start_time && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">{t('operators.common.startedSince')}:</span>
                            <span className="font-medium">
                              {(() => {
                                const startTime = new Date(order.production_start_time).getTime();
                                const now = Date.now();
                                const diffMinutes = Math.floor((now - startTime) / (1000 * 60));
                                if (diffMinutes < 60) return `${diffMinutes} ${t('operators.common.minute')}`;
                                const hours = Math.floor(diffMinutes / 60);
                                const minutes = diffMinutes % 60;
                                return `${hours}h ${minutes}m`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>

                      {order.rolls_count > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => toggleOrderExpansion(order.id)}
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              data-testid={`button-toggle-rolls-${order.id}`}
                            >
                              {expandedOrders.has(order.id) ? '▼' : '◀'} {t('operators.common.viewRolls')} ({order.rolls_count})
                            </button>
                          </div>
                          
                          {expandedOrders.has(order.id) && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                              {allRolls
                                .filter(roll => roll.production_order_id === order.id)
                                .sort((a, b) => a.roll_seq - b.roll_seq)
                                .map((roll) => (
                                  <div
                                    key={roll.id}
                                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 hover:shadow-md transition-shadow"
                                    data-testid={`roll-card-${roll.id}`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="font-bold text-sm text-blue-900 dark:text-blue-100" data-testid={`roll-number-${roll.id}`}>
                                          {roll.roll_number}
                                        </div>
                                        <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                          {t('operators.common.rollSeq')}{roll.roll_seq}
                                        </div>
                                      </div>
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100"
                                      >
                                        {roll.status}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center gap-1 text-blue-800 dark:text-blue-200">
                                        <Package className="h-3 w-3" />
                                        <span className="font-medium">{formatNumberAr(Number(roll.weight_kg))} {t('operators.common.kg')}</span>
                                      </div>
                                      
                                      {roll.created_by_name && (
                                        <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                                          <User className="h-3 w-3" />
                                          <span>{roll.created_by_name}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <Button
                                      onClick={() => handlePrintLabel(roll)}
                                      size="sm"
                                      variant="outline"
                                      className="w-full mt-2 h-7 text-xs bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                      data-testid={`button-print-label-${roll.id}`}
                                    >
                                      <Printer className="h-3 w-3 ml-1" />
                                      {t('operators.common.printLabel')}
                                    </Button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {!isComplete && (
                          <>
                            <Button
                              onClick={() => handleCreateRoll(order, false)}
                              className="flex-1"
                              variant="default"
                              data-testid={`button-create-roll-${order.id}`}
                            >
                              <Plus className="h-4 w-4 ml-2" />
                              {t('operators.common.createNewRoll')}
                            </Button>
                            
                            {order.rolls_count > 0 && (
                              <Button
                                onClick={() => handleCreateRoll(order, true)}
                                variant="destructive"
                                data-testid={`button-final-roll-${order.id}`}
                              >
                                <Flag className="h-4 w-4 ml-2" />
                                {t('operators.common.finalRoll')}
                              </Button>
                            )}
                          </>
                        )}
                        
                        {isComplete && (
                          <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <div className="text-sm">
                                <p className="font-medium text-green-900 dark:text-green-100">
                                  {t('operators.film.filmStageCompleted')}
                                </p>
                                {order.production_time_minutes && (
                                  <p className="text-xs text-green-700 dark:text-green-300">
                                    {t('operators.film.totalProductionTime')}: {order.production_time_minutes} {t('operators.common.minute')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
            </TabsContent>

            <TabsContent value="mixing" className="space-y-6">
              <FilmMaterialMixingTab />
            </TabsContent>
          </Tabs>

      {selectedProductionOrder && (
        <RollCreationModalEnhanced
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          productionOrderId={selectedProductionOrder.id}
          productionOrderData={selectedProductionOrder}
          isFinalRoll={isFinalRoll}
        />
      )}
    </div>
  );

  if (hideLayout) {
    return mainContent;
  }

  return (
    <PageLayout title={t('operators.film.title')} description={t('operators.film.description')}>
      {mainContent}
    </PageLayout>
  );
}
