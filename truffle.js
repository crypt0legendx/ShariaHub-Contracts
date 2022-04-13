require('@babel/register');
require('@babel/polyfill');
require('dotenv').config();

var HDWalletProvider = require("@truffle/hdwallet-provider");
var PrivateKeyProvider = require("truffle-privatekey-provider");

const {
    GSNDevProvider
} = require('@openzeppelin/gsn-provider');

module.exports = {
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    compilers: {
        solc: {
            version: "0.5.13"
        }
    },
    networks: {
        development: {
            provider: function() {
                return new PrivateKeyProvider('0xd999042bfc9743927b214d2a9be92e32320edffb2457f2c77e51ed1bd6539c00', "http://127.0.0.1:8545");
            },
            network_id: "*" // Match any network id
        },
        coverage: {
            provider: function() {
                return new HDWalletProvider(process.env.GANACHE_MNEMONIC, "http://127.0.0.1:8545");
            },
            network_id: '*', // eslint-disable-line camelcase
            gas: 0x10000000,
            gasPrice: 0x01,
        },
        ganache: {
            provider: function() {
                return new HDWalletProvider(process.env.GANACHE_MNEMONIC, "http://127.0.0.1:8545");
            },
            gas: 5000000,
            gasPrice: 5e9,
            networkId: '*',
        },
        rinkeby: {
            provider: function() {
                return new HDWalletProvider(process.env.RINKEBY_MNEMONIC, "https://rinkeby.infura.io/v3/" + process.env.INFURA_KEY);
            },
            network_id: '*',
            gasLimit: 6000000,
            gas: 4700000
        },
        kovan: {
            provider: function() {
                return new HDWalletProvider(process.env.KOVAN_MNEMONIC, "https://kovan.infura.io/v3/" + process.env.INFURA_KEY);
            },
            network_id: '*',
            gasLimit: 6000000,
            gas: 4700000
        },
        mainnet: {
            provider: () => new PrivateKeyProvider(process.env.PK, "https://mainnet.infura.io/v3/"  + process.env.INFURA_KEY),
            network_id: '1',
            gasLimit: 60000000,
            gasPrice: 130000000000
        }
    }
};