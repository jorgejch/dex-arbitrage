import { Graffle } from "graffle";
import { logger } from "../common.js";

/**
 * BaseSubgraph is an abstract class that provides methods to interact with a subgraph.
 * It includes methods to construct GraphQL queries and fetch data from the subgraph.
 */
abstract class BaseSubgraph {
  private readonly subgraphUrl: string;
  private graffle!: {
    gql: (query: TemplateStringsArray) => {
      send: (variables?: object) => Promise<any>;
    };
  };
  private readonly queries = new Map<
    string,
    { send: (variables?: object) => Promise<any> }
  >();

  /**
   * @param subgraphUrl The subgraph URL
   */
  constructor(subgraphUrl: string) {
    this.subgraphUrl = subgraphUrl;
  }

  protected getUrl(): string {
    return this.subgraphUrl;
  }

  /**
   * @param query The GraphQL query
   * @returns {Promise<any>} The data
   */
  protected async fetchData(
    query: { send: (variables?: object) => Promise<any> },
    variables?: object
  ): Promise<unknown> {
    const maxRetries = 3;
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        if (variables) {
          return await query.send(variables);
        } else {
          return await query.send();
        }
      } catch (error) {
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
    throw new Error("Unexpected error in fetchData method");
  }

  /**
   * Custom initialization method.
   *
   * This method should be implemented by the subclass.
   * It is called after the Graffle instance is created.
   */
  protected abstract customInit(): void;

  /**
   * Initializes the subgraph.
   */
  public initialize() {
    this.graffle = Graffle.create({ schema: this.subgraphUrl });
    if (!this.graffle) {
      throw new Error("Failed to initialize Graffle");
    }
    this.customInit();
    logger.info(
      `Initialized subgraph: ${this.constructor.name}`,
      this.constructor.name
    );
  }

  /**
   * Remove a query from the subgraph.
   *
   * @param name The query name
   */
  public removeQuery(name: string): void {
    if (!this.queries.has(name)) {
      throw new Error(`Query ${name} not found`);
    }
    this.queries.delete(name);
  }

  /**
   * Add a query to the subgraph.
   *
   * @param name The query name
   * @param query The query template string
   */
  public addQuery(
    name: string,
    query: { send: (variables?: {}) => Promise<unknown> }
  ): void {
    this.queries.set(name, query);
  }

  public getQuery(name: string): { send: (variables?: {}) => Promise<unknown> } {
    if (!this.queries.has(name)) {
      throw new Error(`Query ${name} not found`);
    }
    const query = this.queries.get(name);

    if (query?.send === undefined) {
      throw new Error(`Query ${name} is invalid`);
    }

    return this.queries.get(name)!;
  }

  /**
   * @returns {Function} A function to construct GraphQL queries
   */
  public get gql(): (query: TemplateStringsArray) => {
    send: (variables?: {}) => Promise<any>;
  } {
    if (!this.graffle) {
      throw new Error("Graffle instance is not initialized");
    }
    return this.graffle.gql;
  }
}

export { BaseSubgraph };
