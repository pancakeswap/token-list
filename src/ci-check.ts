import { LISTS } from "./constants.js";

const compareLists = async (listName: string) => {
  const src = await Bun.file(`src/tokens/${listName}.json`).json();
  const actual = await Bun.file(`lists/${listName}.json`).json();

  // const { name, src, actual } = listPair;
  if (src.length !== actual.tokens.length) {
    throw Error(
      `List ${listName} seems to be not properly regenerated. Soure file has ${src.length} tokens but actual list has ${actual.tokens.length}. Did you forget to run yarn makelist?`
    );
  }
  src.sort((t1, t2) => (t1.address < t2.address ? -1 : 1));
  actual.tokens.sort((t1, t2) => (t1.address < t2.address ? -1 : 1));
  src.forEach((srcToken, index) => {
    if (JSON.stringify(srcToken) !== JSON.stringify(actual.tokens[index])) {
      throw Error(
        `List ${listName} seems to be not properly regenerated. Tokens from src/tokens directory don't match up with the final list. Did you forget to run yarn makelist?`
      );
    }
  });
};

/**
 * Check in CI that author properly updated token list
 * i.e. not just changed token list in src/tokens but also regenerated lists with yarn makelist command.
 * Github Action runs only on change in src/tokens directory.
 */
const ciCheck = async (): Promise<void> => {
  for (const listName in LISTS) {
    await compareLists(listName);
  }
};

export default ciCheck;
