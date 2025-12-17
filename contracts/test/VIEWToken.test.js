import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("VIEW Token & RewardVault", function () {
    let viewToken;
    let rewardVault;
    let owner;
    let signer;
    let user1;
    let user2;

    const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion
    const REWARD_POOL = ethers.parseEther("300000000"); // 300 million

    beforeEach(async function () {
        [owner, signer, user1, user2] = await ethers.getSigners();

        // Deploy VIEWToken
        const VIEWToken = await ethers.getContractFactory("VIEWToken");
        viewToken = await VIEWToken.deploy();
        await viewToken.waitForDeployment();

        // Deploy RewardVault
        const RewardVault = await ethers.getContractFactory("RewardVault");
        rewardVault = await RewardVault.deploy(
            await viewToken.getAddress(),
            signer.address
        );
        await rewardVault.waitForDeployment();
    });

    describe("VIEWToken", function () {
        it("Should have correct name and symbol", async function () {
            expect(await viewToken.name()).to.equal("VIEW Token");
            expect(await viewToken.symbol()).to.equal("VIEW");
        });

        it("Should mint total supply to owner", async function () {
            expect(await viewToken.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
        });

        it("Should transfer reward pool to vault", async function () {
            await viewToken.transferRewardPool(await rewardVault.getAddress());

            expect(await viewToken.balanceOf(await rewardVault.getAddress())).to.equal(REWARD_POOL);
            expect(await viewToken.rewardPoolTransferred()).to.be.true;
        });

        it("Should not allow transferring reward pool twice", async function () {
            await viewToken.transferRewardPool(await rewardVault.getAddress());

            await expect(
                viewToken.transferRewardPool(await rewardVault.getAddress())
            ).to.be.revertedWith("Reward pool already transferred");
        });
    });

    describe("RewardVault", function () {
        beforeEach(async function () {
            // Transfer reward pool to vault
            await viewToken.transferRewardPool(await rewardVault.getAddress());
        });

        it("Should have correct initial state", async function () {
            expect(await rewardVault.signer()).to.equal(signer.address);
            expect(await rewardVault.totalDistributed()).to.equal(0);
        });

        it("Should allow valid claims", async function () {
            const amount = ethers.parseEther("100");
            const nonce = ethers.randomBytes(32);
            const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const chainId = (await ethers.provider.getNetwork()).chainId;

            // Create signature
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "bytes32", "uint256", "uint256"],
                [user1.address, amount, nonce, expiry, chainId]
            );
            const signature = await signer.signMessage(ethers.getBytes(messageHash));

            // Claim
            await rewardVault.connect(user1).claim(amount, nonce, expiry, signature);

            expect(await viewToken.balanceOf(user1.address)).to.equal(amount);
            expect(await rewardVault.totalClaimed(user1.address)).to.equal(amount);
            expect(await rewardVault.totalDistributed()).to.equal(amount);
        });

        it("Should reject claims with invalid signature", async function () {
            const amount = ethers.parseEther("100");
            const nonce = ethers.randomBytes(32);
            const expiry = Math.floor(Date.now() / 1000) + 3600;
            const chainId = (await ethers.provider.getNetwork()).chainId;

            // Create signature with wrong signer
            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "bytes32", "uint256", "uint256"],
                [user1.address, amount, nonce, expiry, chainId]
            );
            const signature = await user2.signMessage(ethers.getBytes(messageHash)); // Wrong signer

            await expect(
                rewardVault.connect(user1).claim(amount, nonce, expiry, signature)
            ).to.be.revertedWith("Invalid signature");
        });

        it("Should reject claims with used nonce", async function () {
            const amount = ethers.parseEther("100");
            const nonce = ethers.randomBytes(32);
            const expiry = Math.floor(Date.now() / 1000) + 3600;
            const chainId = (await ethers.provider.getNetwork()).chainId;

            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "bytes32", "uint256", "uint256"],
                [user1.address, amount, nonce, expiry, chainId]
            );
            const signature = await signer.signMessage(ethers.getBytes(messageHash));

            // First claim
            await rewardVault.connect(user1).claim(amount, nonce, expiry, signature);

            // Second claim with same nonce should fail
            await expect(
                rewardVault.connect(user1).claim(amount, nonce, expiry, signature)
            ).to.be.revertedWith("Nonce already used");
        });

        it("Should reject expired signatures", async function () {
            const amount = ethers.parseEther("100");
            const nonce = ethers.randomBytes(32);
            const expiry = Math.floor(Date.now() / 1000) - 3600; // Expired 1 hour ago
            const chainId = (await ethers.provider.getNetwork()).chainId;

            const messageHash = ethers.solidityPackedKeccak256(
                ["address", "uint256", "bytes32", "uint256", "uint256"],
                [user1.address, amount, nonce, expiry, chainId]
            );
            const signature = await signer.signMessage(ethers.getBytes(messageHash));

            await expect(
                rewardVault.connect(user1).claim(amount, nonce, expiry, signature)
            ).to.be.revertedWith("Signature expired");
        });

        it("Should enforce claim cooldown", async function () {
            const amount = ethers.parseEther("100");
            const chainId = (await ethers.provider.getNetwork()).chainId;

            // First claim
            const nonce1 = ethers.randomBytes(32);
            const expiry1 = Math.floor(Date.now() / 1000) + 3600;
            const messageHash1 = ethers.solidityPackedKeccak256(
                ["address", "uint256", "bytes32", "uint256", "uint256"],
                [user1.address, amount, nonce1, expiry1, chainId]
            );
            const signature1 = await signer.signMessage(ethers.getBytes(messageHash1));
            await rewardVault.connect(user1).claim(amount, nonce1, expiry1, signature1);

            // Second claim immediately should fail
            const nonce2 = ethers.randomBytes(32);
            const expiry2 = Math.floor(Date.now() / 1000) + 3600;
            const messageHash2 = ethers.solidityPackedKeccak256(
                ["address", "uint256", "bytes32", "uint256", "uint256"],
                [user1.address, amount, nonce2, expiry2, chainId]
            );
            const signature2 = await signer.signMessage(ethers.getBytes(messageHash2));

            await expect(
                rewardVault.connect(user1).claim(amount, nonce2, expiry2, signature2)
            ).to.be.revertedWith("Claim cooldown not passed");
        });

        it("Should allow owner to update signer", async function () {
            await rewardVault.setSigner(user2.address);
            expect(await rewardVault.signer()).to.equal(user2.address);
        });

        it("Should allow owner to pause and unpause", async function () {
            await rewardVault.pause();
            expect(await rewardVault.paused()).to.be.true;

            await rewardVault.unpause();
            expect(await rewardVault.paused()).to.be.false;
        });
    });
});
