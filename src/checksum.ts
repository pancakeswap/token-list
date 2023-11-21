import { getAddress } from "@ethersproject/address";

const checksumAddresses = async (listName: string): Promise<void> => {
  let badChecksumCount = 0;
  if (listName === "pancakeswap-aptos") {
    console.info("Ignore Aptos address checksum");
    return;
  }
  const file = Bun.file(`src/tokens/${listName}.json`);
  const listToChecksum = await file.json();

  const updatedList = listToChecksum.reduce((tokenList, token) => {
    const checksummedAddress = getAddress(token.address);
    if (checksummedAddress !== token.address) {
      badChecksumCount += 1;
      const updatedToken = { ...token, address: checksummedAddress };
      return [...tokenList, updatedToken];
    }
    return [...tokenList, token];
  }, []);

  if (badChecksumCount > 0) {
    console.info(`Found and fixed ${badChecksumCount} non-checksummed addreses`);
    const file = Bun.file(`src/tokens/${listName}.json`);
    console.info("Saving updated list");
    const stringifiedList = JSON.stringify(updatedList, null, 2);
    await Bun.write(file, stringifiedList);
    console.info("Checksumming done!");
  } else {
    console.info("All addresses are already checksummed");
  }
};

export default checksumAddresses;
