//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;


interface IContributionTarget {
    function deposit(address contributor, uint256 amount) external;
}