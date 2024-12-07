import { BaseSubgraph } from "./baseSubgraph.js";
import { getHoursSinceUnixEpoch, logger } from "../common.js";
import { Pool, LiquidityPoolHourlySnapshot } from "../types.js";

/**
 * DexPoolSubgraph is a class that provides methods to interact with the
 * DexPoolSubgraph v3 subgraph developed by Messari.
 *
 * https://github.com/messari/subgraphs/tree/master/subgraphs/uniswap-v3-forks
 */
interface FetchPoolsContext {
  uniquePoolIds: Set<string>;
  allPools: Pool[];
  totalRecords: number;
}

class DexPoolSubgraph extends BaseSubgraph {
  /**
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
      `
      query ($hoursSinceUnixEpoch: Int!, $size: Int!, $offset: Int!) {
      liquidityPoolHourlySnapshots(
        first: $size,
        skip: $offset,
        orderBy: hourlySwapCount,
        orderDirection: desc,
        where: { hour: $hoursSinceUnixEpoch }
      ) {
        pool {
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
      }
      `
    );
  }

  /**
   * Get pools with pagination.
   */
  public async getPools(
    limit = 100,
    numPagestoFetch = 10,
    pageSize = 10,
    hsUnixEpoch: number = getHoursSinceUnixEpoch()
  ): Promise<Pool[]> {
    const allPools: Pool[] = [];
    const uniquePoolIds = new Set<string>();
    let skip = 0;
    let hasMore = true;
    const context: FetchPoolsContext = {
      uniquePoolIds,
      allPools,
      totalRecords: 0,
    };

    logger.debug(
      `Getting pools. Parameters: {limit: ${limit}, numOfPagesPerCall: ${numPagestoFetch}, pageSize: ${pageSize}, hoursSinceUnixEpoch: ${hsUnixEpoch}}`,
      this.constructor.name
    );

    while (hasMore && context.totalRecords < limit) {
      try {
        const returnInfo = await this.fetchPoolPages(
          hsUnixEpoch,
          numPagestoFetch,
          pageSize,
          skip,
          limit,
          context
        );
        context.totalRecords += returnInfo.fetchedRecords;
        hasMore = returnInfo.hasMore;
        skip += numPagestoFetch * pageSize;
      } catch (error) {
        logger.error(`Error fetching data: ${error}`, this.constructor.name);
        throw error;
      }
    }
    return allPools;
  }

  /*
   * Fetches pools from the subgraph.
   *
   * @param hsUnixEpoch The hours since Unix Epoch
   * @param numPagestoFetch The number of pages to fetch
   * @param pageSize The page size
   * @param skip The number of records to skip
   * @param limit The maximum number of records to fetch
   * @param context The context object
   * @returns The number of fetched records and a boolean indicating if there are more records to fetch
   */
  private async fetchPoolPages(
    hsUnixEpoch: number,
    numPagestoFetch: number,
    pageSize: number,
    skip: number,
    limit: number,
    context: FetchPoolsContext
  ): Promise<{ fetchedRecords: number; hasMore: boolean }> {
    const query = this.getQuery("pools");
    const fetchPromises = [];
    for (let i = 0; i < numPagestoFetch; i++) {
      fetchPromises.push(
        this.fetchData(query, {
          hoursSinceUnixEpoch: hsUnixEpoch,
          size: pageSize,
          offset: skip + i * pageSize,
        })
      );
    }

    const responses = await Promise.all(fetchPromises);
    let fetchedRecords = 0;

    for (const response of responses) {
      if (!response) {
        throw new Error(`Invalid Response: ${JSON.stringify(response)}`);
      }

      const snapshots: LiquidityPoolHourlySnapshot[] =
        response.liquidityPoolHourlySnapshots;
      const pools: Pool[] = snapshots.map(
        (snapshot: LiquidityPoolHourlySnapshot) => snapshot.pool
      );

      for (const pool of pools) {
        if (!context.uniquePoolIds.has(pool.id)) {
          context.uniquePoolIds.add(pool.id);
          context.allPools.push(pool);
          fetchedRecords++;
          if (fetchedRecords >= limit) break;
        }
      }
    }

    logger.debug(`Fetched ${fetchedRecords} records.`, this.constructor.name);

    const hasMore =
      fetchedRecords === numPagestoFetch * pageSize &&
      context.totalRecords + fetchedRecords < limit;
    return { fetchedRecords, hasMore };
  }
}

export { DexPoolSubgraph };
