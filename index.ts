import { buildList, saveList, VersionBump } from "./src/buildList.js";
import checksumAddresses from "./src/checksum.js";
import ciCheck from "./src/ci-check.js";
import topTokens from "./src/top-100.js";
import fetchThirdPartyList from "./src/fetchThirdPartyList.js";
import { LISTS } from "./src/constants.js";
import { exec } from "child_process";
import { buildIndex } from "./src/buildIndex.js";

const command = process.argv[2];
const listName = process.argv[3];
const versionBump = process.argv[4];

function checkListName() {
  if (LISTS[listName as keyof typeof LISTS] === undefined) {
    throw new Error(`Unknown list: ${listName}. Please check src/constants.ts`);
  }
}

switch (command) {
  case "checksum":
    checkListName();
    await checksumAddresses(listName);
    break;
  case "generate":
    checkListName();
    await saveList(await buildList(listName, versionBump as VersionBump), listName);
    break;
  case "makelist":
    checkListName();
    await checksumAddresses(listName);
    await saveList(await buildList(listName, versionBump as VersionBump), listName);
    const proc = Bun.spawn({
      cmd: ["bun", "test", "-t", `${listName}`],
    });

    await proc.exited;
    if (proc.exitCode !== 0) {
      throw new Error(`Failed to generate list ${listName}`);
    }
    break;
  case "makeindex":
    await buildIndex(LISTS);
    break;
  case "fetch":
    checkListName();
    if (listName === "pcs-top-100") {
      await topTokens();
    }
    await fetchThirdPartyList(listName);
    break;
  case "ci-check":
    await ciCheck();
    break;
  default:
    console.info("Unknown command");
    break;
}
