import {
  DrugMaster,
  StockBatch,
  DemandForecast,
  PurchaseOrder,
  DrugAlert,
} from '../../types/pharmaassist';
import { NearExpiryService } from './nearExpiryService';

export class InventoryAlertService {
  /**
   * Generates actionable, drug-specific inventory alerts (Section 9).
   */
  public static generateAlerts(
    drugs: DrugMaster[],
    batches: StockBatch[],
    forecasts: DemandForecast[] = [],
    activePurchaseOrders: PurchaseOrder[] = [],
    currentDate: Date = new Date()
  ): DrugAlert[] {
    const alerts: DrugAlert[] = [];

    // Map on-order quantity per drug
    const onOrderMap: Record<string, number> = {};
    for (const po of activePurchaseOrders) {
      if (po.status === 'sent' || po.status === 'confirmed' || po.status === 'drafted') {
        for (const item of po.items || []) {
          onOrderMap[item.drugId] = (onOrderMap[item.drugId] || 0) + item.orderedQuantity;
        }
      }
    }

    // 1. Drug-Specific Low Stock & Stockout Risk Alerts
    for (const drug of drugs) {
      if (!drug.active) continue;

      const drugBatches = batches.filter((b) => b.drugId === drug.id);
      const totalStock = drugBatches.reduce((acc, b) => acc + b.quantityOnHand, 0);
      const threshold = 15;
      const onOrder = onOrderMap[drug.id] || 0;

      const forecast = forecasts.find((f) => f.drugId === drug.id);
      const forecastQty = forecast ? forecast.forecastUnits : 10;
      const dailyRate = forecastQty / 7;

      if (totalStock <= threshold) {
        const daysToStockout = dailyRate > 0 ? Math.max(0, Math.floor(totalStock / dailyRate)) : 0;
        const isCritical = totalStock === 0 || daysToStockout <= 2;

        alerts.push({
          type: totalStock === 0 ? 'stockout_risk' : 'low_stock',
          severity: isCritical ? 'critical' : 'warning',
          drugId: drug.id,
          drugName: `${drug.brandName} (${drug.strength})`,
          metric: `${totalStock} units left (Min: ${threshold})`,
          details: `Stockout projected in ${daysToStockout} day(s). ${onOrder > 0 ? `${onOrder} units on order.` : 'No pending order!'}`,
          recommendedAction: onOrder > 0 ? 'Track PO Delivery' : 'Issue Purchase Order',
          targetTab: 'procurement',
        });
      }
    }

    // 2. Drug-Specific Near Expiry & Wastage Alerts
    for (const batch of batches) {
      if (batch.quantityOnHand <= 0) continue;

      const drug = drugs.find((d) => d.id === batch.drugId);
      if (!drug) continue;

      const isExpired = NearExpiryService.isExpired(batch, currentDate);
      const isNearExpiry = NearExpiryService.isNearExpiry(batch, 90, currentDate);
      const daysLeft = NearExpiryService.getDaysToExpiry(batch, currentDate);

      if (isExpired) {
        const wastageValue = batch.quantityOnHand * drug.listPrice;
        alerts.push({
          type: 'near_expiry',
          severity: 'critical',
          drugId: drug.id,
          drugName: `${drug.brandName} (${drug.strength})`,
          batchNumber: batch.batchNumber,
          metric: `EXPIRED (${batch.quantityOnHand} units)`,
          details: `Batch ${batch.batchNumber} expired on ${batch.expiryDate}. Wastage risk: ₹${wastageValue.toFixed(2)}.`,
          recommendedAction: 'Apply Expiry Write-Off',
          targetTab: 'inventory',
        });
      } else if (isNearExpiry) {
        alerts.push({
          type: 'near_expiry',
          severity: daysLeft <= 30 ? 'critical' : 'warning',
          drugId: drug.id,
          drugName: `${drug.brandName} (${drug.strength})`,
          batchNumber: batch.batchNumber,
          metric: `${daysLeft} days to expiry`,
          details: `Batch ${batch.batchNumber} (${batch.quantityOnHand} units) expires on ${batch.expiryDate}.`,
          recommendedAction: 'Prioritize Dispensing (FEFO)',
          targetTab: 'counter',
        });
      }
    }

    // Sort critical alerts first
    alerts.sort((a, _b) => (a.severity === 'critical' ? -1 : 1));

    return alerts;
  }
}
