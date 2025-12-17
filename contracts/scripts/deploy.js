import hre from "hardhat";
import fs from "fs";

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

    // 1. Deploy VIEW Token
    console.log("\n1. Deploying VIEWToken...");
    const VIEWToken = await hre.ethers.getContractFactory("VIEWToken");
    const viewToken = await VIEWToken.deploy();
    await viewToken.waitForDeployment();
    const viewTokenAddress = await viewToken.getAddress();
    console.log("VIEWToken deployed to:", viewTokenAddress);

    // 2. Deploy RewardVault
    // IMPORTANT: Replace with your actual signer address for production
    const signerAddress = process.env.SIGNER_ADDRESS || deployer.address;

    console.log("\n2. Deploying RewardVault...");
    console.log("Signer address:", signerAddress);

    const RewardVault = await hre.ethers.getContractFactory("RewardVault");
    const rewardVault = await RewardVault.deploy(viewTokenAddress, signerAddress);
    await rewardVault.waitForDeployment();
    const rewardVaultAddress = await rewardVault.getAddress();
    console.log("RewardVault deployed to:", rewardVaultAddress);

    // 3. Transfer reward pool to vault
    console.log("\n3. Transferring reward pool to RewardVault...");
    const tx = await viewToken.transferRewardPool(rewardVaultAddress);
    await tx.wait();
    console.log("Reward pool (300M VIEW) transferred to RewardVault");

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("DEPLOYMENT SUMMARY");
    console.log("=".repeat(50));
    console.log("Network:", hre.network.name);
    console.log("VIEWToken:", viewTokenAddress);
    console.log("RewardVault:", rewardVaultAddress);
    console.log("Signer:", signerAddress);
    console.log("=".repeat(50));

    // Save deployment info to file
    const deploymentInfo = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        contracts: {
            VIEWToken: viewTokenAddress,
            RewardVault: rewardVaultAddress
        },
        signer: signerAddress,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        `./deployments-${hre.network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\nDeployment info saved to deployments-${hre.network.name}.json`);

    // Verify contracts on Polygonscan (if not local network)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\nWaiting for block confirmations before verification...");
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

        console.log("\nVerifying VIEWToken on Polygonscan...");
        try {
            await hre.run("verify:verify", {
                address: viewTokenAddress,
                constructorArguments: []
            });
            console.log("VIEWToken verified!");
        } catch (e) {
            console.log("VIEWToken verification failed:", e.message);
        }

        console.log("\nVerifying RewardVault on Polygonscan...");
        try {
            await hre.run("verify:verify", {
                address: rewardVaultAddress,
                constructorArguments: [viewTokenAddress, signerAddress]
            });
            console.log("RewardVault verified!");
        } catch (e) {
            console.log("RewardVault verification failed:", e.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
