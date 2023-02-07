import { ethers } from "ethers";
import { Multicall as MulticallAbiType } from "./abi/types";
import MulticalAbi from "./abi/Multicall.json";
import simpleRpcProvider from "./simpleRpcProvider";

const multicall = {
  [1]: "0xcA11bde05977b3631167028862bE2a173976CA11",
  [56]: "0xcA11bde05977b3631167028862bE2a173976CA11",
};

interface MultiCall {
  address: string; // Address of the contract
  name: string; // Function name on the contract (example: balanceOf)
  params?: any[]; // Function params
}

interface MultiCallOptions {
  requireSuccess?: boolean;
}

/**
 * Multicall V2 uses the new "tryAggregate" function. It is different in 2 ways
 *
 * 1. If "requireSuccess" is false multicall will not bail out if one of the calls fails
 * 2. The return includes a boolean whether the call was successful e.g. [wasSuccessful, callResult]
 */
const multicallv2 = async <T = any>(
  abi: any[],
  calls: MultiCall[],
  options: MultiCallOptions = { requireSuccess: true },
  chainId: number = 56
): Promise<T> => {
  const { requireSuccess } = options;
  const multi = new ethers.Contract(multicall[chainId], MulticalAbi, simpleRpcProvider[chainId]) as MulticallAbiType;
  const itf = new ethers.utils.Interface(abi);

  const calldata = calls.map((call) => ({
    target: call.address.toLowerCase(),
    callData: itf.encodeFunctionData(call.name, call.params),
  }));
  const returnData = await multi.callStatic.tryAggregate(requireSuccess, calldata);
  const res = returnData.map((call, i) => {
    const [result, data] = call;
    if (data === "0x") {
      console.error(data, i, calls[i]);
    }
    try {
      return result && data !== "0x" ? itf.decodeFunctionResult(calls[i].name, data) : null;
    } catch {
      return null;
    }
  });

  return res as any;
};

export default multicallv2;
