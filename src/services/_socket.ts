import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';

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
      .configureLogging(LogLevel.Warning) // Error-dan bir az daha geniş məlumat üçün
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

    this.connection.off('pipeline_synchronized');

    this.connection.on('pipeline_synchronized', () => {
      this.pipelineSynchronizedCallback?.();
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