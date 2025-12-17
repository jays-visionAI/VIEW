// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VIEWToken
 * @dev VIEW Token - ERC20 token for the VIEW ecosystem
 * 
 * Token Economics:
 * - Total Supply: 1,000,000,000 VIEW (1 billion)
 * - Decimals: 18
 * 
 * Distribution (to be managed by owner):
 * - 30% (300M) - Ad Rewards Pool (transferred to RewardVault)
 * - 70% (700M) - Team, Marketing, Liquidity, etc.
 */
contract VIEWToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant REWARD_POOL_ALLOCATION = 300_000_000 * 10**18; // 300 million for rewards

    bool public rewardPoolTransferred;

    event RewardPoolTransferred(address indexed rewardVault, uint256 amount);

    constructor() ERC20("VIEW Token", "VIEW") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /**
     * @dev Transfer reward pool allocation to RewardVault contract
     * Can only be called once by owner
     * @param rewardVault Address of the RewardVault contract
     */
    function transferRewardPool(address rewardVault) external onlyOwner {
        require(!rewardPoolTransferred, "Reward pool already transferred");
        require(rewardVault != address(0), "Invalid vault address");
        
        rewardPoolTransferred = true;
        _transfer(msg.sender, rewardVault, REWARD_POOL_ALLOCATION);
        
        emit RewardPoolTransferred(rewardVault, REWARD_POOL_ALLOCATION);
    }
}
