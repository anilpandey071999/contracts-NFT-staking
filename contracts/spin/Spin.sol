// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Spin is ERC20VotesComp, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum RollResultType {
        Nothing,
        Reroll,
        Amount
    }

    struct RollOption {
        RollResultType rollType;
        uint256 amount;
        uint256 weight;
    }
    RollOption[] public rollOptions;

    uint256 public totalRollWeight;

    IERC20 public immutable paymentToken;
    uint256 public spinPrice;

    address public treasury;

    uint256 public totalSpins;

    event SpinPriceUpdated(uint256 spinPrice);
    event TreasuryChanged(address indexed treasury);

    event RollResult(
        address indexed user,
        RollResultType rollType,
        uint256 amount
    );

    constructor(
        string memory _tokenName,
        string memory _symbol,
        address _paymentToken,
        uint256 _spinPrice,
        address _treasury
    ) ERC20(_tokenName, _symbol) ERC20Permit(_tokenName) {
        paymentToken = IERC20(_paymentToken);
        spinPrice = _spinPrice;
        treasury = _treasury;
    }

    // Treasury
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryChanged(_treasury);
    }

    // Set spin price
    function setSpinPrice(uint256 _spinPrice) external onlyOwner {
        spinPrice = _spinPrice;
        emit SpinPriceUpdated(_spinPrice);
    }

    // Pause
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getRollOptions() public view returns (RollOption[] memory) {
        return rollOptions;
    }

    // Roll options
    function setRollOptions(
        RollResultType[] calldata _types,
        uint256[] calldata _amounts,
        uint256[] calldata _weights
    ) external onlyOwner {
        require(_types.length == _amounts.length, "Length mismatch");
        require(_weights.length == _amounts.length, "Length mismatch");

        uint256 weight;
        delete rollOptions;

        for (uint i = 0; i < _types.length; i++) {
            weight += _weights[i];
            rollOptions.push(RollOption(_types[i], _amounts[i], _weights[i]));
        }
        totalRollWeight = weight;
    }

    function _price() internal view returns (uint256) {
        return spinPrice;
    }

    // TODO: Add a way to check if the user can spin
    function _canSpin(address _user) internal view virtual returns (bool) {
        return _user != address(0);
    }

    function spin() external nonReentrant whenNotPaused {
        require(_canSpin(msg.sender), "Cannot spin");
        _spin(msg.sender);
    }

    function _spin(address _user) internal {
        RollOption memory roll = _draw();
        totalSpins += 1;

        emit RollResult(_user, roll.rollType, roll.amount);

        if (roll.rollType == RollResultType.Reroll) {
            return;
        }

        paymentToken.safeTransferFrom(_user, treasury, _price());

        if (roll.rollType == RollResultType.Amount) {
            _mint(_user, roll.amount);
            return;
        }

        if (roll.rollType == RollResultType.Nothing) {
            return;
        }
    }

    // pseudo random
    function _draw() internal view returns (RollOption memory) {
        uint256 seed = uint256(
            keccak256(
                abi.encodePacked(block.timestamp, block.difficulty, totalSpins)
            )
        );
        uint256 randomNumber = seed % totalRollWeight;
        uint256 weightSum = 0;
        for (uint i = 0; i < rollOptions.length; i++) {
            weightSum += rollOptions[i].weight;
            if (randomNumber < weightSum) {
                return rollOptions[i];
            }
        }

        revert();
    }

    // ERC20 Extensions
    function burn(uint256 amount) public virtual {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) public virtual {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }

    function _transfer(
        address /* _from */,
        address /* _to */,
        uint256 /* _amount */
    ) internal pure override {
        revert("NON_TRANSFERABLE");
    }
}
