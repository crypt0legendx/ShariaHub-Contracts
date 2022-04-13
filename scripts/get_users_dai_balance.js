require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();
let fs = require('fs')
var PrivateKeyProvider = require("truffle-privatekey-provider");
var Web3 = require('web3');
var web3 = new Web3(new PrivateKeyProvider(process.env.PK, "https://chain.Shariahub.com"));
var BN = web3.BN;
const utils = require("web3-utils");
const loader = require('./contract_loader.js');
let wallets = require('../data/wallets.json')
const path = require('path');
let results = []

console.log(wallets)
var index = 0

function getContract() {
    const jsonPath = path.join(__dirname, `../build/contracts/MockStableCoin.json`);
    const contract_data = require(jsonPath);
    return new web3.eth.Contract(contract_data.abi,'0x6b175474e89094c44da98b954eedeac495271d0f');
}

async function getBalances() {
    let wallet = wallets[index]['Wallet Address']
    console.log('checking wallet',wallet,'...')
    let stableCoin = getContract()
    let balance = await stableCoin.methods.balanceOf(wallet).call()
    console.log(wallet, balance)
    results.push({
            wallet: wallet,
            balance: balance
    })
    if (results.length === wallets.length) {
        try {
            let json = JSON.stringify(results)
            console.log(json)
            const data = fs.writeFileSync('../data/dai-balances.json', json)
            //file written successfully
          } catch (err) {
            console.error(err)
          }

    } else {
        index += 1
        setTimeout(getBalances, 300)
    }
    
}
/*
async function getAnalytics() {
    console.dir(results)
    let balances = results.map(x => x.balance)
    console.dir(balances)
    const { min, max } = balances.reduce((accumulator, currentValue) => {
        return {
            min: BN.min(currentValue, accumulator.min), 
            max: BN.max(currentValue, accumulator.max)
        }
    }, {max: new BN(Number.MAX_VALUE), min: new BN('0') })
    console.log('min', min.toString())
    console.log('max', max.toString())
}
*/

getBalances()

