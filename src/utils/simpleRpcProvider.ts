import { ethers } from "ethers";

const RPC_URL = "https://nodes.pancakeswap.info";
const ETH_RPC_URL = "https://cloudflare-eth.com";
const POLYGON_ZKEVM_RPC_URL = "https://f2562de09abc5efbd21eefa083ff5326.zkevm-rpc.com/";

const bscRpcProvider = new ethers.providers.StaticJsonRpcProvider(RPC_URL, 56);
const ethRpcProvider = new ethers.providers.StaticJsonRpcProvider(ETH_RPC_URL, 1);
const polygonZkevmRpcProvider = new ethers.providers.StaticJsonRpcProvider(POLYGON_ZKEVM_RPC_URL, 1101);

const simpleRpcProvider = {
  [1]: ethRpcProvider,
  [56]: bscRpcProvider,
  [1101]: polygonZkevmRpcProvider,
};

export default simpleRpcProvider;
