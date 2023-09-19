import { TokenList } from "@pancakeswap/token-lists";
import { LISTS } from "./constants.js";

export enum VersionBump {
  "major" = "major",
  "minor" = "minor",
  "patch" = "patch",
}

type Version = {
  major: number;
  minor: number;
  patch: number;
};

const getNextVersion = (currentVersion: Version, versionBump?: VersionBump) => {
  const { major, minor, patch } = currentVersion;
  switch (versionBump) {
    case VersionBump.major:
      return { major: major + 1, minor, patch };
    case VersionBump.minor:
      return { major, minor: minor + 1, patch };
    case VersionBump.patch:
    default:
      return { major, minor, patch: patch + 1 };
  }
};

export const buildList = async (listName: string, versionBump?: VersionBump): Promise<TokenList> => {
  const { name, keywords, logoURI, sort } = LISTS[listName as keyof typeof LISTS];
  const { version: currentVersion } = await Bun.file(`lists/${listName}.json`).json();
  const version = getNextVersion(currentVersion, versionBump);
  const list = await Bun.file(`src/tokens/${listName}.json`).json();
  return {
    name,
    timestamp: new Date().toISOString(),
    version,
    logoURI,
    keywords: keywords as unknown as TokenList["keywords"],
    // @ts-ignore
    schema: "schema" in LISTS[listName] ? LISTS[listName].schema : undefined,
    // sort them by symbol for easy readability (not applied to default list)
    tokens: sort
      ? list.sort((t1, t2) => {
        if (t1.chainId === t2.chainId) {
          // CAKE first in extended list
          if ((t1.symbol === "CAKE") !== (t2.symbol === "CAKE")) {
            return t1.symbol === "CAKE" ? -1 : 1;
          }
          return t1.symbol.toLowerCase() < t2.symbol.toLowerCase() ? -1 : 1;
        }
        return t1.chainId < t2.chainId ? -1 : 1;
      })
      : list,
  };
};

export const saveList = async (tokenList: TokenList, listName: string): Promise<void> => {
  const tokenListFile = Bun.file(new URL(`../lists/${listName}.json`, import.meta.url).pathname);
  const stringifiedList = JSON.stringify(tokenList, null, 2);
  await Bun.write(tokenListFile, stringifiedList);
  console.info("Token list saved to ", tokenListFile);
};
