//SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ShariaHubReputationInterface {
//    modifier onlyUsersContract(){_;}
//    modifier onlyLendingContract(){_;}
    function burnReputation(uint delayDays)  external;
    function incrementReputation(uint completedProjectsByTier)  external;
    function initLocalNodeReputation(address localNode)  external;
    function initCommunityReputation(address community)  external;
    function getCommunityReputation(address target) external view returns(uint256);
    function getLocalNodeReputation(address target) external view returns(uint256);
}
