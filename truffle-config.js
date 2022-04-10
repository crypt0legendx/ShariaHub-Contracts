var HDWalletProvider = require("truffle-hdwallet-provider");
require("dotenv").config();
module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gasPrice: 2000,
    },
    ropsten: {
      networkCheckTimeout: 1000000,
      networkCheckTimeoutnetworkCheckTimeout: 1000000,
      provider: function () {
        return new HDWalletProvider(
          process.env.PRIVATE_KEY,
          "https://ropsten.infura.io/v3/437a3c5beee64523af769b5ef627b33e"
        );
      },
      confirmations: 10,
      skipDryRun: true,
      timeoutBlocks: 2000,
      network_id: 3,
      gas: 4000000, //make sure this gas allocation isn't over 4M, which is the max
    },
    rinkeby: {
      networkCheckTimeout: 1000000,
      networkCheckTimeoutnetworkCheckTimeout: 1000000,
      provider: function () {
        return new HDWalletProvider(
          process.env.PRIVATE_KEY,
          "https://rinkeby.infura.io/v3/437a3c5beee64523af769b5ef627b33e"
        );
      },
      confirmations: 10,
      skipDryRun: true,
      timeoutBlocks: 2000,
      network_id: 4,
      gas: 4000000, //make sure this gas allocation isn't over 4M, which is the max
    },
    mainnet: {
      provider: function () {
        return new HDWalletProvider(
          process.env.PRIVATE_KEY,
          "https://mainnet.infura.io/v3/" + process.env.API_KEY
        );
      },
      network_id: 1,
      gasPrice: 110000000000,
      gas: 8000000, //make sure this gas allocation isn't over 8M
    },
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
  plugins: ["truffle-plugin-verify"],
  api_keys: {
    etherscan: "9R4FZ7QN9ZE8BICXFN3N1UUCNHNW51HBD1",
    rinkeby: "9R4FZ7QN9ZE8BICXFN3N1UUCNHNW51HBD1",
  },
};
