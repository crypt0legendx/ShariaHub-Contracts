require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
let mnemonic = process.env.MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/" + process.env.INFURA_KEY));
const { BN } = require('@openzeppelin/test-helpers');
const utils = require("web3-utils");

function latestTime() {
  return web3.eth.getBlock(web3.eth.blockNumber).timestamp;
}

const duration = {
  seconds: function (val) { return val },
  minutes: function (val) { return val * this.seconds(60) },
  hours: function (val) { return val * this.minutes(60) },
  days: function (val) { return val * this.hours(24) },
  weeks: function (val) { return val * this.days(7) },
  years: function (val) { return val * this.days(365) }
};

function ether(n) {
  return new BN(utils.toWei(n, 'ether'));
}

function now() {
  return Math.round((new Date()).getTime() / 1000);
}

var cmc;
var userManager;
const loader = require('./contract_loader.js');
var cmcAddress;
var userAddress;
var storageAddress;
var localNode;
var representative;
var community;
var team = '0xdFb6994ADD952486d2B65af4A6c9D511b122f172';
switch (process.env.NETWORK_ID) {
  case "1":
    userAddress = '0xEdD8950B7AcD7717ECc07A94dF126BF2A07f74C4';
    account = '0xAB42A5a21566C9f1466D414CD3195dA44643390b';
    storageAddress = '';
    localNode = '';
    representative = '';
    community = '';
    team = '';
    break;
  case "42":
    userAddress = '0x8E5E619c56a03b0C769f3E07B0A3C2448994f91F';
    account = '0xfBCb86e80FF9C864BA37b9bbf2Be21cC71abcdeE';
    storageAddress = '0x3313bCC5a3a91e4c20748A9aD9749cE4d0255A68';
    cmcAddress = '0x40e15A130B71Db4EF32892D18fF304549ea7A9C7';
    localNode = '0x08B909c5c1Fc6bCc4e69BA865b3c38b6365bD894';
    representative = '';
    community = '';
    team = '';
    break;
  default:
    console.log("Unknown network: " + process.env.NETWORK_ID);
    process.exit(-1);
}




loader.load(web3, 'ShariaHubCMC', cmcAddress).then(cmcInstance => {
  cmc = cmcInstance;
  console.log("got cmc");
  return loader.load(web3, 'ShariaHubStorage', storageAddress).then(async (storageInstance) => {
    console.log("got storage");
    return web3.eth.getAccounts().then(accounts => {

      console.log("got accounts");
      return loader.load(web3, 'ShariaHubUser', userAddress).then(async (userInstance) => {
        console.log("got users");
        var userManager = userInstance;
        var tx = await userManager.methods.registerLocalNode(localNode).send({ from: accounts[0], gas: 4000000 });
        console.log("Registered localNode");
        console.log(tx);
        tx = await userManager.methods.registerRepresentative(accounts[2]).send({ from: accounts[0], gas: 4000000 });
        console.log(tx);
        console.log("registerRepresentative");

        tx = await userManager.methods.registerCommunity(community).send({ from: accounts[0], gas: 4000000 });
        console.log(tx);
        console.log("Registered userManager");

        const fundingStartTime = now() + duration.minutes(15);
        const fundingEndTime = now() + duration.hours(5);
        console.log(fundingStartTime);
        console.log(fundingEndTime);

        console.log(ether('1'));
        const deployable = loader.getDeployable(web3, 'ShariaHubLending');
        const lendingInstance = await deployable.contract.deploy({
          data: deployable.byteCode,
          arguments: [
            `${fundingStartTime}`,//_fundingStartTime
            `${fundingEndTime}`,//_fundingEndTime
            accounts[2],//_borrower
            '15',//_annualInterest
            ether('1'),//_totalLendingAmount
            '2',//_lendingDays
            storageAddress, //_storageAddress
            localNode,//localNode
            team
          ]
        })
          .send({
            from: accounts[0],
            gas: 4500000,
            gasPrice: '300000000000',
          });

        console.log("Deployed");
        console.log(lendingInstance.options.address) // instance with the new contract address
        await cmc.methods.addNewLendingContract(lendingInstance.options.address).send({ from: accounts[0], gas: 4000000 });
        console.log("addNewLendingContract");
        await lendingInstance.methods.saveInitialParametersToStorage(
          '2',//maxDefaultDays
          '20',//community members
          community //community rep wallet
        ).send({ from: accounts[0], gas: 4000000 });

      });

    });

  });
})
