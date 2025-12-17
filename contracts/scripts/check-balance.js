// Script to check RewardVault balance on Polygon Amoy
import hre from "hardhat";

async function main() {
    const VIEW_TOKEN = "0x8409fddE32D8C26182E6396e00C437a38873fEB4";
    const REWARD_VAULT = "0xe6ad281C91165781E98b4EAe2bCd3FFcaA7C412A";

    // Get VIEW Token contract
    const viewToken = await hre.ethers.getContractAt("VIEWToken", VIEW_TOKEN);

    // Check balances
    const vaultBalance = await viewToken.balanceOf(REWARD_VAULT);
    console.log("\n=== RewardVault Balance ===");
    console.log("VIEW Token Balance:", hre.ethers.formatEther(vaultBalance), "VIEW");

    // Check total supply
    const totalSupply = await viewToken.totalSupply();
    console.log("Total Supply:", hre.ethers.formatEther(totalSupply), "VIEW");

    // Check if reward pool was transferred
    const rewardPoolTransferred = await viewToken.rewardPoolTransferred();
    console.log("Reward Pool Transferred:", rewardPoolTransferred);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
