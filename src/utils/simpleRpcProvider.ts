import { ethers } from "ethers";

const RPC_URL = "https://nodes.pancakeswap.info";
const ETH_RPC_URL = "https://cloudflare-eth.com";

const bscRpcProvider = new ethers.providers.StaticJsonRpcProvider(RPC_URL, 56);
const ethRpcProvider = new ethers.providers.StaticJsonRpcProvider(ETH_RPC_URL, 1);

const simpleRpcProvider = {
  [1]: ethRpcProvider,
  [56]: bscRpcProvider,
};

export default simpleRpcProvider;
