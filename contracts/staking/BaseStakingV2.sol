// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20VotesComp.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BaseStakingV2
 * @notice It lets users stake $TOKEN token and receive $stTOKEN.
 * @dev A base perpetual staking with X days lock period.
 * It locks the user's $TOKEN token and mint stTOKEN to them. Users can request
 * to unstake their $TOKEN tokens. Tokens are then vested for a X days period.
 **/
// solhint-disable not-rely-on-time
contract BaseStakingV2 is ERC20VotesComp, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    /// @dev Max base points
    uint256 public constant MAX_BPS = 100_00;

    /// @dev Max penalty days
    uint256 private constant PENALTY_DAYS_LIMIT = 90;

    /// @dev Max penalty base points
    uint256 private constant PENALTY_BP_LIMIT = 50_00;

    /// @dev Staking token
    IERC20Metadata public stakingToken;

    /// @dev Penalty days value
    uint128 public penaltyDays;

    /// @dev Penalty base points value
    uint128 public penaltyBP;

    /// @dev The address to which the penalty tokens will be transferred
    address public treasury;

    /// @dev Minimum stake amount
    uint256 public minAmount;

    /// @dev Flag to allow/prevent staking
    bool public stakingAllowed;
    bool public unstakingAllowed = true;
    bool public claimingAllowed = true;

    /// @dev Distributor address
    address public distributor;

    struct Vesting {
        uint256 amount;
        uint256 startTime;
        uint256 index;
    }
    mapping(address => Vesting[]) public vesting;

    event PenaltyDaysUpdated(uint128 penaltyDays);
    event PenaltyBPUpdated(uint128 penaltyBP);
    event TreasuryUpdated(address treasury);
    event SetMinAmount(uint256 minAmount);
    event SetDistributor(address distributor);
    event SetMultiUnstakeAllowed(bool multiUnstakeAllowed);
    event SetStakingAllowed(bool stakingAllowed);
    event SetUnstakingAllowed(bool unstakingAllowed);
    event SetClaimingAllowed(bool claimingAllowed);

    event Staked(address indexed by, uint256 amount, uint256 newTotal);
    event Unstake(address indexed by, uint256 amount);
    event Claimed(address indexed by, uint256 amount, uint256 penaltyAmount);

    /**
     * @notice constructor
     * @param _stakingToken Staking token address
     * @param _penaltyDays Penalty days value
     * @param _penaltyBP Penalty base points value
     * @param _treasury The address to which the penalty tokens will be transferred
     * @param _minAmount The minimum amount that can be staked
     * @param _distributor The distributor address
     */
    constructor(
        IERC20Metadata _stakingToken,
        uint128 _penaltyDays,
        uint128 _penaltyBP,
        address _treasury,
        uint256 _minAmount,
        address _distributor
    )
        ERC20(
            string(abi.encodePacked("Staked ", _stakingToken.name())),
            string(abi.encodePacked("st", _stakingToken.symbol()))
        )
        ERC20Permit(string(abi.encodePacked("Staked ", _stakingToken.name())))
    {
        require(address(_stakingToken) != address(0), "Invalid staking token");
        require(
            _penaltyDays <= PENALTY_DAYS_LIMIT,
            "Penalty days exceeds limit"
        );
        require(_penaltyBP <= PENALTY_BP_LIMIT, "Penalty BP exceeds limit");
        require(_treasury != address(0), "Treasury is the zero address");

        stakingToken = _stakingToken;
        penaltyDays = _penaltyDays;
        penaltyBP = _penaltyBP;
        treasury = _treasury;
        minAmount = _minAmount;
        distributor = _distributor;
    }

    /**
     * @notice Stake tokens
     * @param _amount Amount to stake
     */
    function stake(uint256 _amount) external nonReentrant {
        require(stakingAllowed, "Staking not allowed");

        _stake(msg.sender, _amount);
    }

    /**
     * @notice Stake tokens for a user
     * @param _user User address
     * @param _amount Amount to stake
     */
    function stakeFor(address _user, uint256 _amount) external nonReentrant {
        require(msg.sender == distributor, "Not a distributor");

        _stake(_user, _amount);
    }

    /**
     * @notice This function is used to stake tokens for a user
     * @param _user User address
     * @param _amount Amount to unstake
     */
    function _stake(address _user, uint256 _amount) private {
        require(_amount >= minAmount, "Amount less than min amount");

        // Transfer tokens from user
        stakingToken.safeTransferFrom(_user, address(this), _amount);

        // Mint staking tokens to user
        _mint(_user, _amount);
        _delegate(_user, _user);

        emit Staked(_user, _amount, balanceOf(_user));
    }

    /**
     * @notice Unstake tokens
     * @param _amount Amount to unstake
     */
    function unstake(uint256 _amount) external nonReentrant {
        require(unstakingAllowed, "Unstaking not allowed");
        _unstake(msg.sender, _amount);
    }

    /**
     * @notice Create an unstake position
     * @param _user User address
     * @param _amount Amount to unstake
     */
    function _unstake(address _user, uint256 _amount) private {
        require(_amount > 0, "Amount is zero");
        require(_amount <= balanceOf(_user), "Amount exceeds balance");

        // Burn staking tokens
        _burn(_user, _amount);

        // Create a vesting entry
        _createVesting(_user, _amount);
    }

    /**
     * @notice Create a vesting entry
     * @param _user User address
     * @param _amount Amount to unstake
     */
    function _createVesting(address _user, uint256 _amount) private {
        // Add vesting entry
        vesting[_user].push(
            Vesting({
                amount: _amount,
                startTime: block.timestamp,
                index: vesting[_user].length
            })
        );

        emit Unstake(_user, _amount);
    }

    /**
     * @notice Returns length of vesting entries for a user
     * @param _user User address
     */
    function getVestingLength(address _user) external view returns (uint256) {
        return vesting[_user].length;
    }

    /**
     * @notice Returns all vesting entres for a user
     * @param _user User address
     */
    function getVesting(
        address _user
    ) external view returns (Vesting[] memory) {
        return vesting[_user];
    }

    /**
     * @notice Get paginated vesting entries for a user
     * @param _address address of user
     * @param cursor pagination cursor
     * @param amount amount of entries to return
     * @return values array of entries
     * @return newCursor new cursor
     */
    function getVestingPaginated(
        address _address,
        uint256 cursor,
        uint256 amount
    ) external view returns (Vesting[] memory values, uint256 newCursor) {
        uint256 length = amount;
        Vesting[] memory vestings = vesting[_address];

        newCursor = cursor + length;

        if (length > vestings.length - cursor) {
            length = vestings.length - cursor;
            newCursor = 0;
        }

        values = new Vesting[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = vestings[cursor + i];
        }
    }

    /**
     * @notice Claim tokens
     * @param _index Index of vesting entry
     */
    function claim(uint256 _index) external nonReentrant {
        require(claimingAllowed, "Claiming not allowed");
        _claim(msg.sender, _index);
    }

    /**
     * @notice Claim tokens
     * @param _user User address
     * @param _index Index of vesting entry
     */
    function _claim(address _user, uint256 _index) private {
        require(_index < vesting[_user].length, "Invalid index");

        Vesting storage vestingEntry = vesting[_user][_index];

        // Handle penalty
        uint256 penalty = _calculatePenalty(vestingEntry);
        if (penalty > 0) {
            stakingToken.safeTransfer(treasury, penalty);
        }

        uint256 returnAmount = vestingEntry.amount - penalty;
        // Transfer tokens to user
        stakingToken.safeTransfer(_user, returnAmount);

        _removeVesting(_user, _index);

        emit Claimed(_user, returnAmount, penalty);
    }

    /**
     * @notice Remove a vesting entry
     * @param _user User address
     * @param _index Index of vesting entry
     */
    function _removeVesting(address _user, uint256 _index) private {
        Vesting[] storage vestings = vesting[_user];
        Vesting memory lastVesting = vestings[vestings.length - 1];

        lastVesting.index = _index;
        vestings[_index] = lastVesting;
        vestings.pop();
    }

    function _calculatePenalty(
        Vesting memory vestingRef
    ) internal view returns (uint256 penaltyAmount) {
        if (vestingRef.startTime + (penaltyDays * 1 days) > block.timestamp) {
            penaltyAmount = (vestingRef.amount * penaltyBP) / MAX_BPS;
        }
    }

    /** ONLY OWNER **

    /**
     * @notice Allow/Prevent staking
     * @param _stakingAllowed true/false to allow/prevent
     */
    function setStakingAllowed(bool _stakingAllowed) external onlyOwner {
        require(_stakingAllowed != stakingAllowed, "Already set");

        stakingAllowed = _stakingAllowed;

        emit SetStakingAllowed(_stakingAllowed);
    }

    /**
     * @notice Allow/Prevent unstaking
     * @param _unstakingAllowed true/false to allow/prevent
     */
    function setUnstakingAllowed(bool _unstakingAllowed) external onlyOwner {
        require(_unstakingAllowed != unstakingAllowed, "Already set");

        unstakingAllowed = _unstakingAllowed;

        emit SetUnstakingAllowed(_unstakingAllowed);
    }

    /**
     * @notice Allow/Prevent claiming
     * @param _claimingAllowed true/false to allow/prevent
     */
    function setClaimingAllowed(bool _claimingAllowed) external onlyOwner {
        require(_claimingAllowed != claimingAllowed, "Already set");

        claimingAllowed = _claimingAllowed;

        emit SetClaimingAllowed(_claimingAllowed);
    }

    /**
     * @notice Set a new penalty days value
     * @param _penaltyDays New penalty days value
     */
    function setPenaltyDays(uint128 _penaltyDays) external onlyOwner {
        require(
            _penaltyDays <= PENALTY_DAYS_LIMIT,
            "Penalty days exceeds limit"
        );
        penaltyDays = _penaltyDays;
        emit PenaltyDaysUpdated(_penaltyDays);
    }

    /**
     * @notice Set a new penalty base points value
     * @param _penaltyBP New penalty base points value
     */
    function setPenaltyBP(uint128 _penaltyBP) external onlyOwner {
        require(_penaltyBP <= PENALTY_BP_LIMIT, "Penalty BP exceeds limit");
        penaltyBP = _penaltyBP;
        emit PenaltyBPUpdated(_penaltyBP);
    }

    /**
     * @notice Set a new penalty treasury
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Treasury is the zero address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /**
     * @notice Set a minimum amount to stake
     * @param _minAmount Minimum stake amount
     */
    function setMinAmount(uint256 _minAmount) external onlyOwner {
        minAmount = _minAmount;
        emit SetMinAmount(_minAmount);
    }

    /**
     * @notice Set a distributor address
     * @param _distributor Distributor address
     */
    function setDistributor(address _distributor) external onlyOwner {
        distributor = _distributor;
        emit SetDistributor(_distributor);
    }

    /**
     * @notice Emergency withdraw tokens from contract
     * @param _tokenAddress The token address to withdraw the balance
     */
    function emergencyWithdrawToken(
        IERC20Metadata _tokenAddress
    ) external onlyOwner {
        _tokenAddress.safeTransfer(
            msg.sender,
            _tokenAddress.balanceOf(address(this))
        );
    }

    // ** INTERNAL **

    /// @dev disable transfers
    function _transfer(
        address /* _from */,
        address /* _to */,
        uint256 /* _amount */
    ) internal pure override {
        revert("NON_TRANSFERABLE");
    }
}
// solhint-enable not-rely-on-time
