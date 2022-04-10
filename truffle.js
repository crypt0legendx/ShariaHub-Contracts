require('babel-register');
require('babel-polyfill');
require('dotenv').config();

var HDWalletProvider = require("truffle-hdwallet-provider");

//let mnemonic = process.env.MNEMONIC;


module.exports = {
  solc: {
    version: "^0.8.13",
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      gas: 4600000,
      network_id: "*" // Match any network id
    },
    ganache: {
      host: "127.0.0.1",
      port: 9545,
      gas: 4600000,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(process.env.PRIVATE_KEY, "https://rinkeby.infura.io/" + process.env.INFURA_KEY);
      },
      network_id: 4,
      gasLimit: 6000000,
      gas: 4700000
    },
    solidity: {
      version: '0.8.13'
    }
  },
  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 999999,
        },
      },
    },
  },
};
