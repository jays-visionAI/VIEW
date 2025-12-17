import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const CONTRACTS_DIR = path.join(ROOT_DIR, "contracts");
const FUNCTIONS_DIR = path.join(ROOT_DIR, "functions");

function generateWallet(role) {
    const wallet = ethers.Wallet.createRandom();
    console.log(`\n🔑 [${role} Wallet] Generated`);
    console.log(`Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    return wallet;
}

function updateEnvFile(filePath, key, value) {
    let content = "";
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, "utf8");
    }

    if (content.includes(`${key}=`)) {
        // Replace existing key
        const regex = new RegExp(`${key}=.*`, "g");
        content = content.replace(regex, `${key}=${value}`);
        console.log(`Updated ${key} in ${path.basename(filePath)}`);
    } else {
        // Append new key
        if (content && !content.endsWith("\n")) content += "\n";
        content += `${key}=${value}\n`;
        console.log(`Added ${key} to ${path.basename(filePath)}`);
    }

    fs.writeFileSync(filePath, content);
}

async function main() {
    console.log("🚀 Starting Automatic Test Key Setup...");

    // 1. Generate Wallets
    const deployerWallet = generateWallet("Deployer (Deploys Contracts)");
    const signerWallet = generateWallet("Signer (Approves Claims)");

    // 2. Setup Contracts .env
    const contractsEnvPath = path.join(CONTRACTS_DIR, ".env");
    console.log(`\n📂 Setting up ${contractsEnvPath}...`);

    // Ensure .env exists (copy example if needed, but here we just write/append)
    updateEnvFile(contractsEnvPath, "DEPLOYER_PRIVATE_KEY", deployerWallet.privateKey);
    updateEnvFile(contractsEnvPath, "SIGNER_PRIVATE_KEY", signerWallet.privateKey); // Optional in contracts, but good for testing
    // Also set Signer Address for deployment script usage
    updateEnvFile(contractsEnvPath, "SIGNER_ADDRESS", signerWallet.address);

    // 3. Setup Functions .env (For local testing)
    const functionsEnvPath = path.join(FUNCTIONS_DIR, ".env");
    console.log(`\n📂 Setting up ${functionsEnvPath}...`);
    updateEnvFile(functionsEnvPath, "SIGNER_PRIVATE_KEY", signerWallet.privateKey);

    // 4. Summary
    console.log("\n✅ Setup Complete!");
    console.log("----------------------------------------");
    console.log("⚠️  IMPORTANT NEXT STEPS:");
    console.log(`1. Send Testnet MATIC to the DEPLOYER ADDRESS: ${deployerWallet.address}`);
    console.log("   (Use https://faucet.polygon.technology/)");
    console.log("2. Then run: cd contracts && npx hardhat run scripts/deploy.js --network polygonAmoy");
    console.log("----------------------------------------");
}

main().catch(console.error);
