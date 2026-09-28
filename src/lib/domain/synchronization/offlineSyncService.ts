import { SyncQueueItem } from '../../types/pharmaassist';

export class OfflineSyncService {
  /**
   * Enqueues an offline mutation (FR-PLT-04, CON-02, NFR-DEG-01).
   */
  public static createQueueItem(
    operationType: 'dispatch' | 'adjustment' | 'receipt',
    entityId: string,
    payload: any,
    baseVersion?: number
  ): SyncQueueItem {
    return {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      operationType,
      entityId,
      payload,
      baseVersion,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Reconciles queue items in strict order.
   * LWW Strategy: Server records are updated with incoming payload.
   * If baseVersion != current server version, flag as conflict but preserve transaction log.
   */
  public static reconcileItem(
    queueItem: SyncQueueItem,
    currentServerVersion?: number
  ): {
    success: boolean;
    status: 'synced' | 'conflict' | 'retry';
    conflictMessage?: string;
  } {
    if (
      queueItem.baseVersion !== undefined &&
      currentServerVersion !== undefined &&
      queueItem.baseVersion !== currentServerVersion
    ) {
      // Conflict detected under LWW rule
      return {
        success: true,
        status: 'conflict',
        conflictMessage: `Stock version diverged (Local base: ${queueItem.baseVersion}, Server: ${currentServerVersion}). Last-write-wins applied.`,
      };
    }

    return {
      success: true,
      status: 'synced',
    };
  }
}
