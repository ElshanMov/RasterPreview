import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { store } from '../store/store';
import { handleWebSocketEvent } from '../store/slices/rasterUploadSlice';
import type { RasterUploadProgressEvent } from '../types/raster-upload.type';

class Socket {
  private connection: HubConnection | null = null;
  private pipelineSynchronizedCallback: (() => void) | null = null;

  async init() {
    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
      return;
    }

    const baseUrl = `${import.meta.env.VITE_API_URL}/pipeline/hub/notifications`;

    this.connection = new HubConnectionBuilder()
      .withUrl(baseUrl, {
        accessTokenFactory: () => localStorage.getItem('accessToken') || '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.setupListeners();

    try {
      await this.connection.start();
      console.log("WebSocket Connected.");
    } catch (err) {
      console.error("WebSocket Connection Error: ", err);
      setTimeout(() => this.init(), 5000);
    }
  }

  private setupListeners() {
    if (!this.connection) return;

    // ─── Mövcud pipeline listener ───────────────────────
    this.connection.off('pipeline_synchronized');
    this.connection.on('pipeline_synchronized', () => {
      this.pipelineSynchronizedCallback?.();
    });

    // ─── Yeni: Raster Upload Progress listener ──────────
    this.connection.off('raster_upload_progress');
    this.connection.on('raster_upload_progress', (event: RasterUploadProgressEvent) => {
      console.log('[WS] Raster upload progress:', event);
      store.dispatch(handleWebSocketEvent(event));
    });
  }

  onPipelineSynchronized(callback: () => void) {
    this.pipelineSynchronizedCallback = callback;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
      console.log("WebSocket Disconnected.");
    }
  }
}

const socket = new Socket();
export default socket;