
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const PROJECT_ID = 'view-web3-official-1765899415';

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: PROJECT_ID,
    });
}

const db = admin.firestore();

async function uploadTaxonomy() {
    console.log('🚀 Starting Taxonomy Upload...\n');

    try {
        // 1. Upload Industry Taxonomy (v1.1)
        const industryPath = path.join(__dirname, '../../industry_taxonomy_v1_1.yaml');
        if (fs.existsSync(industryPath)) {
            const industryYaml = fs.readFileSync(industryPath, 'utf8');
            const industryData: any = yaml.load(industryYaml);

            await db.doc('settings/taxonomy_industry').set({
                version: industryData.version || '1.1',
                type: 'industry',
                lastUpdated: industryData.last_updated || new Date().toISOString().split('T')[0],
                taxonomy: industryData.taxonomy,
                uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`✅ Industry Taxonomy v${industryData.version} uploaded to settings/taxonomy_industry`);
        } else {
            console.warn('⚠️ Industry Taxonomy file not found at:', industryPath);
        }

        // 2. Upload Attribute Taxonomy (v1.0)
        const attributePath = path.join(__dirname, '../../attribute_taxonomy_v1_0.yaml');
        if (fs.existsSync(attributePath)) {
            const attributeYaml = fs.readFileSync(attributePath, 'utf8');
            const attributeData: any = yaml.load(attributeYaml);

            await db.doc('settings/taxonomy_attributes').set({
                version: attributeData.version || '1.0',
                type: 'attributes',
                lastUpdated: attributeData.last_updated || new Date().toISOString().split('T')[0],
                attributes: attributeData.attributes,
                uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`✅ Attribute Taxonomy v${attributeData.version} uploaded to settings/taxonomy_attributes`);
        } else {
            console.warn('⚠️ Attribute Taxonomy file not found at:', attributePath);
        }

        // 3. Update Meta
        await db.doc('settings/taxonomy_meta').set({
            industryVersion: '1.1',
            attributeVersion: '1.0',
            lastSync: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
        });
        console.log('✅ Taxonomy Metadata updated');

        console.log('\n🎉 Taxonomy upload complete!');
    } catch (error) {
        console.error('\n❌ Upload failed:', error);
    }
}

uploadTaxonomy()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
