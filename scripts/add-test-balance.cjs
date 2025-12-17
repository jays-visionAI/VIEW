// Script to add test claimable balance to a user in Firestore
const admin = require('firebase-admin');

// Initialize with the service account (uses default credentials from gcloud)
admin.initializeApp({
    projectId: 'view-web3-official-1765899415'
});

const db = admin.firestore();

async function addTestBalance() {
    // List all users to find the one we need
    const usersSnapshot = await db.collection('users').get();

    console.log('Found users:');
    usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${doc.id}: ${data.displayName || data.email} (balance: ${data.balance}, claimable: ${data.claimableBalance || 0})`);
    });

    // Update the first user with test claimable balance
    if (!usersSnapshot.empty) {
        const firstUser = usersSnapshot.docs[0];
        await db.collection('users').doc(firstUser.id).update({
            claimableBalance: 500  // 500 VIEW for testing
        });
        console.log(`\n✅ Added 500 VIEW claimable balance to user: ${firstUser.id}`);
    } else {
        console.log('No users found');
    }
}

addTestBalance().then(() => {
    console.log('Done!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
