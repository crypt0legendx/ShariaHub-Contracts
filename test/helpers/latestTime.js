// Returns the time of the last mined block in seconds
export default async function latestTime() {
    let latestBlockNumber = await web3.eth.getBlockNumber()
    let latestBlock = await web3.eth.getBlock(latestBlockNumber)
    return latestBlock.timestamp
}