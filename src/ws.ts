import { ethers } from "ethers";
import WebSocket from "ws";

const RECONNECT_INTERVAL_BASE = 1000; // Base interval for reconnection attempts in milliseconds
const EXPECTED_PONG_BACK = 15000; // Time to wait for a pong response in milliseconds
const KEEP_ALIVE_CHECK_INTERVAL = 7500; // Interval for sending ping messages in milliseconds
const SIMULATE_DISCONNECT_INTERVAL = 30000; // Interval to simulate disconnection (e.g., 30 seconds)

/**
 * WebSocketManager class to manage WebSocket connections.
 */
class WebSocketManager<T> {
  private readonly url: string;
  private readonly simulateDisconnect: boolean;
  private readonly events: { name: string; handler: (data: T) => void }[];
  private numOfReconnects: number;
  private provider: ReconnectingWebSocketProvider | null;

  /**
   * Constructor for WebSocketManager.
   *
   * @param url The WebSocket URL to connect to
   * @param events An array of event handlers to register
   * @param simulateDisconnect A flag to simulate disconnects
   */
  constructor(
    url: string,
    events: { name: string; handler: (data: T) => void }[] = [],
    simulateDisconnect = false
  ) {
    this.url = url;
    this.simulateDisconnect = simulateDisconnect;
    this.numOfReconnects = 0;
    this.provider = null;
    this.events = events;
  }

  public start() {
    if (this.provider) {
      this.provider.removeAllListeners();
    }

    const ws = new WebSocket(this.url);

    this.provider = new ReconnectingWebSocketProvider(
      ws,
      this.handleReconnection.bind(this),
      this.simulateDisconnect
    );

    this.events.forEach((event) => {
      if (this.provider) {
        this.provider.on(event.name, event.handler.bind(this));
      } else {
        throw new Error("WebSocket provider is not initialized");
      }
    });
  }

  /**
   * Handles reconnection attempts.
   * Passed as a callback to the ReconnectingWebSocketProvider.
   */
  private handleReconnection() {
    this.numOfReconnects++;
    setTimeout(() => {
      console.log(`Reconnection number: ${this.numOfReconnects}`);
      this.start();
    }, RECONNECT_INTERVAL_BASE);
    console.log(
      `Scheduled reconnection attempt ${this.numOfReconnects} in ${RECONNECT_INTERVAL_BASE} ms`
    );
  }
}

class ReconnectingWebSocketProvider extends ethers.WebSocketProvider {
  private readonly simulateDisconnect: boolean;
  private readonly start: () => void;
  private keepAliveInterval: any;
  private pingTimeout: any;

  /**
   * @param ws WebSocket instance
   * @param start A function to start the WebSocket connection
   * @param simulateDisconnect Enables simulated disconnections
   */
  constructor(ws: WebSocket, start: () => void, simulateDisconnect = false) {
    super(ws);
    this.keepAliveInterval = null;
    this.pingTimeout = null;
    this.simulateDisconnect = simulateDisconnect;
    this.start = start;

    this.bindEventHandlers();
  }

  public bindEventHandlers() {
    const ws = this.websocket as WebSocket;
    ws.on("open", this.onOpen.bind(this));
    ws.on("error", this.onError.bind(this));
    ws.on("close", this.onClose.bind(this));
    ws.on("message", this.onMessage.bind(this));
    ws.on("pong", () => {
      console.debug("Received a pong");
      clearTimeout(this.pingTimeout);
    });
  }

  private onOpen() {
    console.log("Connected to WebSocket server");
    this.clearIntervals();

    // Start the keep-alive check
    this.keepAliveInterval = setInterval(() => {
      console.debug("Sending a ping");
      (this.websocket as WebSocket).ping();

      this.pingTimeout = setTimeout(() => {
        const err = "No message received, terminating WebSocket connection";
        console.error(err);
        this.websocket.close(1001, err);
      }, EXPECTED_PONG_BACK);
    }, KEEP_ALIVE_CHECK_INTERVAL);

    // Schedule a simulated disconnect if the feature is enabled
    if (this.simulateDisconnect) {
      setTimeout(() => {
        console.warn("Simulating broken WebSocket connection");
        this.websocket.close();
      }, SIMULATE_DISCONNECT_INTERVAL);
    }
  }

  private onClose() {
    console.warn("WebSocket connection closed");
    this.clearIntervals();
    this.removeAllListeners();
    this.start();
  }

  private onError(error: any) {
    console.error("WebSocket error:", error);
  }

  private onMessage(data: any, isBinary: boolean) {
    console.debug(`Received message: ${JSON.stringify(data)}. Binary: ${isBinary}`);
  }

  private clearIntervals() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (this.pingTimeout) {
      clearTimeout(this.pingTimeout);
      this.pingTimeout = null;
    }
  }
}

export { WebSocketManager, ReconnectingWebSocketProvider };
