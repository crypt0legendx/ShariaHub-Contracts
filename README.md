![ShariaHub Logo](https://s3-eu-west-1.amazonaws.com/Shariahub-media/git-readme/banner3.png)

# ShariaHub Platform Contracts
The backbone of ShariaHub's Shariaal Crowdlending Platform.

Developed with [Truffle Framework](https://truffleframework.com/)



## Install
```
git clone https://gitlab.com/ShariaHub/platform-contracts
cd platform-contracts
npm install
```
## Tests

```
truffle develop
test
```
Since the integration tests and some unit tests are ether intensive, repetitive runs of the whole suit could deplete the test ether. As an alternative:

### All tests in Ganache-cli with more Eth preloaded
Run:
```
./scripts/test.sh
```
### Individual test suite

Run:
```
./scripts/individual_test.sh
```
and follow the console instructions to run one test suite

# Architecture

At this point in the development, we are migrating from our original architecture (Hub & Spoke) to an upgradeable system using [OpenZeppelin SDK](https://openzeppelin.com/sdk/) implementation of [Proxy Contracts](https://blog.openzeppelin.com/proxy-patterns/)

# Original Architecture

Inspired by [RocketPool's Hub&Spoke architecture](https://medium.com/rocket-pool/upgradable-solidity-contract-design-54789205276d), we use a network of contracts that will allow us to have:

- Reasonable contract upgradeability (for our alpha's project posting schedule)
- Persistent data storage between contract updates
- Flexible role based access control
- [K.I.S.S](https://en.wikipedia.org/wiki/KISS_principle)

![ShariaHub contract architecture ](https://s3-eu-west-1.amazonaws.com/Shariahub-media/git-readme/contract_architecture.png)

## [Storage](./contracts/storage/ShariaHubStorage.sol)

Simple contract with mappings for each type, for key value storage. We obtain unique keys combining dot notation tags and related parameters using keccak256.

All the contracts of the network descend from [ShariaHubBase](./contracts/ShariaHubBase.sol), so they will have a reference to the storage contract.

To read data, they do:
```
ShariaHubStorage.get<Type>(keccak256("dot.notation.tag", parameter)
```

Storing and deleting data works in a similar fashion:
```
ShariaHubStorage.set<Type>(keccak256("dot.notation.tag", parameter)
ShariaHubStorage.delete<Type>(keccak256("dot.notation.tag", parameter)
```

Howhever, only contracts registered in ShariaHub's network (i.e. their address is saved in storage in a key corresponding to keccak256("contract.address", the_address) ) are allowed to set and delete
```
modifier onlyShariaHubContracts() {
    // Make sure the access is permitted to only contracts in our Dapp
    require(addressStorage[keccak256("contract.address", msg.sender)] != 0x0);
    _;
}
```

## [CMC](./contracts/ShariaHubCMC.sol)

The Contract Manager Contract (CMC) function is to register new versions of deployed contracts in storage, granting them write and delete access.

Except for the lending contracts, the rest of the "logic" contracts are singletons, so upgrading a contract's version will remove the previous one from storage, revoking it's ability to modify it.

## [User Manager](./contracts/user/ShariaHubUser.sol)

This contract allows us to give permissions to user's wallet based on their roles (saving their address in the address mapping `            ShariaHubStorage.setBool(keccak256("user", "<role>", target_address), true);
`)

The roles we have are:
#### Community
Addresses that will track the reputation of a community

#### Investor
To be compliant, we cannot receive contributions from addresses whose owner has not passed a KYC/AML check. To control this, we must implement an access control mechanism.

#### Local node
The project promoter, selector and auditor


## [Reputation](./contracts/reputation/ShariaHubReputation.sol)
Updates reputation score of the project's Local Node and Community.

For more in depth explanation, [read this article](https://medium.com/Shariahub/reputation-and-scoring-in-Shariahub-c06133f9730f).


## Lending contracts

Each lending contracts corresponds to a project. Holds the logic for the crowdlending, return of the funds and distribution to the lenders.

The simplified state machine is:

![ShariaHub Lending state machine](https://s3-eu-west-1.amazonaws.com/Shariahub-media/git-readme/simplified_lending_state_machine.png)

Lenders, borrowers and local nodes interact with these contracts through [ShariaHub's Platform](https://mvp.Shariahub.com).

## [Arbitrage](./contracts/reputation/ShariaHubArbitrage.sol)
In emergency cases, ShariaHub could appoint an special role to be able to change a borrower or investor address in a lending contract, or extract funds locked in the contract (with the conditions that all of the contributors, local node and team get their share first). This contract will be able to appoint that role. In the future the owner of this contract could be owned by a voting/governance token to keep the appointment of arbiters decentralized.

# Next Architecture

## Storage
**Newer contracts will be less and less dependant on Storage**, since ProxyPatterns allows updates in logic maintaining state.

Thus, User and Contract Managers will have their own state, and will be able to be referred by LendingContracts without Storage references

## Reputation

**On Chain Reputation is being phased out**. The reasons are:
1. Algorithm is difficult to understand by the users.
2. Ethereum updates makes all the state storage and extra computation expensive for users and the platform.

**The Reputation Contract will live until the currently deployed loans are repayed, to not break them.**

An similar off chain algorithm based in on chain payment history will be used instead.

## [DepositManager](./contracts/deposit/ShariaHubDepositManager.sol)

Since **we are migrating the Lending contracts to [use a stable ERC20 token (DAI)](https://makerdao.com/) instead of ETH**, having the users paying accept transactions on every loan would seriously impact the UX.

To fix this, all contributions will be made vía DepositManager (so, only 1 accept transaction). This contract acts as a proxy to send funds to the desired Loan. In next versions, this contract will hold all deposit functionality, leaving the lending contracts as mere token vaults.


# [Gas Station Network](https://gasstation.network/)

In order to provide Metatransactions for our users, we are integrating Gas Station Network.

**Huge thanks to the OpenZeppelin team, MetaCartel and the rest of the people that developed this concept**

## License
[GPL V3](https://www.gnu.org/licenses/gpl-3.0.txt)
