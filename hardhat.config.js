const { task } = require('hardhat/config')

//require('@nomiclabs/hardhat-waffle')
require("@babel/polyfill");
require("@babel/register");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-solhint");

let secrets = require('./.secrets.json')

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.13",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
      },
      {
        version: "0.6.12",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
      },
      {
        version: "0.8.3",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
      }
    ]
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
    },
    sokol: {
      url: secrets.sokol.node_url,
      chainId: 77,
      accounts: secrets.sokol.pks,
    },
    xdai: {
      url: secrets.xdai.node_url,
      chainId: 100,
      accounts: secrets.xdai.pks,
    },
  }
}
