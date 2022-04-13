const {
    BN
} = require('@openzeppelin/test-helpers');
const utils = require("web3-utils");

export default function ether(n) {
    return new BN(utils.toWei(n.toString(), 'ether'));
}