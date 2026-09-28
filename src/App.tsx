import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CounterPOS } from './components/CounterPOS';
import { InsightsScreen } from './components/InsightsScreen';
import { InventoryScreen } from './components/InventoryScreen';
import { ProcurementScreen } from './components/ProcurementScreen';
import { LoginModal } from './components/LoginModal';
import { ContraindicationAlertModal } from './components/ContraindicationAlertModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ReceiptPrintModal } from './components/ReceiptPrintModal';
import { WalkthroughModal } from './components/WalkthroughModal';
import { CartDrawer } from './components/CartDrawer';
import { StockDiscrepancyModal } from './components/StockDiscrepancyModal';

import {
  DrugMaster,
  StockBatch,
  ContraindicationReference,
  Transaction,
  Supplier,
  SupplierQualityEvent,
  PurchaseOrder,
  UnmetDemand,
  SyncQueueItem,
  StockAdjustmentReason,
  SmartScanMatchResult,
  IndicationCategory,
  CartItem,
  DiscrepancyReasonCode,
  StockDiscrepancyRecord,
} from './lib/types/pharmaassist';

import {
  initialDrugs,
  initialBatches,
  initialContraindications,
  initialSuppliers,
  initialSupplierEvents,
  initialRecentTransactions,
} from './lib/data/initialData';

import { LocalStorageAdapter } from './lib/offline/storageAdapter';
import { OfflineSyncService } from './lib/domain/synchronization/offlineSyncService';
import { CartService } from './lib/domain/pos/cartService';
import { DiscrepancyService } from './lib/domain/inventory/discrepancyService';
import { isSupabaseConfigured, supabase } from './lib/supabase/client';
import { Language } from './lib/i18n/translations';

export const App: React.FC = () => {
  // 1. Single Operator Authentication State (FR-SEC-01) - open by default for immediate operation
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // 2. Application Navigation State
  const [currentTab, setCurrentTab] = useState<string>('counter');
  const [lang, setLang] = useState<Language>('en');

  // 3. Online / Offline Connectivity State (CON-02, NFR-DEG-01)
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // 4. Central & Local Domain Data State
  const [drugs, setDrugs] = useState<DrugMaster[]>([]);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [contraindications, setContraindications] = useState<ContraindicationReference[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierEvents, setSupplierEvents] = useState<SupplierQualityEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unmetDemands, setUnmetDemands] = useState<UnmetDemand[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [discrepancies, setDiscrepancies] = useState<StockDiscrepancyRecord[]>([]);

  // 5. Commercial-Style POS Cart State (Section 5)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 6. Modal States & Active Scans
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedMatch, setScannedMatch] = useState<SmartScanMatchResult | null>(null);
  const [receiptPrintTx, setReceiptPrintTx] = useState<Transaction | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [discrepancyBatchId, setDiscrepancyBatchId] = useState<string | undefined>(undefined);
  const [safetyConflictModal, setSafetyConflictModal] = useState<{
    drug: DrugMaster;
    conflicts: ContraindicationReference[];
  } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    LocalStorageAdapter.initializeDefaults(
      initialDrugs,
      initialBatches,
      initialContraindications,
      initialSuppliers,
      initialSupplierEvents
    );

    const loadedDrugs = LocalStorageAdapter.getDrugs();
    const loadedBatches = LocalStorageAdapter.getBatches();
    const loadedContra = LocalStorageAdapter.getContraindications();
    const loadedSuppliers = LocalStorageAdapter.getSuppliers();
    const loadedSupplierEvents = LocalStorageAdapter.getSupplierEvents();
    const loadedTxs = LocalStorageAdapter.getTransactions();
    const loadedPOs = LocalStorageAdapter.getPurchaseOrders();
    const loadedUnmet = LocalStorageAdapter.getUnmetDemands();
    const loadedQueue = LocalStorageAdapter.getSyncQueue();
    const loadedDiscrepancies = LocalStorageAdapter.getDiscrepancies();

    setDrugs(loadedDrugs.length ? loadedDrugs : initialDrugs);
    setBatches(loadedBatches.length ? loadedBatches : initialBatches);
    setContraindications(loadedContra.length ? loadedContra : initialContraindications);
    setSuppliers(loadedSuppliers.length ? loadedSuppliers : initialSuppliers);
    setSupplierEvents(loadedSupplierEvents.length ? loadedSupplierEvents : initialSupplierEvents);
    setTransactions(loadedTxs.length ? loadedTxs : initialRecentTransactions);
    setPurchaseOrders(loadedPOs);
    setUnmetDemands(loadedUnmet);
    setSyncQueue(loadedQueue);
    setDiscrepancies(loadedDiscrepancies);

    // Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cart Operations (Section 5 & 6)
  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.drugId === item.drugId && ci.selectedBatchId === item.selectedBatchId
      );

      if (existingIdx !== -1) {
        // Increment quantity on existing line item
        const existing = prev[existingIdx];
        const newQty = Math.min(existing.quantity + item.quantity, existing.maxAvailableQuantity);
        const updated = [...prev];
        updated[existingIdx] = CartService.updateItemQuantity(existing, newQty);
        return updated;
      }

      return [item, ...prev];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, newQty: number) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? CartService.updateItemQuantity(item, newQty) : item))
    );
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleTogglePrescriptionSighted = (itemId: string) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newSighted = !item.prescriptionSighted;
          return {
            ...item,
            prescriptionSighted: newSighted,
            safetyStatus: newSighted ? 'clear' : 'prescription_required',
          };
        }
        return item;
      })
    );
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Consolidated Multi-Item Cart Dispatch (Section 7)
  const handleDispatchCart = () => {
    if (cartItems.length === 0) return;

    const totals = CartService.calculateTotals(cartItems);
    if (totals.hasBlockingIssues) {
      alert(`Cannot dispatch basket:\n${totals.blockingReasons.join('\n')}`);
      return;
    }

    const txId = `TX-${Date.now().toString().slice(-6)}`;
    const txItems = cartItems.map((ci, idx) => ({
      id: `txi-${Date.now()}-${idx}`,
      transactionId: txId,
      drugId: ci.drugId,
      stockBatchId: ci.selectedBatchId,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice,
      discount: ci.discountAmount,
      extendedValue: ci.extendedValue,
      drugName: ci.drugName,
      batchNumber: ci.batchNumber,
      indicationCategory: ci.indicationCategory || 'General Health',
    }));

    const consolidatedTx: Transaction = {
      id: txId,
      timestamp: new Date().toISOString(),
      totalValue: totals.grandTotal,
      totalDiscount: totals.totalDiscount,
      visitType: cartItems.some((ci) => ci.visitType === 'Prescription') ? 'Prescription' : 'OTC',
      prescriptionSighted: cartItems.every((ci) => !ci.prescriptionSighted || ci.prescriptionSighted),
      discountFlag: cartItems.some((ci) => ci.discountPercent > 5.0),
      quantityCorrectionFlag: false,
      syncStatus: isOnline ? 'synced' : 'pending',
      items: txItems,
    };

    // Perform atomic local stock decrement first (ensures offline robustness)
    const localRes = LocalStorageAdapter.atomicLocalDispatch(consolidatedTx);
    if (!localRes.success) {
      alert(`Dispatch failed: ${localRes.error}`);
      return;
    }

    // Refresh state from authoritative local store
    const updatedBatches = LocalStorageAdapter.getBatches();
    const updatedTxs = LocalStorageAdapter.getTransactions();
    setBatches(updatedBatches);
    setTransactions(updatedTxs);

    // Online Authoritative Supabase Dispatch reconciliation (if connected)
    if (isOnline && isSupabaseConfigured && supabase) {
      const client = supabase;
      cartItems.forEach((ci) => {
        const batchObj = batches.find((b) => b.id === ci.selectedBatchId);
        client
          .rpc('dispatch_transaction_v2', {
            p_drug_id: ci.drugId,
            p_stock_batch_id: ci.selectedBatchId,
            p_quantity: ci.quantity,
            p_unit_price: ci.unitPrice,
            p_discount_percent: ci.discountPercent,
            p_prescription_sighted: ci.prescriptionSighted,
            p_visit_type: ci.visitType,
            p_indication_category: ci.indicationCategory || 'General Health',
            p_client_stock_version: batchObj?.stockVersion || 1,
          })
          .then(({ error }) => {
            if (error) {
              console.warn('Online Supabase RPC error (reconciling to offline queue):', error.message);
            }
          });
      });
    } else if (!isOnline) {
      // Offline fallback: enqueue into SyncQueue (CON-02, NFR-DEG-01)
      const queueItem = OfflineSyncService.createQueueItem(
        'dispatch',
        consolidatedTx.id,
        consolidatedTx,
        1
      );
      const newQueue = [queueItem, ...syncQueue];
      setSyncQueue(newQueue);
      LocalStorageAdapter.saveSyncQueue(newQueue);
    }

    // Clear cart and show receipt print modal
    setCartItems([]);
    setIsCartOpen(false);
    setReceiptPrintTx(consolidatedTx);
    alert(`Basket successfully dispatched! Transaction ${txId} recorded with ${cartItems.length} items.`);
  };

  // Single Item Dispatch (Backward compatibility & quick direct dispatch)
  const handleDispatchTransaction = (
    drug: DrugMaster,
    batch: StockBatch,
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    prescriptionSighted: boolean,
    visitType: 'OTC' | 'Prescription',
    indicationCategory?: IndicationCategory
  ): { success: boolean; transaction?: Transaction; error?: string } => {
    if (batch.quantityOnHand < quantity) {
      return {
        success: false,
        error: `Insufficient stock in batch ${batch.batchNumber}. Available: ${batch.quantityOnHand}`,
      };
    }

    const grossValue = unitPrice * quantity;
    const discountAmount = Number(((grossValue * discountPercent) / 100).toFixed(2));
    const extendedValue = Number((grossValue - discountAmount).toFixed(2));
    const isDiscountCeilingExceeded = discountPercent > 5.0;

    const newTx: Transaction = {
      id: `TX-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      totalValue: extendedValue,
      totalDiscount: discountAmount,
      visitType,
      prescriptionSighted,
      discountFlag: isDiscountCeilingExceeded,
      quantityCorrectionFlag: false,
      syncStatus: isOnline ? 'synced' : 'pending',
      items: [
        {
          id: `txi-${Date.now()}`,
          transactionId: `TX-${Date.now().toString().slice(-6)}`,
          drugId: drug.id,
          stockBatchId: batch.id,
          quantity,
          unitPrice,
          discount: discountAmount,
          extendedValue,
          drugName: drug.brandName,
          batchNumber: batch.batchNumber,
          indicationCategory: indicationCategory || drug.indicationCategory || 'General Health',
        },
      ],
    };

    const localRes = LocalStorageAdapter.atomicLocalDispatch(newTx);
    if (!localRes.success) {
      return { success: false, error: localRes.error };
    }

    const updatedBatches = LocalStorageAdapter.getBatches();
    const updatedTxs = LocalStorageAdapter.getTransactions();
    setBatches(updatedBatches);
    setTransactions(updatedTxs);

    if (isOnline && isSupabaseConfigured && supabase) {
      supabase
        .rpc('dispatch_transaction_v2', {
          p_drug_id: drug.id,
          p_stock_batch_id: batch.id,
          p_quantity: quantity,
          p_unit_price: unitPrice,
          p_discount_percent: discountPercent,
          p_prescription_sighted: prescriptionSighted,
          p_visit_type: visitType,
          p_indication_category: indicationCategory || drug.indicationCategory || 'General Health',
          p_client_stock_version: batch.stockVersion,
        })
        .then(({ error }) => {
          if (error) {
            console.warn('Online Supabase RPC error (reconciling to offline queue):', error.message);
          }
        });
    }

    return { success: true, transaction: newTx };
  };

  // Reconcile and Sync Queued Mutations (FR-PLT-04, NFR-DEG-01)
  const handleSyncQueue = () => {
    if (syncQueue.length === 0) return;

    const remainingQueue: SyncQueueItem[] = [];
    for (const item of syncQueue) {
      const res = OfflineSyncService.reconcileItem(item, 1);
      if (!res.success) {
        remainingQueue.push(item);
      }
    }

    setSyncQueue(remainingQueue);
    LocalStorageAdapter.saveSyncQueue(remainingQueue);
    alert(`Synchronization complete! ${syncQueue.length - remainingQueue.length} queued mutations processed.`);
  };

  // Log Unmet Customer Demand (FR-POS-07)
  const handleLogUnmetDemand = (drugText: string, drugId?: string, indication?: IndicationCategory) => {
    const demand: UnmetDemand = {
      id: `dem-${Date.now()}`,
      requestedDrugText: drugText,
      normalizedDrugId: drugId,
      timestamp: new Date().toISOString(),
      reason: 'no_match',
      fulfilled: false,
    };
    const updated = [demand, ...unmetDemands];
    setUnmetDemands(updated);
    LocalStorageAdapter.saveUnmetDemands(updated);
    alert(`Customer demand logged for "${drugText}" (${indication || 'General'}). Logged to procurement.`);
  };

  // Apply Reason-Coded Stock Adjustment (FR-INV-04)
  const handleApplyAdjustment = (
    batchId: string,
    delta: number,
    _reason: StockAdjustmentReason,
    _notes?: string
  ) => {
    const updated = batches.map((b) => {
      if (b.id === batchId) {
        return {
          ...b,
          quantityOnHand: Math.max(0, b.quantityOnHand + delta),
          stockVersion: b.stockVersion + 1,
          lastUpdatedAt: new Date().toISOString(),
        };
      }
      return b;
    });

    setBatches(updated);
    LocalStorageAdapter.saveBatches(updated);
  };

  // Controlled Stock Discrepancy Reconciliation (Section 10)
  const handleConfirmDiscrepancy = (
    batchId: string,
    delta: number,
    reasonCode: DiscrepancyReasonCode,
    notes?: string,
    record?: StockDiscrepancyRecord
  ) => {
    const mappedReason = DiscrepancyService.mapToStockAdjustmentReason(reasonCode);
    handleApplyAdjustment(batchId, delta, mappedReason, notes);

    if (record) {
      LocalStorageAdapter.appendDiscrepancy(record);
      setDiscrepancies((prev) => [record, ...prev]);
    }

    alert(`Physical count reconciliation complete! Stock adjusted by ${delta > 0 ? '+' : ''}${delta} units.`);
  };

  // Create Purchase Order (FR-PROC-03)
  const handleCreatePO = (supplierId: string, items: { drugId: string; quantity: number }[]) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    const newPO: PurchaseOrder = {
      id: `PO-${Date.now().toString().slice(-6)}`,
      supplierId,
      supplierName: supplier?.name,
      createdAt: new Date().toISOString(),
      promisedLeadTimeDays: supplier?.promisedLeadTimeDays || 3,
      status: 'sent',
      items: items.map((it) => ({
        id: `poi-${Date.now()}`,
        purchaseOrderId: `PO-${Date.now().toString().slice(-6)}`,
        drugId: it.drugId,
        orderedQuantity: it.quantity,
      })),
    };

    const updated = [newPO, ...purchaseOrders];
    setPurchaseOrders(updated);
    LocalStorageAdapter.savePurchaseOrders(updated);
    alert(`Purchase order ${newPO.id} generated and dispatched to ${supplier?.name}.`);
  };

  // Receive Purchase Order Shipment with Supplier Quality Logging (FR-PROC-03, FR-PROC-04)
  const handleReceivePO = (
    poId: string,
    receivedItems: {
      drugId: string;
      batchNumber: string;
      lotNumber: string;
      manufacturingDate: string;
      expiryDate: string;
      receivedQuantity: number;
    }[],
    onTime: boolean,
    qualityFlag: 'none' | 'damaged' | 'expired_on_arrival' | 'rejected_batch'
  ) => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    const updatedPOs = purchaseOrders.map((po) =>
      po.id === poId ? { ...po, status: 'received' as const } : po
    );
    setPurchaseOrders(updatedPOs);
    LocalStorageAdapter.savePurchaseOrders(updatedPOs);

    let updatedBatches = [...batches];
    for (const item of receivedItems) {
      const existingIdx = updatedBatches.findIndex(
        (b) => b.drugId === item.drugId && b.batchNumber === item.batchNumber
      );

      if (existingIdx !== -1) {
        updatedBatches[existingIdx].quantityOnHand += item.receivedQuantity;
        updatedBatches[existingIdx].stockVersion += 1;
      } else {
        const newBatch: StockBatch = {
          id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          drugId: item.drugId,
          batchNumber: item.batchNumber,
          lotNumber: item.lotNumber,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          quantityOnHand: item.receivedQuantity,
          reorderThreshold: 15,
          stockVersion: 1,
          lastUpdatedAt: new Date().toISOString(),
        };
        updatedBatches.push(newBatch);
      }
    }

    setBatches(updatedBatches);
    LocalStorageAdapter.saveBatches(updatedBatches);

    const orderedQty = targetPO?.items?.[0]?.orderedQuantity || 0;
    const receivedTotal = receivedItems.reduce((acc, it) => acc + it.receivedQuantity, 0);
    const discrepancy = Math.max(0, orderedQty - receivedTotal);

    const qualityEvent: SupplierQualityEvent = {
      id: `sqe-${Date.now()}`,
      purchaseOrderId: poId,
      supplierId: targetPO?.supplierId || '',
      onTime,
      quantityDiscrepancy: discrepancy,
      qualityFlag,
      evaluatedAt: new Date().toISOString(),
    };

    const updatedEvents = [qualityEvent, ...supplierEvents];
    setSupplierEvents(updatedEvents);
    LocalStorageAdapter.saveSupplierEvents(updatedEvents);

    alert(`Shipment received! ${receivedTotal} units added to stock ledger. Supplier quality event logged.`);
  };

  return (
    <div className="min-h-screen bg-[#0b1728] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-white">
      {/* Login Screen Modal if unauthenticated */}
      {!isAuthenticated && (
        <LoginModal
          lang={lang}
          onLoginSuccess={() => {
            setIsAuthenticated(true);
          }}
        />
      )}

      {/* Top Application Bar with Cart Counter */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOnline={isOnline}
        pendingSyncCount={syncQueue.length}
        onSync={handleSyncQueue}
        lang={lang}
        setLang={setLang}
        onLockTerminal={() => setIsAuthenticated(false)}
        onOpenWalkthrough={() => setWalkthroughOpen(true)}
        cartItemCount={cartItems.length}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {currentTab === 'counter' && (
          <CounterPOS
            drugs={drugs}
            batches={batches}
            contraindications={contraindications}
            transactions={transactions}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onOpenCart={() => setIsCartOpen(true)}
            scannedMatch={scannedMatch}
            onClearScannedMatch={() => setScannedMatch(null)}
            onDispatch={handleDispatchTransaction}
            onLogUnmetDemand={handleLogUnmetDemand}
            onOpenScanner={() => setIsScannerOpen(true)}
            onPrintReceipt={(tx) => setReceiptPrintTx(tx)}
            onTriggerSafetyAlert={(drug, conflicts) =>
              setSafetyConflictModal({ drug, conflicts })
            }
            lang={lang}
          />
        )}

        {currentTab === 'insights' && (
          <InsightsScreen
            drugs={drugs}
            batches={batches}
            transactions={transactions}
            suppliers={suppliers}
            supplierEvents={supplierEvents}
            purchaseOrders={purchaseOrders}
            discrepancies={discrepancies}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            lang={lang}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryScreen
            drugs={drugs}
            batches={batches}
            discrepancies={discrepancies}
            onOpenDiscrepancyModal={(batchId) => {
              setDiscrepancyBatchId(batchId);
              setIsDiscrepancyModalOpen(true);
            }}
            onApplyAdjustment={handleApplyAdjustment}
            lang={lang}
          />
        )}

        {currentTab === 'procurement' && (
          <ProcurementScreen
            drugs={drugs}
            batches={batches}
            unmetDemands={unmetDemands}
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}
            onCreatePO={handleCreatePO}
            onReceivePO={handleReceivePO}
            lang={lang}
          />
        )}
      </main>

      {/* Commercial-Style Cart Drawer (Section 6) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onTogglePrescriptionSighted={handleTogglePrescriptionSighted}
        onClearCart={handleClearCart}
        onDispatchCart={handleDispatchCart}
        lang={lang}
      />

      {/* Physical Count Discrepancy Reconciliation Modal (Section 10 & 11) */}
      <StockDiscrepancyModal
        isOpen={isDiscrepancyModalOpen}
        onClose={() => setIsDiscrepancyModalOpen(false)}
        drugs={drugs}
        batches={batches}
        preselectedBatchId={discrepancyBatchId}
        onConfirmAdjustment={handleConfirmDiscrepancy}
      />

      {/* Smart OCR / Barcode Package Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          drugs={drugs}
          batches={batches}
          onClose={() => setIsScannerOpen(false)}
          onScanResult={(match) => {
            setIsScannerOpen(false);
            setScannedMatch(match);
            setCurrentTab('counter');
          }}
        />
      )}

      {/* Clinical Contraindication Alert Modal */}
      {safetyConflictModal && (
        <ContraindicationAlertModal
          drug={safetyConflictModal.drug}
          conflicts={safetyConflictModal.conflicts}
          onDismiss={() => setSafetyConflictModal(null)}
          onOverride={(reason) => {
            setSafetyConflictModal(null);
            alert(`Clinical safety check resolved with note: "${reason}". Dispatch allowed.`);
          }}
        />
      )}

      {/* POS Receipt Modal */}
      {receiptPrintTx && (
        <ReceiptPrintModal
          transaction={receiptPrintTx}
          onClose={() => setReceiptPrintTx(null)}
        />
      )}

      {/* Operator Walkthrough Modal */}
      {walkthroughOpen && (
        <WalkthroughModal onClose={() => setWalkthroughOpen(false)} />
      )}
    </div>
  );
};
