//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
/*
    Copyright (C) 2020 EthicHub
    This file is part of platform contracts.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
    POA ERC20-Native bridge (Dai-xDai): https://etherscan.io/address/0x4aa42145aa6ebf72e164c9bbc74fbd3788045016
    implementation: https://etherscan.io/address/0x7e7669bdff02f2ee75b68b91fb81c2b38f9228c2#code
*/
interface ITokenBridge {
    function relayTokens(address _sender, address _receiver, uint256 _amount) external;
}