// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title RewardVault
 * @dev Manages VIEW token reward claims using server-signed messages
 * 
 * Flow:
 * 1. User earns points off-chain (Firestore) by watching ads
 * 2. User requests claim through backend, which generates a signature
 * 3. User submits claim transaction with signature
 * 4. Contract verifies signature and transfers tokens
 * 
 * Security:
 * - Nonce-based replay protection
 * - Server signature verification
 * - Reentrancy protection
 * - Pausable for emergencies
 */
contract RewardVault is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using SafeERC20 for IERC20;

    IERC20 public immutable viewToken;
    address public signer; // Backend signer address
    
    // Nonce tracking to prevent replay attacks
    mapping(bytes32 => bool) public usedNonces;
    
    // User claim tracking
    mapping(address => uint256) public totalClaimed;
    mapping(address => uint256) public lastClaimTime;
    
    // Pool tracking
    uint256 public constant REWARD_POOL_CAP = 300_000_000 * 10**18; // 300M VIEW
    uint256 public totalDistributed;
    
    // Claim limits
    uint256 public minClaimAmount = 10 * 10**18; // Minimum 10 VIEW per claim
    uint256 public maxClaimAmount = 10_000 * 10**18; // Maximum 10,000 VIEW per claim
    uint256 public claimCooldown = 1 days; // Cooldown between claims

    // Events
    event Claimed(
        address indexed user, 
        uint256 amount, 
        bytes32 indexed nonce,
        uint256 timestamp
    );
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event ClaimLimitsUpdated(uint256 minAmount, uint256 maxAmount, uint256 cooldown);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    constructor(address _token, address _signer) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token address");
        require(_signer != address(0), "Invalid signer address");
        
        viewToken = IERC20(_token);
        signer = _signer;
    }

    /**
     * @dev Claim VIEW tokens with a valid server signature
     * @param amount Amount of VIEW tokens to claim (in wei)
     * @param nonce Unique nonce for this claim (prevents replay)
     * @param expiry Timestamp when the signature expires
     * @param signature Server signature authorizing the claim
     */
    function claim(
        uint256 amount,
        bytes32 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        // Validate claim parameters
        require(amount >= minClaimAmount, "Amount below minimum");
        require(amount <= maxClaimAmount, "Amount exceeds maximum");
        require(block.timestamp <= expiry, "Signature expired");
        require(!usedNonces[nonce], "Nonce already used");
        require(
            block.timestamp >= lastClaimTime[msg.sender] + claimCooldown,
            "Claim cooldown not passed"
        );
        require(
            totalDistributed + amount <= REWARD_POOL_CAP,
            "Reward pool exhausted"
        );
        
        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, amount, nonce, expiry, block.chainid)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        
        require(recoveredSigner == signer, "Invalid signature");
        
        // Update state
        usedNonces[nonce] = true;
        totalClaimed[msg.sender] += amount;
        totalDistributed += amount;
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Transfer tokens
        viewToken.safeTransfer(msg.sender, amount);
        
        emit Claimed(msg.sender, amount, nonce, block.timestamp);
    }

    /**
     * @dev Check if a nonce has been used
     */
    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    /**
     * @dev Get remaining reward pool balance
     */
    function remainingRewardPool() external view returns (uint256) {
        return REWARD_POOL_CAP - totalDistributed;
    }

    /**
     * @dev Get user's next available claim time
     */
    function nextClaimTime(address user) external view returns (uint256) {
        uint256 nextTime = lastClaimTime[user] + claimCooldown;
        return nextTime > block.timestamp ? nextTime : block.timestamp;
    }

    // ============ Admin Functions ============

    /**
     * @dev Update the signer address
     */
    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer address");
        address oldSigner = signer;
        signer = _signer;
        emit SignerUpdated(oldSigner, _signer);
    }

    /**
     * @dev Update claim limits
     */
    function setClaimLimits(
        uint256 _minAmount,
        uint256 _maxAmount,
        uint256 _cooldown
    ) external onlyOwner {
        require(_minAmount <= _maxAmount, "Invalid limits");
        minClaimAmount = _minAmount;
        maxClaimAmount = _maxAmount;
        claimCooldown = _cooldown;
        emit ClaimLimitsUpdated(_minAmount, _maxAmount, _cooldown);
    }

    /**
     * @dev Pause claims in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause claims
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw tokens (only unused tokens)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 balance = viewToken.balanceOf(address(this));
        require(amount <= balance, "Insufficient balance");
        
        viewToken.safeTransfer(owner(), amount);
        emit EmergencyWithdraw(owner(), amount);
    }
}
