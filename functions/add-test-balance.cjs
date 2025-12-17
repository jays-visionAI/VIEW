const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'view-web3-official-1765899415' });
const db = admin.firestore();

async function addTestBalance() {
    const snapshot = await db.collection('users').get();

    console.log('Found users:');
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- ${doc.id}: ${data.displayName || data.email} (balance: ${data.balance}, claimable: ${data.claimableBalance || 0})`);
    });

    if (!snapshot.empty) {
        const firstUser = snapshot.docs[0];
        await db.collection('users').doc(firstUser.id).update({ claimableBalance: 500 });
        console.log(`\n✅ Added 500 VIEW claimable balance to: ${firstUser.id}`);
    }
}

addTestBalance().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
