import { createPublicClient, http, Chain } from "viem";
import { arbitrum, base, bsc, mainnet, polygonZkEvm, zkSync } from "viem/chains";

export const linea = {
  id: 59_144,
  name: "Linea Mainnet",
  network: "linea-mainnet",
  nativeCurrency: { name: "Linea Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    infura: {
      http: ["https://linea-mainnet.infura.io/v3"],
      webSocket: ["wss://linea-mainnet.infura.io/ws/v3"],
    },
    default: {
      http: ["https://rpc.linea.build"],
      webSocket: ["wss://rpc.linea.build"],
    },
    public: {
      http: ["https://rpc.linea.build"],
      webSocket: ["wss://rpc.linea.build"],
    },
  },
  blockExplorers: {
    default: {
      name: "Etherscan",
      url: "https://lineascan.build",
    },
    etherscan: {
      name: "Etherscan",
      url: "https://lineascan.build",
    },
    blockscout: {
      name: "Blockscout",
      url: "https://explorer.linea.build",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 42,
    },
  },
  testnet: false,
} as const satisfies Chain;

export const opbnb = {
  id: 204,
  name: "opBNB Mainnet",
  network: "opbnb",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://opbnb-mainnet-rpc.bnbchain.org"],
    },
    public: {
      http: ["https://opbnb-mainnet-rpc.bnbchain.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "opBNBScan",
      url: "https://opbnbscan.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 512881,
    },
  },
} as const satisfies Chain;

export const scroll = {
  id: 534352,
  name: "Scroll Mainnet",
  network: "scroll",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.scroll.io"],
    },
    public: {
      http: ["https://rpc.scroll.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "scrollScan",
      url: "https://scrollscan.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 14,
    },
  },
} as const satisfies Chain;

export const publicClients = {
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: http("https://ethereum.publicnode.com"),
  }),
  [bsc.id]: createPublicClient({
    chain: bsc,
    transport: http("https://nodes.pancakeswap.info"),
  }),
  [polygonZkEvm.id]: createPublicClient({
    chain: polygonZkEvm,
    transport: http(),
  }),
  [zkSync.id]: createPublicClient({
    chain: zkSync,
    transport: http(),
  }),
  [arbitrum.id]: createPublicClient({
    chain: arbitrum,
    transport: http(),
  }),
  [linea.id]: createPublicClient({
    chain: linea,
    transport: http(),
  }),
  [base.id]: createPublicClient({
    chain: base,
    transport: http(),
  }),
  [opbnb.id]: createPublicClient({
    chain: opbnb,
    transport: http(),
  }),
  [scroll.id]: createPublicClient({
    chain: scroll,
    transport: http(),
  }),
};
