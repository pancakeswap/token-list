export const getTokenUrl = ({address, chainId}: {address: string, chainId: number}): string => {
  if (chainId === 56) {
    return `https://tokens.pancakeswap.finance/images/${address}.png`
  }
  return `https://tokens.pancakeswap.finance/images/${chainId}/${address}.png`
}