import fs from "fs";
import path from "path";
import _ from "lodash";

import rawMiniExtended from "../rawAddresses/mini-extended.js";
import { publicClients } from "./publicClients.js";
import { Address } from "viem";
import { erc20ABI } from "./abi/erc20.js";

const rawLists = {
  "pcs-mini-extended": rawMiniExtended,
};

const getTokensChainData = async (listName: string, addressArray?: string[], chainId?: number): Promise<any[]> => {
  const isTest = addressArray && addressArray.length > 0;
  const tokens: Address[] = isTest ? addressArray : rawLists[listName];
  if (!tokens) {
    console.error("No raw address list found");
    return [];
  }

  const chunkSize = 200;
  const chunkArray = tokens.length >= chunkSize ? _.chunk(tokens, chunkSize) : [tokens];

  const tokensWithChainData = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const chunk of chunkArray) {
    const tokenInfoCalls = chunk.flatMap((address) => [
      {
        address,
        name: "symbol",
      },
      {
        address,
        name: "name",
      },
      {
        address,
        name: "decimals",
      },
    ]);

    const publicClient = publicClients[chainId as keyof typeof publicClients];
    // eslint-disable-next-line no-await-in-loop
    const tokenInfoResponse = await publicClient.multicall({
      allowFailure: true,
      contracts: chunk.flatMap((address) => [
        {
          abi: erc20ABI,
          address,
          functionName: "symbol",
        },
        {
          abi: erc20ABI,
          address,
          functionName: "name",
        },
        {
          abi: erc20ABI,
          address,
          functionName: "decimals",
        },
      ]),
    });
    // const tokenInfoResponse = await multicallv2(erc20, tokenInfoCalls, undefined, chainId);
    const data = chunk.map((address, i) => ({
      name: tokenInfoResponse?.[i * 3 + 1]?.result ?? "",
      symbol: tokenInfoResponse?.[i * 3]?.result ?? "",
      address,
      chainId,
      decimals: tokenInfoResponse[i * 3 + 2]?.result,
      logoURI: `https://assets-cdn.trustwallet.com/blockchains/smartchain/assets/${address}/logo.png`,
    }));
    tokensWithChainData.push(...data);
  }

  if (!isTest) {
    const tokenListPath = `${path.resolve()}/src/tokens/${listName}.json`;
    const stringifiedList = JSON.stringify(tokensWithChainData, null, 2);
    fs.writeFileSync(tokenListPath, stringifiedList);
    console.info("Generated token list source json to ", tokenListPath);
  }
  return tokensWithChainData;
};

export default getTokensChainData;
