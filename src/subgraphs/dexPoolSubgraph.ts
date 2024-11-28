import { BaseSubgraph } from "./baseSubgraph.js";
import { getTGPancakeSwapUrl, logger } from "../common.js";
import { Pool } from "../types.js";

/**
 * PSv3Subgraph is a class that provides methods to interact with the
 * PancakeSwap v3 subgraph developed by Messari.
 *
 * https://github.com/messari/subgraphs/tree/master/subgraphs/uniswap-v3-forks
 */
class DexPoolSubgraph extends BaseSubgraph {
  /**
   * Constructor for PSv3Subgraph.
   *
   * @param baseURL The base URL for the The Graph Node
   * @param name The subgraph name
   */
  constructor(url: string) {
    super(url);
  }

  protected customInit(): void {
    /* Define queries */
    this.addQuery(
      "pools",
      this.gql`
        query($size: Int!, $offset: Int!) {
          liquidityPools(
            first: $size
            skip: $offset
            orderBy: totalValueLockedUSD
            orderDirection: desc
          ) {
            id
            name
            symbol
            fees {
              feePercentage
              feeType
            }
            inputTokens {
              id
              name
              symbol
              decimals
            }
          }
        }
      `
    );
  }

  /**
   * Get pools with pagination.
   *
   * @param limit The maximum number of pools to fetch
   * @param numPagestoFetch The number of pages to fetch in parallel
   * @param pageSize The number of items to fetch per page
   * @returns A list of Pool objects.
   */
  public async getPools(
    limit: number = 27,
    numPagestoFetch: number = 1,
    pageSize: number = 27
  ): Promise<Pool[]> {
    const allPools: Pool[] = [];
    const uniquePoolIds = new Set<string>();
    const query = this.getQuery("pools");
    let skip = 0;
    let hasMore = true;
    let totalRecords = 0;

    logger.debug(
      `Getting pools. Parameters: {limit: ${limit}, numOfPagesPerCall: ${numPagestoFetch}, pageSize: ${pageSize}}`,
      this.constructor.name
    );

    while (hasMore && totalRecords < limit) {
      // Create an array of promises to fetch multiple pages in parallel
      const fetchPromises = [];
      for (let i = 0; i < numPagestoFetch; i++) {
        // Fetch numPagestoFetch pages in parallel
        fetchPromises.push(
          this.fetchData(query, {
            size: pageSize,
            offset: skip + i * pageSize,
          })
        );
      }

      let responses;
      try {
        // Wait for all fetches to complete
        responses = await Promise.all(fetchPromises);
      } catch (error) {
        logger.error(`Error fetching data: ${error}`, this.constructor.name);
        throw error;
      }

      // Process the responses
      let fetchedRecords = 0;
      for (const response of responses) {
        const pools = response.liquidityPools;
        for (const pool of pools) {
          if (!uniquePoolIds.has(pool.id)) {
            uniquePoolIds.add(pool.id);
            allPools.push(pool);
            totalRecords++;
            fetchedRecords++;
          }
        }
      }

      logger.debug(
        `Fetched ${fetchedRecords} records. Total records: ${totalRecords}`,
        this.constructor.name
      );

      // Update skip and check if more records need to be fetched
      skip += numPagestoFetch * pageSize;
      hasMore = fetchedRecords === numPagestoFetch * pageSize;
    }
    return allPools;
  }
}

export { DexPoolSubgraph };
