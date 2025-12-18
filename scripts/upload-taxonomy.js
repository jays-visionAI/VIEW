/**
 * Upload Taxonomy to Firestore
 * 
 * Usage: node scripts/upload-taxonomy.js
 * 
 * This script reads the YAML taxonomy files and uploads them to Firestore
 * for dynamic runtime loading.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';

if (!admin.apps.length) {
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(path.resolve(serviceAccountPath));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        // Use default credentials (for Cloud Functions environment)
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function uploadTaxonomy() {
    console.log('📦 Starting taxonomy upload to Firestore...\n');

    // 1. Upload Industry Taxonomy
    const industryPath = path.join(__dirname, '..', 'industry_taxonomy_v1_1.yaml');
    if (fs.existsSync(industryPath)) {
        const industryYaml = fs.readFileSync(industryPath, 'utf8');
        const industryData = yaml.load(industryYaml);

        await db.doc('settings/taxonomy_industry').set({
            version: industryData.version,
            type: 'industry',
            lastUpdated: industryData.last_updated,
            maintainer: industryData.maintainer,
            taxonomy: industryData.taxonomy,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log('✅ Industry taxonomy uploaded');
        console.log(`   Version: ${industryData.version}`);
        console.log(`   Industries: ${Object.keys(industryData.taxonomy).length}`);
    } else {
        console.log('⚠️  Industry taxonomy file not found:', industryPath);
    }

    // 2. Upload Attribute Taxonomy
    const attributePath = path.join(__dirname, '..', 'attribute_taxonomy_v1_0.yaml');
    if (fs.existsSync(attributePath)) {
        const attributeYaml = fs.readFileSync(attributePath, 'utf8');
        const attributeData = yaml.load(attributeYaml);

        await db.doc('settings/taxonomy_attributes').set({
            version: attributeData.version,
            type: 'attributes',
            lastUpdated: attributeData.last_updated,
            maintainer: attributeData.maintainer,
            attributes: attributeData.attributes,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log('✅ Attribute taxonomy uploaded');
        console.log(`   Version: ${attributeData.version}`);
        console.log(`   Attribute types: ${Object.keys(attributeData.attributes).length}`);
    } else {
        console.log('⚠️  Attribute taxonomy file not found:', attributePath);
    }

    // 3. Create combined metadata document
    await db.doc('settings/taxonomy_meta').set({
        industryVersion: '1.1',
        attributeVersion: '1.0',
        lastSync: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
    });

    console.log('\n✅ All taxonomies uploaded successfully!');
    console.log('\nFirestore documents created:');
    console.log('  - settings/taxonomy_industry');
    console.log('  - settings/taxonomy_attributes');
    console.log('  - settings/taxonomy_meta');
}

uploadTaxonomy()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error uploading taxonomy:', error);
        process.exit(1);
    });
