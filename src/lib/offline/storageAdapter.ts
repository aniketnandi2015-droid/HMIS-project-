import {
  DrugMaster,
  StockBatch,
  ContraindicationReference,
  Transaction,
  Supplier,
  PurchaseOrder,
  UnmetDemand,
  SyncQueueItem,
  CrossSellSuggestion,
} from '../types/pharmaassist';

export class LocalStorageAdapter {
  private static inMemoryStore: Record<string, string> = {};

  private static readonly DRUGS_KEY = 'pharmaassist_drugs';
  private static readonly BATCHES_KEY = 'pharmaassist_batches';
  private static readonly CONTRAINDICATIONS_KEY = 'pharmaassist_contraindications';
  private static readonly TRANSACTIONS_KEY = 'pharmaassist_transactions';
  private static readonly SUPPLIERS_KEY = 'pharmaassist_suppliers';
  private static readonly PURCHASE_ORDERS_KEY = 'pharmaassist_purchase_orders';
  private static readonly UNMET_DEMAND_KEY = 'pharmaassist_unmet_demand';
  private static readonly SYNC_QUEUE_KEY = 'pharmaassist_sync_queue';

  private static getItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      try {
        return (globalThis as any).localStorage.getItem(key);
      } catch {
        // Fallback to in-memory
      }
    }
    return this.inMemoryStore[key] || null;
  }

  private static setItem(key: string, val: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
      return;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      try {
        (globalThis as any).localStorage.setItem(key, val);
        return;
      } catch {
        // Fallback to in-memory
      }
    }
    this.inMemoryStore[key] = val;
  }

  public static initializeDefaults(
    defaultDrugs: DrugMaster[],
    defaultBatches: StockBatch[],
    defaultContraindications: ContraindicationReference[],
    defaultSuppliers: Supplier[],
    _defaultCrossSells?: CrossSellSuggestion[]
  ): void {
    if (!this.getItem(this.DRUGS_KEY)) {
      this.setItem(this.DRUGS_KEY, JSON.stringify(defaultDrugs));
    }
    if (!this.getItem(this.BATCHES_KEY)) {
      this.setItem(this.BATCHES_KEY, JSON.stringify(defaultBatches));
    }
    if (!this.getItem(this.CONTRAINDICATIONS_KEY)) {
      this.setItem(this.CONTRAINDICATIONS_KEY, JSON.stringify(defaultContraindications));
    }
    if (!this.getItem(this.SUPPLIERS_KEY)) {
      this.setItem(this.SUPPLIERS_KEY, JSON.stringify(defaultSuppliers));
    }
    if (!this.getItem(this.TRANSACTIONS_KEY)) {
      this.setItem(this.TRANSACTIONS_KEY, JSON.stringify([]));
    }
    if (!this.getItem(this.SYNC_QUEUE_KEY)) {
      this.setItem(this.SYNC_QUEUE_KEY, JSON.stringify([]));
    }
    if (!this.getItem(this.UNMET_DEMAND_KEY)) {
      this.setItem(this.UNMET_DEMAND_KEY, JSON.stringify([]));
    }
  }

  public static getDrugs(): DrugMaster[] {
    const raw = this.getItem(this.DRUGS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static saveDrugs(drugs: DrugMaster[]): void {
    this.setItem(this.DRUGS_KEY, JSON.stringify(drugs));
  }

  public static getBatches(): StockBatch[] {
    const raw = this.getItem(this.BATCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static saveBatches(batches: StockBatch[]): void {
    this.setItem(this.BATCHES_KEY, JSON.stringify(batches));
  }

  public static getContraindications(): ContraindicationReference[] {
    const raw = this.getItem(this.CONTRAINDICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static getTransactions(): Transaction[] {
    const raw = this.getItem(this.TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static saveTransactions(txs: Transaction[]): void {
    this.setItem(this.TRANSACTIONS_KEY, JSON.stringify(txs));
  }

  public static getSuppliers(): Supplier[] {
    const raw = this.getItem(this.SUPPLIERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static saveSuppliers(suppliers: Supplier[]): void {
    this.setItem(this.SUPPLIERS_KEY, JSON.stringify(suppliers));
  }

  public static getPurchaseOrders(): PurchaseOrder[] {
    const raw = this.getItem(this.PURCHASE_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static savePurchaseOrders(pos: PurchaseOrder[]): void {
    this.setItem(this.PURCHASE_ORDERS_KEY, JSON.stringify(pos));
  }

  public static getUnmetDemands(): UnmetDemand[] {
    const raw = this.getItem(this.UNMET_DEMAND_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static saveUnmetDemands(demands: UnmetDemand[]): void {
    this.setItem(this.UNMET_DEMAND_KEY, JSON.stringify(demands));
  }

  public static getSyncQueue(): SyncQueueItem[] {
    const raw = this.getItem(this.SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  public static saveSyncQueue(items: SyncQueueItem[]): void {
    this.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(items));
  }

  /**
   * Performs atomic local dispatch: decrements batch quantity and records transaction.
   */
  public static atomicLocalDispatch(tx: Transaction): { success: boolean; error?: string } {
    const batches = this.getBatches();
    const transactions = this.getTransactions();

    for (const item of tx.items || []) {
      const batchIdx = batches.findIndex((b) => b.id === item.stockBatchId);
      if (batchIdx === -1) {
        return { success: false, error: `Batch ${item.stockBatchId} not found in local stock ledger` };
      }
      if (batches[batchIdx].quantityOnHand < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock in batch ${batches[batchIdx].batchNumber}. Available: ${batches[batchIdx].quantityOnHand}, Requested: ${item.quantity}`,
        };
      }

      // Decrement stock
      batches[batchIdx].quantityOnHand -= item.quantity;
      batches[batchIdx].stockVersion += 1;
      batches[batchIdx].lastUpdatedAt = new Date().toISOString();
    }

    // Append transaction
    transactions.unshift(tx);

    this.saveBatches(batches);
    this.saveTransactions(transactions);

    return { success: true };
  }
}
