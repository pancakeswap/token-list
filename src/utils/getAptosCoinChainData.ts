import { FetchCoinResult, mainnet, wrapCoinInfoTypeTag } from "@pancakeswap/awgmi/core";
import { AptosClient } from "aptos";

const aptos = new AptosClient(mainnet.nodeUrls.default);

export async function getAptosCoinsChainData(addresses: string[]) {
  let coins: FetchCoinResult[] = [];
  for (const address of addresses) {
    const [coinAccountAddress] = address.split("::");
    const coinResource = await aptos.getAccountResource(coinAccountAddress, wrapCoinInfoTypeTag(address));
    const { decimals = 18, symbol, name, supply: _supply } = coinResource.data as any;
    coins.push({
      address: address,
      decimals,
      symbol,
      name,
    });
  }

  return coins;
}
