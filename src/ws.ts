import { ethers } from "ethers";

// Constants
const RECONNECT_INTERVAL_BASE = 1000; // Base interval for reconnection attempts in milliseconds
const EXPECTED_PONG_BACK = 15000; // Time to wait for a pong response in milliseconds
const KEEP_ALIVE_CHECK_INTERVAL = 7500; // Interval for sending ping messages in milliseconds
const MAX_RECONNECT_ATTEMPTS = 5; // Maximum number of reconnection attempts
const SIMULATE_DISCONNECT_INTERVAL = 30000; // Interval to simulate disconnection (e.g., 30 seconds)

/**
 * WebSocketManager class to manage WebSocket connections.
 */
class WebSocketManager {
  private readonly url: string;
  private readonly simulateDisconnect: boolean;
  private readonly events: [{ name: string; handler: () => void }];
  private reconnectAttempts: number;
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
    events: [{ name: string; handler: () => void }],
    simulateDisconnect = false
  ) {
    this.url = url;
    this.simulateDisconnect = simulateDisconnect;
    this.reconnectAttempts = 0;
    this.provider = null;
    this.events = events;
  }

  public start() {
    if (this.provider) {
      this.provider.removeEventHandlers();
    }

    this.provider = new ReconnectingWebSocketProvider(
      this.url,
      this.handleReconnection.bind(this),
      this.simulateDisconnect
    );

    this.events.forEach((event) => {
      this.registerEventHandler(event.name, event.handler);
    });
  }

  /**
   * Handles reconnection attempts.
   * Passed as a callback to the ReconnectingWebSocketProvider.
   */
  private handleReconnection() {
    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay =
        RECONNECT_INTERVAL_BASE * Math.pow(2, this.reconnectAttempts);
      setTimeout(() => {
        console.log(`Reconnecting attempt ${this.reconnectAttempts + 1}`);
        this.start();
      }, delay);
      this.reconnectAttempts++;
      console.log(
        `Scheduled reconnection attempt ${this.reconnectAttempts} in ${delay} ms`
      );
    } else {
      console.error("Maximum reconnection attempts reached. Aborting.");
    }
  }

  /**
   * Registers an event handler for the specified event.
   *
   * @param event A string representing the event name
   * @param handler A function to execute when the event is triggered
   */
  private registerEventHandler(
    event: string,
    handler: (...args: any[]) => void
  ) {
    if (this.provider) {
      this.provider.on(event, handler);
    } else {
      console.error("WebSocket provider is not initialized.");
    }
  }
}

class ReconnectingWebSocketProvider extends ethers.WebSocketProvider {
  private readonly simulateDisconnect: boolean;
  private readonly start: () => void;
  private keepAliveInterval: any;
  private pingTimeout: any;

  /**
   * @param url  WebSocket provider URL
   * @param start A function to start the WebSocket connection
   * @param simulateDisconnect Enables simulated disconnections
   */
  constructor(url: string, start: () => void, simulateDisconnect = false) {
    super(url);
    this.keepAliveInterval = null;
    this.pingTimeout = null;
    this.simulateDisconnect = simulateDisconnect;
    this.start = start;

    this.bindEventHandlers();
  }

  public bindEventHandlers() {
    this.on("open", this.onOpen.bind(this));
    this.on("close", this.onClose.bind(this));
    this.on("error", this.onError.bind(this));
    this.on("pong", this.onPong.bind(this));
  }

  public removeEventHandlers() {
    this.removeAllListeners("open");
    this.removeAllListeners("close");
    this.removeAllListeners("error");
    this.removeAllListeners("pong");
  }

  private onOpen() {
    console.log("Connected to WebSocket server");
    this.clearIntervals();

    // Start the keep-alive check
    this.keepAliveInterval = setInterval(() => {
      console.debug("Checking if the connection is alive, sending a ping");
      this.websocket.send("ping");

      this.pingTimeout = setTimeout(() => {
        const err = "No pong received, terminating WebSocket connection";
        console.error(err);
        this.websocket.close(1, err);
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
    this.removeEventHandlers();
    this.start();
  }

  private onError(error: any) {
    console.error("WebSocket error:", error);
  }

  private onPong() {
    console.debug("Received pong");
    clearTimeout(this.pingTimeout);
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
