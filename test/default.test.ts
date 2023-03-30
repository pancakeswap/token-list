/* eslint-disable no-restricted-syntax */
import Ajv from "ajv";
import fs from "fs";
import path from "path";
import { getAddress } from "@ethersproject/address";
import pancakeswapSchema from "@pancakeswap/token-lists/schema/pancakeswap.json";
import currentPancakeswapDefaultList from "../lists/pancakeswap-default.json";
import currentPancakeswapEthDefaultList from "../lists/pancakeswap-eth-default.json";
import currentPancakeswapEthMMList from "../lists/pancakeswap-eth-mm.json";
import currentPancakeswapBnbMMList from "../lists/pancakeswap-bnb-mm.json";
import currentPancakeswapExtendedtList from "../lists/pancakeswap-extended.json";
import currentPancakeswapTop15List from "../lists/pancakeswap-top-15.json";
import currentPancakeswapTop100tList from "../lists/pancakeswap-top-100.json";
import currentCoingeckoList from "../lists/coingecko.json";
import currentCmcList from "../lists/cmc.json";
import currentPancakeswapMiniList from "../lists/pancakeswap-mini.json";
import currentPancakeswapMiniExtendedList from "../lists/pancakeswap-mini-extended.json";
import currentPancakeswapAptosList from "../lists/pancakeswap-aptos.json";
import { buildList, VersionBump } from "../src/buildList";
import getTokenChainData from "../src/utils/getTokensChainData";
import { getAptosCoinsChainData } from "../src/utils/getAptosCoinChainData";

const listArgs = process.argv
  ?.find((arg) => arg.includes("--list="))
  ?.split("--list=")
  .pop();

const CASES = [
  ["pancakeswap-default"],
  ["pancakeswap-eth-default"],
  ["pancakeswap-eth-mm"],
  ["pancakeswap-extended"],
  ["pancakeswap-top-100"],
  ["pancakeswap-top-15"],
  ["coingecko", { skipLogo: true, aptos: false }],
  ["cmc", { skipLogo: true, aptos: false }],
  ["pancakeswap-mini"],
  ["pancakeswap-mini-extended"],
  ["pancakeswap-aptos", { skipLogo: true, aptos: true }],
  ["pancakeswap-bnb-mm"],
] as const;

const cases = listArgs ? CASES.filter((c) => c[0] === listArgs) : CASES;

const currentLists = {
  "pancakeswap-default": currentPancakeswapDefaultList,
  "pancakeswap-eth-mm": currentPancakeswapEthMMList,
  "pancakeswap-bnb-mm": currentPancakeswapBnbMMList,
  "pancakeswap-eth-default": currentPancakeswapEthDefaultList,
  "pancakeswap-extended": currentPancakeswapExtendedtList,
  "pancakeswap-top-100": currentPancakeswapTop100tList,
  "pancakeswap-top-15": currentPancakeswapTop15List,
  coingecko: currentCoingeckoList,
  cmc: currentCmcList,
  "pancakeswap-mini": currentPancakeswapMiniList,
  "pancakeswap-mini-extended": currentPancakeswapMiniExtendedList,
  "pancakeswap-aptos": currentPancakeswapAptosList,
};

const APTOS_COIN_ALIAS = {
  CAKE: "Cake",
  ceBNB: "BNB",
  ceBUSD: "BUSD",
  ceDAI: "DAI",
  ceUSDC: "USDC",
  ceUSDT: "USDT",
  ceWBTC: "WBTC",
  ceWETH: "WETH",
  lzUSDC: "USDC",
  lzUSDT: "USDT",
  lzWETH: "WETH",
  whBUSD: "BUSD",
  whUSDC: "USDC",
  whUSDT: "USDT",
  whWETH: "WETH",
};

const ajv = new Ajv({ allErrors: true, format: "full" });
const validate = ajv.compile(pancakeswapSchema);

const pathToImages = path.join(path.resolve(), "lists", "images");
const pathToEthImages = path.join(path.resolve(), "lists", "images", "eth");

const logoFiles = fs
  .readdirSync(pathToImages, { withFileTypes: true })
  .filter((f) => f.isFile())
  .filter((f) => !/(^|\/)\.[^\/\.]/g.test(f.name));

const ethLogoFiles = fs
  .readdirSync(pathToEthImages, { withFileTypes: true })
  .filter((f) => f.isFile())
  .filter((f) => !/(^|\/)\.[^\/\.]/g.test(f.name));

// Modified https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
const getByAjvPath = (obj, propertyPath: string, defaultValue = undefined) => {
  const travel = (regexp) =>
    String.prototype.split
      .call(propertyPath.substring(1), regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeDeclaredOnce(type: string, parameter: string, chainId: number): CustomMatcherResult;
      toBeValidTokenList(): CustomMatcherResult;
      toBeValidLogo(): CustomMatcherResult;
    }
  }
}

expect.extend({
  toBeDeclaredOnce(received, type: string, parameter: string, chainId: number) {
    if (typeof received === "undefined") {
      return {
        message: () => ``,
        pass: true,
      };
    }
    return {
      message: () => `Token ${type} ${parameter} on chain ${chainId} should be declared only once.`,
      pass: false,
    };
  },
  toBeValidTokenList(tokenList) {
    const isValid = validate(tokenList);
    if (isValid) {
      return {
        message: () => ``,
        pass: true,
      };
    }

    const validationSummary = validate.errors
      ?.map((error) => {
        const value = getByAjvPath(tokenList, error.dataPath);
        return `- ${error.dataPath.split(".").pop()} ${value} ${error.message}`;
      })
      .join("\n");
    return {
      message: () => `Validation failed:\n${validationSummary}`,
      pass: false,
    };
  },
  toBeValidLogo(token) {
    // TW logos are always checksummed
    const hasTWLogo =
      token.logoURI === `https://assets-cdn.trustwallet.com/blockchains/smartchain/assets/${token.address}/logo.png`;
    let hasLocalLogo = false;
    const refersToLocalLogo =
      token.logoURI === `https://tokens.pancakeswap.finance/images/${token.address}.png` ||
      token.logoURI === `https://tokens.pancakeswap.finance/images/eth/${token.address}.png`;
    if (refersToLocalLogo) {
      const fileName = token.logoURI.split("/").pop();
      // Note: fs.existsSync can't be used here because its not case sensetive
      hasLocalLogo =
        logoFiles.map((f) => f.name).includes(fileName) || ethLogoFiles.map((f) => f.name).includes(fileName);
    }
    if (hasTWLogo || hasLocalLogo) {
      return {
        message: () => ``,
        pass: true,
      };
    }
    return {
      message: () => `Token ${token.symbol} (${token.address}) has invalid logo: ${token.logoURI}`,
      pass: false,
    };
  },
});

describe.each(cases)("buildList %s", (listName, opt = undefined) => {
  const defaultTokenList = buildList(listName);
  it("validates", () => {
    expect(defaultTokenList).toBeValidTokenList();
  });

  it("contains no duplicate addresses", () => {
    const map = {};
    for (const token of defaultTokenList.tokens) {
      const key = `${token.chainId}-${token.address.toLowerCase()}`;
      expect(map[key]).toBeDeclaredOnce("address", token.address.toLowerCase(), token.chainId);
      map[key] = true;
    }
  });

  // Commented out since we now have duplicate symbols ("ONE") on exchange
  // doesn't seem to affect any functionality at the moment though
  // it("contains no duplicate symbols", () => {
  //   const map = {};
  //   for (const token of defaultTokenList.tokens) {
  //     const key = `${token.chainId}-${token.symbol.toLowerCase()}`;
  //     expect(map[key]).toBeDeclaredOnce("symbol", token.symbol.toLowerCase(), token.chainId);
  //     map[key] = true;
  //   }
  // });

  it("contains no duplicate names", () => {
    const map = {};
    for (const token of defaultTokenList.tokens) {
      const key = `${token.chainId}-${token.name}`;
      expect(map[key]).toBeDeclaredOnce("name", token.name, token.chainId);
      map[key] = true;
    }
  });

  it("all addresses are valid and checksummed", () => {
    if (!opt || !opt.aptos) {
      for (const token of defaultTokenList.tokens) {
        expect(token.address).toBe(getAddress(token.address));
      }
    }
  });

  it("all logos addresses are valid and checksummed", async () => {
    if (!opt || !opt.skipLogo) {
      for (const logo of logoFiles) {
        const sanitizedLogo = logo.name.split(".")[0];
        expect(sanitizedLogo).toBe(getAddress(sanitizedLogo));
      }
    }
  });

  it("all tokens have correct logos", () => {
    if (!opt || !opt.skipLogo) {
      for (const token of defaultTokenList.tokens) {
        expect(token).toBeValidLogo();
      }
    }
  });

  it("all tokens have correct decimals", async () => {
    const addressArray = defaultTokenList.tokens.map((token) => token.address);
    const chainId = defaultTokenList.tokens[0].chainId ?? 56;
    if (opt?.aptos === true) {
      const coinsData = await getAptosCoinsChainData(addressArray);
      for (const token of defaultTokenList.tokens) {
        const coinData = coinsData.find((t) => t.address === token.address);
        expect(token.decimals).toBeGreaterThanOrEqual(0);
        expect(token.decimals).toBeLessThanOrEqual(30); // should be much more less
        expect(token.decimals).toEqual(coinData?.decimals);
        expect(APTOS_COIN_ALIAS[token.symbol] || token.symbol).toEqual(coinData?.symbol);
      }
    } else {
      const tokensChainData = await getTokenChainData("test", addressArray, chainId);
      for (const token of defaultTokenList.tokens) {
        const realDecimals = tokensChainData.find(
          (t) => t.address.toLowerCase() === token.address.toLowerCase()
        )?.decimals;
        expect(token.decimals).toBeGreaterThanOrEqual(0);
        expect(token.decimals).toBeLessThanOrEqual(255);
        expect(token.decimals).toEqual(realDecimals);
      }
    }
  });

  it("version gets patch bump if no versionBump specified", () => {
    expect(defaultTokenList.version.major).toBe(currentLists[listName].version.major);
    expect(defaultTokenList.version.minor).toBe(currentLists[listName].version.minor);
    expect(defaultTokenList.version.patch).toBe(currentLists[listName].version.patch + 1);
  });

  it("version gets patch bump if patch versionBump is specified", () => {
    const defaultTokenListPatchBump = buildList(listName, VersionBump.patch);
    expect(defaultTokenListPatchBump.version.major).toBe(currentLists[listName].version.major);
    expect(defaultTokenListPatchBump.version.minor).toBe(currentLists[listName].version.minor);
    expect(defaultTokenListPatchBump.version.patch).toBe(currentLists[listName].version.patch + 1);
  });

  it("version gets minor bump if minor versionBump is specified", () => {
    const defaultTokenListMinorBump = buildList(listName, VersionBump.minor);
    expect(defaultTokenListMinorBump.version.major).toBe(currentLists[listName].version.major);
    expect(defaultTokenListMinorBump.version.minor).toBe(currentLists[listName].version.minor + 1);
    expect(defaultTokenListMinorBump.version.patch).toBe(currentLists[listName].version.patch);
  });

  it("version gets minor bump if major versionBump is specified", () => {
    const defaultTokenListMajorBump = buildList(listName, VersionBump.major);
    expect(defaultTokenListMajorBump.version.major).toBe(currentLists[listName].version.major + 1);
    expect(defaultTokenListMajorBump.version.minor).toBe(currentLists[listName].version.minor);
    expect(defaultTokenListMajorBump.version.patch).toBe(currentLists[listName].version.patch);
  });
});
