import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
    RasterUploadStatus,
    type RasterUploadItem,
    type RasterUploadProgressEvent,
} from '../../types/raster-upload.type';

// ─── State ────────────────────────────────────────────────────

interface RasterUploadState {
    /** CorrelationId ilə index olunan aktiv upload-lar */
    items: Record<string, RasterUploadItem>;

    /** Pipeline panelinin açıq/bağlı vəziyyəti */
    panelVisible: boolean;

    /** Yeni tamamlanan upload-ların sayı (badge üçün) */
    unseenCompletedCount: number;
}

const initialState: RasterUploadState = {
    items: {},
    panelVisible: false,
    unseenCompletedCount: 0,
};

// ─── Helpers ──────────────────────────────────────────────────

const TERMINAL_STATUSES: RasterUploadStatus[] = [
    RasterUploadStatus.Success,
    RasterUploadStatus.PartialSuccess,
    RasterUploadStatus.Failed,
    RasterUploadStatus.Stale,
];

const isTerminalStatus = (status: RasterUploadStatus): boolean =>
    TERMINAL_STATUSES.includes(status);

// ─── Slice ────────────────────────────────────────────────────

export const rasterUploadSlice = createSlice({
    name: 'rasterUpload',
    initialState,
    reducers: {
        /**
         * Yeni upload prosesi başladıqda çağırılır.
         * Pre-signed URL alındıqdan və DB rekord yaradıldıqdan sonra.
         */
        addUpload(
            state,
            action: PayloadAction<{
                correlationId: string;
                fileName: string;
                fileSize: number;
                originalPath?: string;
            }>
        ) {
            const { correlationId, fileName, fileSize, originalPath } = action.payload;

            state.items[correlationId] = {
                correlationId,
                fileName,
                fileSize,
                status: RasterUploadStatus.Pending,
                uploadProgress: 0,
                statusMessage: 'Hazırlanır...',
                startedAt: new Date().toISOString(),
                retryCount: 0,
                originalPath,
            };

            // Panel avtomatik açılsın
            state.panelVisible = true;
        },

        /**
         * MinIO-ya yükləmə progress-i (0-100).
         * XHR upload.onprogress callback-dən çağırılır.
         */
        updateUploadProgress(
            state,
            action: PayloadAction<{
                correlationId: string;
                progress: number;
            }>
        ) {
            const item = state.items[action.payload.correlationId];
            if (!item) return;

            item.status = RasterUploadStatus.Uploading;
            item.uploadProgress = action.payload.progress;
            item.statusMessage = `MinIO-ya yüklənir... ${action.payload.progress}%`;
        },

        /**
         * MinIO upload tamamlandıqda çağırılır.
         * UI tərəfindən — Kafka eventindən əvvəl.
         */
        markAsUploaded(state, action: PayloadAction<string>) {
            const item = state.items[action.payload];
            if (!item) return;

            item.status = RasterUploadStatus.Uploaded;
            item.uploadProgress = 100;
            item.statusMessage = 'Yükləndi, emal gözlənilir...';
        },

        /**
         * WebSocket-dən gələn status yeniləmələri.
         * Worker pod-unun göndərdiyi hər progress event bura düşür.
         */
        handleWebSocketEvent(
            state,
            action: PayloadAction<RasterUploadProgressEvent>
        ) {
            const event = action.payload;
            const item = state.items[event.correlationId];
            if (!item) return;

            item.status = event.status;
            item.statusMessage = event.message;

            if (event.cogPath) {
                item.cogPath = event.cogPath;
            }

            if (event.errorMessage) {
                item.errorMessage = event.errorMessage;
            }

            if (isTerminalStatus(event.status)) {
                item.completedAt = new Date().toISOString();

                // Panel bağlıdırsa badge göstər
                if (!state.panelVisible) {
                    state.unseenCompletedCount += 1;
                }
            }
        },

        /**
         * Upload uğursuz oldu — UI tərəfindən (network error, API error).
         */
        markAsFailed(
            state,
            action: PayloadAction<{
                correlationId: string;
                errorMessage: string;
            }>
        ) {
            const item = state.items[action.payload.correlationId];
            if (!item) return;

            item.status = RasterUploadStatus.Failed;
            item.errorMessage = action.payload.errorMessage;
            item.statusMessage = 'Xəta baş verdi';
            item.completedAt = new Date().toISOString();
        },

        /**
         * Retry — uğursuz upload-ı yenidən cəhd etmək.
         */
        retryUpload(state, action: PayloadAction<string>) {
            const item = state.items[action.payload];
            if (!item) return;

            item.status = RasterUploadStatus.Pending;
            item.uploadProgress = 0;
            item.errorMessage = undefined;
            item.completedAt = undefined;
            item.statusMessage = 'Yenidən cəhd edilir...';
            item.retryCount += 1;
        },

        /**
         * Tamamlanmış upload-ı siyahıdan silmək.
         */
        removeUpload(state, action: PayloadAction<string>) {
            delete state.items[action.payload];
        },

        /**
         * Bütün tamamlanmış upload-ları silmək.
         */
        clearCompleted(state) {
            for (const [id, item] of Object.entries(state.items)) {
                if (isTerminalStatus(item.status)) {
                    delete state.items[id];
                }
            }
        },

        /**
         * Pipeline panelini aç/bağla.
         */
        togglePanel(state) {
            state.panelVisible = !state.panelVisible;

            // Panel açıldıqda badge sıfırlansın
            if (state.panelVisible) {
                state.unseenCompletedCount = 0;
            }
        },

        setPanelVisible(state, action: PayloadAction<boolean>) {
            state.panelVisible = action.payload;

            if (action.payload) {
                state.unseenCompletedCount = 0;
            }
        },
    },
});

// ─── Actions ──────────────────────────────────────────────────

export const {
    addUpload,
    updateUploadProgress,
    markAsUploaded,
    handleWebSocketEvent,
    markAsFailed,
    retryUpload,
    removeUpload,
    clearCompleted,
    togglePanel,
    setPanelVisible,
} = rasterUploadSlice.actions;

// ─── Selectors ────────────────────────────────────────────────

import type { RootState } from '../store';

/** Bütün upload item-ları array şəklində (yenidən köhnəyə) */
export const selectAllUploads = (state: RootState): RasterUploadItem[] =>
    (Object.values(state.rasterUpload.items) as RasterUploadItem[]).sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

/** Aktiv (terminal olmayan) upload-ların sayı */
export const selectActiveUploadCount = (state: RootState): number =>
    (Object.values(state.rasterUpload.items) as RasterUploadItem[]).filter(
        (item) => !isTerminalStatus(item.status)
    ).length;

/** Panel açıq/bağlı */
export const selectPanelVisible = (state: RootState): boolean =>
    state.rasterUpload.panelVisible;

/** Görülməmiş tamamlanma sayı (badge) */
export const selectUnseenCount = (state: RootState): number =>
    state.rasterUpload.unseenCompletedCount;

/** Hər hansı upload var mı (panel göstərilsin mi?) */
export const selectHasUploads = (state: RootState): boolean =>
    Object.keys(state.rasterUpload.items).length > 0;

export default rasterUploadSlice.reducer;