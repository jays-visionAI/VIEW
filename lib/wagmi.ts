import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonAmoy } from 'wagmi/chains';

// WalletConnect ProjectID - Get yours at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = getDefaultConfig({
    appName: 'VIEW App',
    projectId: WALLETCONNECT_PROJECT_ID,
    chains: [
        polygonAmoy,  // Testnet first for easier testing
        polygon,
    ],
    ssr: false,
});

// Contract addresses - Update after deployment
export const CONTRACTS = {
    // Polygon Mainnet
    137: {
        VIEW_TOKEN: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        REWARD_VAULT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    },
    // Polygon Amoy Testnet
    80002: {
        VIEW_TOKEN: '0x8409fddE32D8C26182E6396e00C437a38873fEB4',
        REWARD_VAULT: '0xe6ad281C91165781E98b4EAe2bCd3FFcaA7C412A',
    },
} as const;

// ABI for VIEW Token (minimal for balance checking)
export const VIEW_TOKEN_ABI = [
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// ABI for RewardVault (claim function)
export const REWARD_VAULT_ABI = [
    {
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'expiry', type: 'uint256' },
            { name: 'signature', type: 'bytes' },
        ],
        name: 'claim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'totalClaimed',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'user', type: 'address' }],
        name: 'nextClaimTime',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'remainingRewardPool',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'nonce', type: 'bytes32' }],
        name: 'isNonceUsed',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;
