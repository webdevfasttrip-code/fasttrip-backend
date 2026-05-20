const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function apply() {
    try {
        console.log('Applying SQL Enhancements...');
        
        // 1. Add tsv column if not exists
        await prisma.$executeRawUnsafe(`ALTER TABLE airports ADD COLUMN IF NOT EXISTS tsv tsvector;`);
        
        // 2. Update tsv values
        await prisma.$executeRawUnsafe(`
            UPDATE airports 
            SET tsv = setweight(to_tsvector('simple', COALESCE(iata_code, '')), 'A') || 
                      setweight(to_tsvector('simple', COALESCE(city, '')), 'B') || 
                      setweight(to_tsvector('simple', COALESCE(airport_name, '')), 'C');
        `);
        
        // 3. Create GIN index
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS airports_tsv_idx ON airports USING GIN(tsv);`);
        
        // 4. Create other indexes
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS airports_iata_idx ON airports(iata_code);`);
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS airports_city_idx ON airports(city);`);
        
        console.log('SQL Enhancements applied successfully');
    } catch (e) {
        console.error('Error applying SQL enhancements:', e);
    } finally {
        await prisma.$disconnect();
    }
}

apply();
