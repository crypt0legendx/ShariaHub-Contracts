require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
let mnemonic = process.env.KOVAN_MNEMONIC;
var Web3 = require('web3');
var web3 = new Web3(new HDWalletProvider(mnemonic, "https://kovan.infura.io/" + process.env.INFURA_KEY));

var cmc;
var storageAddress;

const loader = require('./contract_loader.js');
if (process.argv.length <= 3) {
  console.log("Usage: " + __filename + " <contract_role> <network_id>");
  process.exit(-1);
} else {
  console.log("TODO: network dependent address")
  process.exit(-1);
}

var contract_key = process.argv[2];
var contractParams = {
  users: {
    role: "users",
    file: "ShariaHubUser"
  },
  reputation: {
    role: "reputation",
    file: "ShariaHubReputation"
  }
}

var selectedContract = contractParams[contract_key]
if (selectedContract === undefined) {
  console.log("Unkown: " + contract_key);
  process.exit(-1);
}
console.log(selectedContract)

loader.load(web3, 'ShariaHubCMC', process.env.KOVAN_CMC_ADDRESS).then(cmcInstance => {
  cmc = cmcInstance;
  return loader.load(web3, 'ShariaHubStorage', process.env.KOVAN_STORAGE_ADDRESS).then(async (storageInstance) => {
    storageAddress = await storageInstance.options.address;
    return web3.eth.getAccounts().then(accounts => {

      const deployable = loader.getDeployable(web3, selectedContract.file);
      return deployable.contract.deploy({
        data: deployable.byteCode,
        arguments: [storageAddress]
      })
        .send({
          from: accounts[0],
          gas: 4000000,
          gasPrice: '1000000000',
        })
        .on('error', function (error) {
          console.log("--> Error:")
          console.error(error);
        })
        .on('receipt', function (receipt) {
          console.log(receipt) // contains the new contract address
        })
        .on('confirmation', function (confirmationNumber, receipt) {
          console.log(`Confirmation number: ${confirmationNumber}`);
        })
        .then(function (newContractInstance) {
          console.log("Deployed");
          console.log(newContractInstance.options.address) // instance with the new contract address

          return cmc.methods.upgradeContract("0x85A652DBC608469187Ecfc8A28A3c01CBBC25310", contract_key)
            .send({
              from: accounts[0],
              gas: 4000000,
              gasPrice: '1000000000',
            })
            .on('receipt', function (receipt) {
              console.log(receipt)
            })
            .then(() => {
              console.log(" upgraded:");
              console.log(contract_key);
              return cmc;
            })
        });
    });

  })
})
