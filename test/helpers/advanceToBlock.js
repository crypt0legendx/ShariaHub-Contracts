export async function advanceBlock() {
    // First we increase the time
    await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [Date.now()],
        id: 0,
      }, () => {});

      // Then we mine a block to actually get the time change to occurs
      // See this issue: https://github.com/trufflesuite/ganache-cli/issues/394
      await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: 0,
      }, () => {});
}

// Advances the block number so that the last mined block is `number`.
export default async function advanceToBlock(number) {
    // First we increase the time
    await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [number],
        id: 0,
      }, () => {});

      // Then we mine a block to actually get the time change to occurs
      // See this issue: https://github.com/trufflesuite/ganache-cli/issues/394
      await web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: 0,
      }, () => {});
}