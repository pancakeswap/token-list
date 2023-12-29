import path from "path";
import { getAddress, isAddress } from "@ethersproject/address";
import _ from "lodash";
import { erc20ABI } from "./utils/abi/erc20.js";
import { publicClients } from "./utils/publicClients.js";
import { Address } from "viem";

interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
}

const getTokens = async (listName: string): Promise<Token[]> => {
  const urls = {
    coingecko: "https://tokens.coingecko.com/binance-smart-chain/all.json",
    cmc: "https://s3.coinmarketcap.com/generated/dex/tokens/bsc-tokens-all.json",
  };
  const data = await fetch(urls[listName]);
  return (await data.json()).tokens;
};

const COINGEKKO_BAD_TOKENS = [
  "0x92a0d359c87b8f3fe383aa0a42c19d1a2afe6be0",
  "0xB1A1D06d42A43a8FCfDC7FDcd744f7eF03e8ad1a", // HKDAO
].map((a) => a.toLowerCase());

const CMC_BAD_TOKENS = [
  "0x6B8C76b277Eb34A22e24d603ef0448D9ad1c5a7d", // self destruct
  "0x58b8e295fc5b705bcbb48c5978b2b389332e0414", // unverified
  "0x6636F7B89f64202208f608DEFFa71293EEF7b466", // bad symbol
  "0xb8e3399d81b76362b76453799c95fee868c728ea", // bad symbol
  "0x92CfbEC26C206C90aeE3b7C66A9AE673754FaB7e", // unverified
  "0xdD53Ba070c0A177fb923984c3720eD07B1247078", // no a token
  "0xcFA52F180538032402E0A2E702a4Da6fD1817fF5", // no a token
  "0x199e5A83509F35CD5Eb38a2D28B56A7Cd658E337", // no a token
  "0xBb6CD639724417A20a7db0F45C1fb2fE532f490A", // no a token
  "0xCb73918ac58D0c90d71c7992637c61094c15305b", // self destruct
  "0xebd49b26169e1b52c04cfd19fcf289405df55f80", // ORBS old token
  "0xB1A1D06d42A43a8FCfDC7FDcd744f7eF03e8ad1a", // HKDAO
].map((a) => a.toLowerCase());

const badTokens = {
  coingecko: COINGEKKO_BAD_TOKENS,
  cmc: CMC_BAD_TOKENS,
};

// TODO: ideally we should also check on chain name, but if project wants to modify it for whatever reason
// we should respect that somehow too... I think good solution would be to have a separate map for "modified" names.
// Cause on chain everything is different and causes confusion
// For now names are just used as is here
const fetchThirdPartyList = async (listName: string): Promise<void> => {
  try {
    const rawTokens = await getTokens(listName);
    const tokens = rawTokens
      .filter(({ address }) => !badTokens[listName].includes(address.toLowerCase()))
      .filter((t) => t.chainId === 56); // only bsc for now
    const badDecimals = [];
    const badAddresses = [];
    const badSymbol = [];
    const badName = [];
    const duplicates = [];
    const invalidNameOrSymbol = [];

    const chunkSize = 200;
    const chunkArray = tokens.length >= chunkSize ? _.chunk(tokens, chunkSize) : [tokens];

    console.info("Total chunks: ", chunkArray.length);

    const realTokensDecimals = new Map();
    const realTokenSymbol = new Map();
    let currentChunk = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const chunk of chunkArray) {
      console.info(`Processing chunk ${++currentChunk} / ${chunkArray.length}`);
      const mapAddress = chunk.filter((token) => isAddress(token.address));
      badAddresses.push(...chunk.filter((token) => !isAddress(token.address)).map(({ address }) => address));

      // console.info(
      //   "Debug problematic addresses",
      //   mapAddress.map(({ address }) => address)
      // );
      // eslint-disable-next-line no-await-in-loop
      const tokenInfoResponse = await publicClients[56].multicall({
        allowFailure: true,
        contracts: mapAddress.flatMap(({ address }) => [
          {
            abi: erc20ABI,
            address: address as Address,
            functionName: "symbol",
          },
          {
            abi: erc20ABI,
            address: address as Address,
            functionName: "name",
          },
          {
            abi: erc20ABI,
            address: address as Address,
            functionName: "decimals",
          },
        ]),
      });

      mapAddress.forEach(({ address, name, symbol, decimals }, i) => {
        if (
          tokenInfoResponse[i * 3].status === "failure" ||
          tokenInfoResponse[i * 3 + 1].status === "failure" ||
          tokenInfoResponse[i * 3 + 2].status === "failure" ||
          tokenInfoResponse[i * 3] === null ||
          tokenInfoResponse[i * 3 + 1] === null ||
          tokenInfoResponse[i * 3 + 2] === null
        ) {
          badAddresses.push(address);
          return;
        }
        const realSymbol = tokenInfoResponse[i * 3].result;
        const realName = tokenInfoResponse[i * 3 + 1].result;
        const realDecimals = tokenInfoResponse[i * 3 + 2].result;
        if (!decimals || decimals !== realDecimals) {
          badDecimals.push({ decimals, realDecimals, address });
        }
        if (!name || name !== realName) {
          badName.push({ name, realName, address });
        }
        if (!symbol || symbol !== realSymbol) {
          badSymbol.push({ name, realSymbol, address });
        }
        realTokenSymbol.set(address, realSymbol);
        realTokensDecimals.set(address, realDecimals);
      });
    }

    const sanitizedTokens = tokens
      .filter((token, index, array) => {
        const isNotDuplicate = array.findIndex((t) => t.address === token.address || t.name === token.name) === index;
        if (!isNotDuplicate) duplicates.push(token);
        const hasValidSymbol = /^[a-zA-Z0-9+\-%/$]+$/.test(realTokenSymbol.get(token.address));
        const symbolIsOk =
          realTokenSymbol.get(token.address)?.length > 0 &&
          realTokenSymbol.get(token.address)?.length <= 20 &&
          hasValidSymbol;
        const nameIsOk = token.name.length > 0 && token.name.length <= 40;
        if (!symbolIsOk || !nameIsOk) invalidNameOrSymbol.push(token.address);
        return (
          isNotDuplicate && symbolIsOk && nameIsOk && isAddress(token.address) && !badAddresses.includes(token.address)
        );
      })
      .map((token) => {
        const checksummedAddress = getAddress(token.address);

        return {
          name: token.name,
          symbol: realTokenSymbol.get(token.address),
          address: checksummedAddress,
          chainId: token.chainId,
          decimals: realTokensDecimals.get(token.address),
          logoURI: token.logoURI,
        };
      });

    console.info(`About to save ${sanitizedTokens.length} tokens (original list has ${rawTokens.length})`);
    console.info(`Dropped: ${rawTokens.length - sanitizedTokens.length}`);
    console.info(`Bad decimals found: ${badDecimals.length}.`);
    console.info(`Bad names found: ${badName.length}.`);
    console.info(`Bad symbols found: ${badSymbol.length}.`);
    console.info(`Bad addresses found: ${badAddresses.length}`);
    console.info(`Duplicates found: ${duplicates.length}`);
    console.info(`Invalid name or symbosl: ${invalidNameOrSymbol.length}`);

    const tokenListPath = `${path.resolve()}/src/tokens/${listName}.json`;
    const tokenListFile = Bun.file(`/src/tokens/${listName}.json`);
    console.info("Saving updated list to ", tokenListFile);
    const stringifiedList = JSON.stringify(sanitizedTokens, null, 2);
    await Bun.write(tokenListPath, stringifiedList);
  } catch (error) {
    console.error(`Error when fetching ${listName} list, error: ${error.message}`, error);
  }
};

export default fetchThirdPartyList;
