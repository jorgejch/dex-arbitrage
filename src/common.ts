import poolFactoryAbi from "./abis/pancakeSwapV3FactoryAbi.js";
import poolAbi from "./abis/pancakeSwapv3PoolAbi.js";
import aflabAbi from "./abis/flashLoanArbitrageAbi.js";

/**
 * Mostly static configuration values
 */
const config = {
  THE_GRAPH_PANCAKESWAP_MESSARI_SUBGRAPH_ID:
    "A1BC1hzDsK4NTeXBpKQnDBphngpYZAwDUF7dEBfa3jHK",
  THE_GRAPH_PANCAKESWAP_MESSARI_SUBGRAPH_BASE_URL:
    "https://gateway.thegraph.com",
  POOL_FACTORY_ADDRESS: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
  POOL_FACTORY_ABI: poolFactoryAbi,
  POOL_ABI: poolAbi,
  AFLAB_ABI: aflabAbi,
};

/**
 * Get the The Graph PancakeSwap Messari subgraph URL.
 *
 * @param apiKey The API key
 * @returns The The Graph PancakeSwap Messari subgraph URL
 */
const getTGPancakeSwapMessariUrl = (apiKey: string) => {
  return `${config.THE_GRAPH_PANCAKESWAP_MESSARI_SUBGRAPH_BASE_URL}/api/${apiKey}/subgraphs/id/${config.THE_GRAPH_PANCAKESWAP_MESSARI_SUBGRAPH_ID}`;
};
export { config, getTGPancakeSwapMessariUrl };
