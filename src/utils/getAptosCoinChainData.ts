import { fetchCoin, createClient, getDefaultProviders, FetchCoinResult } from "@pancakeswap/awgmi/core";

const client = createClient({
  provider: getDefaultProviders,
});
export async function getAptosCoinsChainData(addresses: string[]) {
  let coins: FetchCoinResult[] = [];
  for (const address of addresses) {
    const coin = await fetchCoin({ coin: address });
    coins.push(coin);
  }

  return coins;
}
