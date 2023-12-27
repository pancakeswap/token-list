/* eslint-disable no-restricted-syntax */
import Ajv from "ajv";
import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { getAddress } from "@ethersproject/address";
// import pancakeswapSchema from "@pancakeswap/token-lists/schema/pancakeswap.json";
import pancakeswapSchema from "./schema.json"; // TODO: exports path
import { groupBy } from "lodash";
import { buildList, VersionBump } from "../src/buildList.js";
import getTokenChainData from "../src/utils/getTokensChainData.js";
import { getAptosCoinsChainData } from "../src/utils/getAptosCoinChainData.js";
import { LISTS } from "../src/constants.js";
import { arbitrum, base, bsc, mainnet, polygonZkEvm, zkSync } from "viem/chains";
import { linea, opbnb } from "../src/utils/publicClients.js";

const CASES = Object.entries(LISTS).map(([key, value]) =>
  "test" in value ? ([key, value.test] as const) : ([key] as const)
);

const cases = CASES;

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

const multiChainLogoPath = {
  [bsc.id]: "",
  [mainnet.id]: "/eth",
  [polygonZkEvm.id]: "/polygon-zkevm",
  [zkSync.id]: "/zksync",
  [arbitrum.id]: "/arbitrum",
  [linea.id]: "/linea",
  [base.id]: "/base",
  [opbnb.id]: "/opbnb",
};

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

// declare global {
//   // eslint-disable-next-line @typescript-eslint/no-namespace
//   namespace jest {
//     interface Matchers<R> {
//       toBeDeclaredOnce(type: string, parameter: string, chainId: number): CustomMatcherResult;
//       toBeValidTokenList(): CustomMatcherResult;
//       toBeValidLogo(): CustomMatcherResult;
//     }
//   }
// }

// expect.extend({
//   toBeDeclaredOnce,
//   toBeValidTokenList,
//   toBeValidLogo,
// });

function toBeDeclaredOnce(received, type: string, parameter: string, chainId: number) {
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
}

const toBeValidLogo = async (token) => {
  // TW logos are always checksummed
  const hasTWLogo =
    token.logoURI === `https://assets-cdn.trustwallet.com/blockchains/smartchain/assets/${token.address}/logo.png`;
  let hasLocalLogo = false;
  const refersToLocalLogo =
    token.logoURI ===
    `https://tokens.pancakeswap.finance/images${multiChainLogoPath?.[token.chainId] || ""}/${token.address}.png`;
  if (refersToLocalLogo) {
    const fileName = token.logoURI.split("/").pop();
    // Note: fs.existsSync can't be used here because its not case sensetive
    hasLocalLogo = await Bun.file(`lists/images${multiChainLogoPath?.[token.chainId] || ""}/${fileName}`).exists();
    // hasLocalLogo = multiChainLogoFiles[token.chainId]?.map((f) => f.name).includes(fileName);
  }

  if (token.logoURI === `https://tokens.pancakeswap.finance/images/symbol/${token.symbol.toLowerCase()}.png`) {
    return {
      message: () => ``,
      pass: true,
    };
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
};

function toBeValidTokenList(tokenList) {
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
}

const currentLists = {};

for (const _case of cases) {
  const [listName] = _case;
  currentLists[listName] = await Bun.file(`lists/${listName}.json`).json();
}

describe("global test", () => {
  it("all logos addresses are valid and checksummed", async () => {
    for (const path_ of Object.values(multiChainLogoPath)) {
      const logoFiles = fs
        .readdirSync(path.join(path.resolve(), "lists", "images", path_), { withFileTypes: true })
        .filter((f) => f.isFile())
        .filter((f) => !/(^|\/)\.[^\/\.]/g.test(f.name));

      for (const logo of logoFiles) {
        const sanitizedLogo = logo.name.split(".")[0];
        expect(sanitizedLogo).toBe(getAddress(sanitizedLogo));
      }
    }
  });
});

describe.each(cases)("buildList %s", async (listName, opt: any) => {
  const defaultTokenList = await buildList(listName);
  it("validates", () => {
    const build = toBeValidTokenList(defaultTokenList);

    if (!build.pass) {
      throw new Error(build.message());
    }

    expect(build.pass).toBeTrue();
  });

  it("contains no duplicate addresses", () => {
    const map = {};
    for (const token of defaultTokenList.tokens) {
      const key = `${token.chainId}-${token.address.toLowerCase()}`;
      expect(toBeDeclaredOnce(map[key], "address", token.address.toLowerCase(), token.chainId).pass).toBeTrue();
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

      expect(toBeDeclaredOnce(map[key], "name", token.name, token.chainId).pass).toBeTrue();
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

  it("all tokens have correct logos", async () => {
    if (!opt || !opt.skipLogo) {
      for (const token of defaultTokenList.tokens) {
        const got = await toBeValidLogo(token);
        expect(got.pass).toBe(true);
      }
    } else {
      expect(true).toBe(true);
    }
  });

  it(
    "all tokens have correct decimals",
    async () => {
      const addressArray = defaultTokenList.tokens.map((token) => token.address);
      const chainId = defaultTokenList.tokens[0].chainId ?? 56;
      if (opt?.aptos === true) {
        // TODO: skip aptos test for now
        // const coinsData = await getAptosCoinsChainData(addressArray);
        // for (const token of defaultTokenList.tokens) {
        //   const coinData = coinsData.find((t) => t.address === token.address);
        //   expect(token.decimals).toBeGreaterThanOrEqual(0);
        //   expect(token.decimals).toBeLessThanOrEqual(30); // should be much more less
        //   expect(token.decimals).toEqual(coinData?.decimals);
        //   expect(APTOS_COIN_ALIAS[token.symbol] || token.symbol).toEqual(coinData?.symbol);
        // }
      } else {
        const groupByChainId = groupBy(defaultTokenList.tokens, (x) => x.chainId);
        for (const [chainId, tokens] of Object.entries(groupByChainId)) {
          const tokensChainData = await getTokenChainData(
            "test",
            tokens.map((t) => t.address),
            Number(chainId)
          );
          for (const token of tokens) {
            const realDecimals = tokensChainData.find(
              (t) => t.address.toLowerCase() === token.address.toLowerCase()
            )?.decimals;
            expect(token.decimals).toBeGreaterThanOrEqual(0);
            expect(token.decimals).toBeLessThanOrEqual(255);
            expect(token.decimals).toEqual(realDecimals);
          }
        }
      }
    },
    {
      timeout: 20000,
    }
  );

  it("version gets patch bump if no versionBump specified", () => {
    expect(defaultTokenList.version.major).toBe(currentLists[listName].version.major);
    expect(defaultTokenList.version.minor).toBe(currentLists[listName].version.minor);
    expect(defaultTokenList.version.patch).toBe(currentLists[listName].version.patch + 1);
  });

  it("version gets patch bump if patch versionBump is specified", async () => {
    const defaultTokenListPatchBump = await buildList(listName, VersionBump.patch);
    expect(defaultTokenListPatchBump.version.major).toBe(currentLists[listName].version.major);
    expect(defaultTokenListPatchBump.version.minor).toBe(currentLists[listName].version.minor);
    expect(defaultTokenListPatchBump.version.patch).toBe(currentLists[listName].version.patch + 1);
  });

  it("version gets minor bump if minor versionBump is specified", async () => {
    const defaultTokenListMinorBump = await buildList(listName, VersionBump.minor);
    expect(defaultTokenListMinorBump.version.major).toBe(currentLists[listName].version.major);
    expect(defaultTokenListMinorBump.version.minor).toBe(currentLists[listName].version.minor + 1);
    expect(defaultTokenListMinorBump.version.patch).toBe(currentLists[listName].version.patch);
  });

  it("version gets minor bump if major versionBump is specified", async () => {
    const defaultTokenListMajorBump = await buildList(listName, VersionBump.major);
    expect(defaultTokenListMajorBump.version.major).toBe(currentLists[listName].version.major + 1);
    expect(defaultTokenListMajorBump.version.minor).toBe(currentLists[listName].version.minor);
    expect(defaultTokenListMajorBump.version.patch).toBe(currentLists[listName].version.patch);
  });
});
