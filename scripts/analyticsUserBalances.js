require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();
let fs = require('fs')
var PrivateKeyProvider = require("truffle-privatekey-provider");
var Web3 = require('web3');
var web3 = new Web3(new PrivateKeyProvider(process.env.PK, "https://chain.Shariahub.com"));
var BN = web3.utils.BN;
const utils = require("web3-utils");
const loader = require('./contract_loader.js');
let walletAndBalances = require('../data/dai-balances-24-9-20.json')
const path = require('path');
let results = []




async function getAnalytics() {
    var balances = walletAndBalances.map(x => {
        return new BN(x.balance)
    }).filter(x => !x.isZero())
    console.log('wallets != 0', balances.length)
    let minDAI = '20'
    let minimumToBridge = new BN(web3.utils.toWei(minDAI, 'ether'))

    balances = balances.filter(x => x.gte(minimumToBridge))
    console.log(`wallets bigger than ${minDAI} DAI`, balances.length)

    let total = balances.reduce((acc, val) => acc.add(val))
    console.log('total',  web3.utils.fromWei(total.toString(), 'ether'), 'DAI')
    const { min, max } = balances.reduce((accumulator, currentValue) => {
        return {
            min: BN.min(currentValue, accumulator.min), 
            max: BN.max(currentValue, accumulator.max)
        }
    }, {max: new BN('0'), min: new BN(`${Number.MAX_VALUE}`) })
    console.log('min', web3.utils.fromWei(min.toString(), 'ether'), 'DAI')
    console.log('max', web3.utils.fromWei(max.toString(), 'ether'), 'DAI')
    let gas = new BN('300000')
    let price = new BN(web3.utils.toWei('150', 'gwei'))
    let ethCost = gas.mul(price).mul(new BN(`${balances.length}`))
    let ethPriceUSD = new BN('350')
    let usdCost = ethCost.mul(ethPriceUSD)
    console.log('estimated costs', web3.utils.fromWei(ethCost.toString(), 'ether'), 'ETH')
    console.log('estimated costs', web3.utils.fromWei(usdCost.toString(), 'ether'), 'DAI')

}
getAnalytics()