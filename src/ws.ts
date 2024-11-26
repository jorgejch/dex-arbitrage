import { logger, config, exponentialBackoffDelay } from "./common.js";
import { ethers, WebSocketProvider } from "ethers";
import { EventEmitter } from "events";
import WebSocket from "ws";

const RECONNECT_INTERVAL_BASE = config.RECONNECT_INTERVAL_BASE;
const EXPECTED_PONG_BACK = config.EXPECTED_PONG_BACK;
const KEEP_ALIVE_CHECK_INTERVAL = config.KEEP_ALIVE_CHECK_INTERVAL;
const SIMULATE_DISCONNECT_INTERVAL = config.SIMULATE_DISCONNECT_INTERVAL;

/**
 * Class to manage WebSocket connections.
 */
class WebSocketManager extends EventEmitter {
  private readonly url: string;
  private readonly simulateDisconnect: boolean;
  private numOfReconnects: number;
  private provider?: WebSocketProvider;
  private refreshed: boolean;
  private keepAliveInterval: any;
  private pingTimeout: any;

  /**
   * @param url The WebSocket URL to connect to
   * @param events An array of event handlers to register
   * @param simulateDisconnect A flag to simulate disconnects
   */
  constructor(url: string, simulateDisconnect = false) {
    super();
    this.url = url;
    this.simulateDisconnect = simulateDisconnect;
    this.numOfReconnects = 0;
    this.refreshed = false;
    this.keepAliveInterval = null;
    this.pingTimeout = null;

    this.setMaxListeners(30);
  }

  public getProvider() {
    if (!this.provider) {
      throw new Error("WebSocket provider is not initialized");
    }
    return this.provider;
  }

  /**
   * Handles reconnection attempts.
   */
  private handleReconnection(retryNumber: number = 0) {
    this.numOfReconnects++;
    this.refreshed = false;
    setTimeout(async () => {
      logger.info(
        `Reconnection number: ${this.numOfReconnects}`,
        this.constructor.name
      );

      try {
        this.refresh();
      } catch (error) {
        logger.error(`Error initializing WebSocketManager: ${error}`);
        // Retry reconnection with exponential backoff
        await exponentialBackoffDelay(retryNumber).then(() => {
          if (retryNumber < 10) {
            this.handleReconnection(retryNumber + 1);
          }
        });
      }

      // Emit the reconnected event to update listener's state
      if (this.emitEvent("reconnected")) {
        logger.info("Reconnected event emitted", this.constructor.name);
      }
    }, RECONNECT_INTERVAL_BASE);
  }

  /**
   * Clears the intervals for keep-alive checks.
   */
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

  /**
   * Emits an event to this.constructor listeners.
   *
   * @param eventName Event name
   * @param args
   * @returns
   */
  public emitEvent(eventName: string | symbol, ...args: any[]): boolean {
    return this.emit(eventName, ...args);
  }

  /**
   * Refreshes the WebSocket connection.
   */
  public refresh() {
    if (this.refreshed) {
      logger.warn(
        "WebSocketManager is already refreshed",
        this.constructor.name
      );
      return;
    }

    const ws = new WebSocket(this.url);

    // Register event handlers
    ws.on("open", () => {
      logger.info("Connected to WebSocket server", this.constructor.name);
      this.clearIntervals();

      // Start the keep-alive check
      this.keepAliveInterval = setInterval(() => {
        logger.debug("Sending a ping", this.constructor.name);
        ws.ping();

        this.pingTimeout = setTimeout(() => {
          const err = "No pong received, terminating WebSocket connection";
          logger.error(err, this.constructor.name);
          ws.close(1001, err);
        }, EXPECTED_PONG_BACK);
      }, KEEP_ALIVE_CHECK_INTERVAL);

      if (this.simulateDisconnect) {
        setTimeout(() => {
          logger.warn("Simulating a disconnect", this.constructor.name);
          ws.close();
        }, SIMULATE_DISCONNECT_INTERVAL);
      }
    });
    ws.on("close", () => {
      logger.warn("WebSocket connection closed", this.constructor.name);
      this.clearIntervals();
      ws.removeAllListeners();
      this.handleReconnection();
    });
    ws.on("pong", () => {
      logger.debug("Received a pong", this.constructor.name);
      clearTimeout(this.pingTimeout);
    });
    ws.on("error", (error) => {
      logger.error(`WebSocket error: ${error}`, this.constructor.name);
    });

    this.provider = new ethers.WebSocketProvider(ws);

    logger.info(
      this.numOfReconnects > 0
        ? `Reinitialized the WebSocketManager ${this.numOfReconnects} times`
        : `Initialized WebSocketManager`,
      this.constructor.name
    );

    this.refreshed = true;
  }

  /**
   * Checks if the this.constructor is initialized.
   *
   * @returns True if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.refreshed;
  }

  /**
   * Stops the WebSocket connection.
   */
  public stop() {
    if (this.provider) {
      this.provider.destroy();
    } else {
      logger.warn(
        "WebSocket connection is not initialized",
        this.constructor.name
      );
    }
  }
}

export { WebSocketManager };
