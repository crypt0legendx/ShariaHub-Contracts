const {
    relayHub
} = require('@openzeppelin/gsn-helpers');

const expect = require('chai').use(require('chai-as-promised')).expect;

export default async function assertSentViaGSN(web3, txHash, opts = {}) {
    const abiDecoder = require('abi-decoder');
    abiDecoder.addABI(relayHub.abi);

    txHash = txHash.transactionHash ? txHash.transactionHash : txHash;
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    expect(receipt.to.toLowerCase()).to.eq(relayHub.address.toLowerCase());

    const logs = abiDecoder.decodeLogs(receipt.logs);
    const relayed = logs.find(log => log && log.name === 'TransactionRelayed');
    expect(relayed).to.exist;

    const from = relayed.events.find(e => e.name === 'from');
    if (opts.from) expect(from.value.toLowerCase()).to.eq(opts.from.toLowerCase());

    const to = relayed.events.find(e => e.name === 'to');
    if (opts.to) expect(to.value.toLowerCase()).to.eq(opts.to.toLowerCase());

    return receipt;
}