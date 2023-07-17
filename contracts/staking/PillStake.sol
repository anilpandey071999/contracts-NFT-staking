// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.19;

// import pausable
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPill {
    function getExpiry(
        uint256 Pill
    ) external view returns (uint256 tier, uint256 time);

    function ownerOf(uint256 tokenId) external view returns (address owner);
}

interface IPillStake {
    function staked(uint256 Pill) external view returns (uint256 amount);

    function stake(uint256 Pill, uint256 amount) external;

    function withdraw(uint256 Pill) external;
}

contract PillStake is Pausable, Ownable, IPillStake {
    using SafeERC20 for IERC20;
    IPill public PillAddress;
    IERC20 public stakingToken;

    mapping(uint256 => uint256) public _stakes;
    uint256 public totalStaked;
    uint256 public totalPills;

    event Staked(uint256 indexed Pill, address indexed by, uint256 amount);
    event Withdrawn(
        uint256 indexed Pill,
        address indexed by,
        uint256 amount
    );

    event RecoveredERC20(address token, uint256 amount);
    event RecoveredNative(uint256 amount);
    event RecoveredFromBurned(uint256 Pill, uint256 amount);

    constructor(address _PillAddress, address _stakingToken) {
        PillAddress = IPill(_PillAddress);
        stakingToken = IERC20(_stakingToken);
    }

    function staked(uint256 Pill) external view returns (uint256) {
        return _stakes[Pill];
    }

    function stake(
        uint256 Pill,
        uint256 amount
    ) external override whenNotPaused {
        require(
            PillAddress.ownerOf(Pill) == msg.sender,
            "PillStake: not owner"
        );
        (, uint256 time) = PillAddress.getExpiry(Pill);
        require(time > block.timestamp, "PillStake: expired");
        require(amount > 0, "PillStake: zero amount");

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        if (_stakes[Pill] == 0) {
            totalPills += 1;
        }

        _stakes[Pill] += amount;

        totalStaked += amount;

        emit Staked(Pill, msg.sender, amount);
    }

    function withdraw(uint256 Pill) external override whenNotPaused {
        require(
            PillAddress.ownerOf(Pill) == msg.sender,
            "PillStake: not owner"
        );
        uint256 amount = _stakes[Pill];
        require(amount > 0, "PillStake: zero amount");

        (, uint256 time) = PillAddress.getExpiry(Pill);
        require(time != 0, "PillStake: unknown expiry");
        require(time <= block.timestamp, "PillStake: not expired");

        _stakes[Pill] = 0;

        stakingToken.safeTransfer(msg.sender, amount);

        totalStaked -= amount;
        totalPills -= 1;

        emit Withdrawn(Pill, msg.sender, amount);
    }

    function setPause(bool _paused) external onlyOwner {
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    // recover from burnt Pill
    function recoverStake(uint256 Pill) external onlyOwner {
        uint256 amount = _stakes[Pill];
        require(amount > 0, "PillStake: zero amount");

        try PillAddress.ownerOf(Pill) returns (address owner) {
            require(owner == address(0), "PillStake: not burnt");
        } catch {} // If ownerOf reverts, it does not exist

        _stakes[Pill] = 0;
        stakingToken.safeTransfer(owner(), amount);

        totalStaked -= amount;
        totalPills -= 1;

        emit RecoveredFromBurned(Pill, amount);
    }

    function recoverERC20(address tokenAddress) external onlyOwner {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        IERC20(tokenAddress).safeTransfer(owner(), balance);

        emit RecoveredERC20(tokenAddress, balance);
    }

    function recoverNative() external onlyOwner {
        // call with value
        (bool success, ) = owner().call{value: address(this).balance}("");

        require(success, "PillStake: failed to recover native");

        emit RecoveredNative(address(this).balance);
    }
}
