import fetch from 'node-fetch';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkConnectivity() {
    console.log('--- Connectivity Diagnostics ---');

    // 1. Check Amadeus
    const amadeusUrl = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com';
    console.log(`Checking Amadeus API (${amadeusUrl})...`);
    try {
        const start = Date.now();
        const response = await fetch(`${amadeusUrl}/v1/security/oauth2/token`, {
            method: 'POST',
            timeout: 10000
        });
        const duration = Date.now() - start;
        console.log(`✅ Amadeus API is reachable (Status: ${response.status}, Time: ${duration}ms)`);
    } catch (error) {
        console.error(`❌ Amadeus API is NOT reachable: ${error.message}`);
    }

    // 2. Check Database
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        console.log('\nChecking Database connection...');
        const client = new Client({
            connectionString: dbUrl,
            connectionTimeoutMillis: 10000,
        });
        try {
            const start = Date.now();
            await client.connect();
            const duration = Date.now() - start;
            console.log(`✅ Database is reachable (Time: ${duration}ms)`);
            await client.end();
        } catch (error) {
            console.error(`❌ Database is NOT reachable: ${error.message}`);
            if (error.message.includes('ENOTFOUND')) {
                console.log('   Tip: The hostname could not be resolved. Check your internet or DNS.');
            } else if (error.message.includes('ETIMEDOUT')) {
                console.log('   Tip: The connection timed out. The database server or your firewall might be blocking it.');
            }
        }
    } else {
        console.log('\n⚠️ DATABASE_URL not found in .env');
    }

    console.log('\n--- End of Diagnostics ---');
}

checkConnectivity();
