import { Graffle } from "graffle";
/**
 * BaseSubgraph is an abstract class that provides methods to interact with a subgraph.
 * It includes methods to construct GraphQL queries and fetch data from the subgraph.
 */
abstract class BaseSubgraph {
  private subgraphUrl: string;
  private graffle!: {
    gql: (query: TemplateStringsArray) => { send: () => Promise<any> };
  };

  /**
   * @param subgraphUrl The subgraph URL
   */
  constructor(subgraphUrl: string) {
    this.subgraphUrl = subgraphUrl;
  }

  /**
   * @param query The GraphQL query
   * @returns {Promise<any>} The data
   */
  protected async fetchData(query: { send: () => Promise<any> }): Promise<any> {
      const maxRetries = 3;
      let attempts = 0;
      while (attempts < maxRetries) {
        try {
          const data = query.send();
          return data;
        } catch (error) {
          attempts++;
          console.warn(`Attempt ${attempts} failed: ${error}`);
          if (attempts >= maxRetries) {
            console.error(
            `Error fetching data after ${attempts} attempts: ${error}`
            );
        }
      }
    }
    throw new Error("Unexpected error in fetchData method");
  }

  /**
   * @returns {Function} A function to construct GraphQL queries
   */
  protected get gql(): (query: TemplateStringsArray) => {
    send: () => Promise<any>;
  } {
    return this.graffle.gql;
  }

  /**
   * Initializes the subgraph.
   */
  public initialize() {
    this.graffle = Graffle.create({ schema: this.subgraphUrl });
    if (!this.graffle) {
      throw new Error("Failed to initialize Graffle");
    }
  }
}

export { BaseSubgraph };
