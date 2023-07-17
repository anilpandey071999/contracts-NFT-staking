// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract ERC20Test is ERC20Burnable {
    uint8 private _decimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 decimals_
    ) ERC20(_name, _symbol) {
        _decimals = decimals_;
        _mint(msg.sender, 1000000000 * 10 ** _decimals);
    }

    function mint(address tokenOwner, uint256 tokens) public {
        _mint(tokenOwner, tokens);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    receive() external payable {
        mint(msg.sender, 100 * decimals());
        if (msg.value > 0) {
            payable(msg.sender).transfer(msg.value);
        }
    }
}
