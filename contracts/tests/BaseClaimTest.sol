// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "../claim/BaseClaim.sol";

contract BaseClaimTest is BaseClaim {
    constructor(address _rewardToken) BaseClaim(_rewardToken) {} // solhint-disable-line no-empty-blocks

    function buy(uint256 _amount) external {
        addUserReward(msg.sender, _amount);
    }
}
