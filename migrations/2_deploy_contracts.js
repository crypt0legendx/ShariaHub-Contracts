const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = web3_1_0.utils;

//const Lending = artifacts.require('Lending');
const storage = artifacts.require('./storage/ShariaHubStorage.sol');
const cmc = artifacts.require('./ShariaHubCMC.sol');
const reputation = artifacts.require('./reputation/ShariaHubReputation.sol');
const userManager = artifacts.require('./user/ShariaHubUser.sol');

// Deploy ShariaHub network
module.exports = async (deployer, network) => {
    if (network !== 'ganache' && network !== 'development' && network !== 'develop') {
        console.log("Skipping deploying ShariaHub in dev networks");
        return;
    }
    console.log("--> Deploying ShariaHubStorage...");
    return deployer.deploy(storage).then(() => {
        //Contract management
        console.log("--> ShariaHubStorage deployed");
        console.log("--> Deploying ShariahubCMC...");
        return deployer.deploy(cmc, storage.address).then(() => {
            console.log("--> ShariahubCMC deployed");

            return storage.deployed().then(async storageInstance => {
                //Give CMC access to storage
                console.log("--> Registering ShariahubCMC in the network...");
                await storageInstance.setAddress(utils.soliditySha3("contract.address", cmc.address), cmc.address);
                console.log("--> ShariahubCMC registered");
                //Deploy reputation
                console.log("--> Deploying ShariaHubReputation...");
                return deployer.deploy(reputation, storage.address).then(() => {
                    console.log("--> ShariaHubReputation deployed");
                    //Set deployed reputation's role in the network
                    return cmc.deployed().then(async cmcInstance => {
                        console.log("--> Registering ShariaHubReputation in the network...");
                        await cmcInstance.upgradeContract(reputation.address,"reputation");
                        console.log("--> ShariaHubReputation registered");
                        console.log("--> Deploying ShariaHubUser...");
                        return deployer.deploy(userManager,storage.address).then(() => {
                            console.log("--> ShariaHubUser deployed");
                            console.log("--> Registering ShariaHubReputation in the network...");
                            return cmc.deployed().then(async cmcInstance => {
                                await cmcInstance.upgradeContract(userManager.address,"users");
                                console.log("--> ShariaHubReputation registered");
                                console.log("--> ShariaHub network ready");
                            });
                        });
                    });
                });
            });
        });
    });

};
