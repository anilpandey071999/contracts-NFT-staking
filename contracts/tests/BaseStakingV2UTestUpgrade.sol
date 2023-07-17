// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;

import "../staking/BaseStakingV2U.sol";

contract BaseStakingV2UTestUpgrade is BaseStakingV2U {
    function upgraded() public pure returns (string memory) {
        return "Hello, world!";
    }
}
