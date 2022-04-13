pragma solidity 0.5.13;

import "../reputation/ShariaHubReputationInterface.sol";


contract MockReputation is ShariaHubReputationInterface {
    bool public burnCalled = false;
    bool public incrementCalled = false;

    function burnReputation(uint delayDays) external onlyLendingContract {
        burnCalled = true;
    }

    function incrementReputation(uint completedProjectsByTier) external onlyLendingContract {
        incrementCalled = true;
    }

    function initLocalNodeReputation(address localNode) external onlyUsersContract {
        uint blah = 2;
    }

    function initCommunityReputation(address community) external onlyUsersContract {
        uint blah = 2;
    }

    function getCommunityReputation(address target) public view returns(uint256) {
        return 5;
    }

    function getLocalNodeReputation(address target) public view returns(uint256) {
        return 5;
    }
}
