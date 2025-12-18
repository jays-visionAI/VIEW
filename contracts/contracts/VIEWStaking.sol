// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title VIEWStaking
 * @dev Staking contract for VIEW tokens with tier-based benefits
 * 
 * Tiers:
 * - Bronze: 0+ VIEW (1.0x multiplier)
 * - Silver: 1,000+ VIEW (1.2x multiplier)
 * - Gold: 5,000+ VIEW (1.5x multiplier)
 * - Platinum: 10,000+ VIEW (2.0x multiplier)
 *
 * Rewards are distributed off-chain via Cloud Function based on staked amounts.
 */
contract VIEWStaking is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable viewToken;

    // Staking data
    struct StakeInfo {
        uint256 amount;
        uint256 stakedAt;
        uint256 lastUnstakeRequest;
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;

    // Tier thresholds (in tokens, not wei for readability)
    uint256 public constant TIER_BRONZE = 0;
    uint256 public constant TIER_SILVER = 1_000 * 10**18;
    uint256 public constant TIER_GOLD = 5_000 * 10**18;
    uint256 public constant TIER_PLATINUM = 10_000 * 10**18;

    // Unstaking cooldown (default: 0 for instant, can be set by owner)
    uint256 public unstakeCooldown = 0;

    // Events
    event Staked(address indexed user, uint256 amount, uint256 totalStaked);
    event Unstaked(address indexed user, uint256 amount, uint256 remaining);
    event UnstakeCooldownUpdated(uint256 newCooldown);

    constructor(address _token) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        viewToken = IERC20(_token);
    }

    /**
     * @dev Stake VIEW tokens
     * @param amount Amount to stake (in wei)
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens to contract
        viewToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update stake info
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].stakedAt = block.timestamp;
        totalStaked += amount;

        emit Staked(msg.sender, amount, stakes[msg.sender].amount);
    }

    /**
     * @dev Unstake VIEW tokens
     * @param amount Amount to unstake (in wei)
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        StakeInfo storage stakeInfo = stakes[msg.sender];
        require(amount > 0, "Amount must be > 0");
        require(stakeInfo.amount >= amount, "Insufficient staked balance");

        // Check cooldown if enabled
        if (unstakeCooldown > 0) {
            require(
                block.timestamp >= stakeInfo.lastUnstakeRequest + unstakeCooldown,
                "Cooldown period not passed"
            );
        }

        // Update stake info
        stakeInfo.amount -= amount;
        stakeInfo.lastUnstakeRequest = block.timestamp;
        totalStaked -= amount;

        // Transfer tokens back
        viewToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount, stakeInfo.amount);
    }

    /**
     * @dev Get user's staked balance
     */
    function getStakedBalance(address user) external view returns (uint256) {
        return stakes[user].amount;
    }

    /**
     * @dev Get user's tier (0=Bronze, 1=Silver, 2=Gold, 3=Platinum)
     */
    function getTier(address user) external view returns (uint8) {
        uint256 stakedAmount = stakes[user].amount;

        if (stakedAmount >= TIER_PLATINUM) return 3; // Platinum
        if (stakedAmount >= TIER_GOLD) return 2;     // Gold
        if (stakedAmount >= TIER_SILVER) return 1;   // Silver
        return 0; // Bronze
    }

    /**
     * @dev Get tier multiplier (scaled by 100, e.g., 100 = 1.0x, 120 = 1.2x)
     */
    function getTierMultiplier(address user) external view returns (uint256) {
        uint256 stakedAmount = stakes[user].amount;

        if (stakedAmount >= TIER_PLATINUM) return 200; // 2.0x
        if (stakedAmount >= TIER_GOLD) return 150;     // 1.5x
        if (stakedAmount >= TIER_SILVER) return 120;   // 1.2x
        return 100; // 1.0x
    }

    /**
     * @dev Check if user can unstake (cooldown passed)
     */
    function canUnstake(address user) external view returns (bool) {
        if (unstakeCooldown == 0) return true;
        return block.timestamp >= stakes[user].lastUnstakeRequest + unstakeCooldown;
    }

    // ============ Admin Functions ============

    /**
     * @dev Set unstaking cooldown period
     */
    function setUnstakeCooldown(uint256 _cooldown) external onlyOwner {
        unstakeCooldown = _cooldown;
        emit UnstakeCooldownUpdated(_cooldown);
    }

    /**
     * @dev Pause staking
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause staking
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw (only excess tokens, not staked)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = viewToken.balanceOf(address(this));
        uint256 excess = balance > totalStaked ? balance - totalStaked : 0;
        require(excess > 0, "No excess tokens");
        viewToken.safeTransfer(owner(), excess);
    }
}
