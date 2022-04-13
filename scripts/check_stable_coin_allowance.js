require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
let mnemonic = process.env.KOVAN_MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://kovan.Shariahub.com"));
var BN = web3.BN;
const utils = require("web3-utils");
const loader = require('./contract_loader.js');

var account = process.env.KOVAN_ACCOUNT

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " <owner> <spender>");
    process.exit(-1);
}

var owner = process.argv[2];
var spender = process.argv[3];

console.log("owner: " + owner)
console.log("spender: " + spender)


loader.load(web3, 'MockStableCoin', '0x0229b17ac50ca6cd4b0b10e3806a45fbe5e76dc7').then(async (stableCoin) => {

    var response = await stableCoin.methods.allowance(owner, spender).call({
        from: account,
    });
    console.log(response);

    return '';

});
