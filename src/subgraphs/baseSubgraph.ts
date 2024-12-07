import { logger } from "../common.js";
import {
  Client,
  cacheExchange,
  fetchExchange,
  OperationResult,
} from "@urql/core";

abstract class BaseSubgraph {
  private readonly subgraphUrl: string;
  private readonly client;
  private readonly queries = new Map<string, string>();

  constructor(subgraphUrl: string) {
    this.subgraphUrl = subgraphUrl;
    this.client = new Client({
      url: this.subgraphUrl,
      exchanges: [cacheExchange, fetchExchange],
    });
  }

  protected async fetchData(
    query: string,
    variables?: object 
  ): Promise<any> {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const result: OperationResult = await this.client.query(
          query,
          variables
        );
        if (result.error) {
          throw result.error;
        }
        return result.data;
      } catch (error: any) {
        attempts++;
        logger.warn(
          `Attempt ${attempts} failed: ${error}`,
          this.constructor.name
        );
        if (attempts >= maxRetries) {
          logger.error(
            `Error fetching data after ${attempts} attempts: ${error}`,
            this.constructor.name
          );
          throw new Error("Failed to fetch data, max retries exceeded");
        }
      }
    }

    // This should never be reached, but is here for completeness.
    throw new Error("Unexpected error in fetchData method");
  }

  protected abstract customInit(): void;

  public initialize() {
    this.customInit();
    logger.info(
      `Initialized subgraph: ${this.constructor.name}`,
      this.constructor.name
    );
  }

  public removeQuery(name: string): void {
    if (!this.queries.has(name)) {
      throw new Error(`Query ${name} not found`);
    }
    this.queries.delete(name);
  }

  public addQuery(name: string, query: string): void {
    this.queries.set(name, query);
  }

  public getQuery(name: string): string {
    if (!this.queries.has(name)) {
      throw new Error(`Query ${name} not found`);
    }
    return this.queries.get(name)!;
  }
}

export { BaseSubgraph };
