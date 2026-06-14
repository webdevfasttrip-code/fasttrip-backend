import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Client } from 'typesense';

@Injectable()
export class TypesenseService implements OnModuleInit {
    private readonly logger = new Logger(TypesenseService.name);
    private client: Client;

    constructor(private readonly prisma: PrismaService) {
        let host = process.env.TYPESENSE_HOST || 'localhost';
        let port = parseInt(process.env.TYPESENSE_PORT || '8108', 10);
        let protocol = process.env.TYPESENSE_PROTOCOL || 'http';

        if (process.env.TYPESENSE_URL) {
            try {
                const url = new URL(process.env.TYPESENSE_URL);
                protocol = url.protocol.replace(':', '');
                host = url.hostname;
                port = parseInt(url.port || (protocol === 'https' ? '443' : '80'), 10);
            } catch (e) {
                this.logger.error('Invalid TYPESENSE_URL', e);
            }
        }

        this.client = new Client({
            nodes: [
                {
                    host,
                    port,
                    protocol,
                },
            ],
            apiKey: process.env.TYPESENSE_API_KEY || 'xyz123',
            connectionTimeoutSeconds: 2,
        });
    }

    async onModuleInit() {
        await this.initSchema();
    }

    private async initSchema() {
        try {
            const collections = await this.client.collections().retrieve();
            const exists = collections.some((c: any) => c.name === 'airports');
            
            if (!exists) {
                this.logger.log('Creating airports schema in Typesense...');
                await this.client.collections().create({
                    name: 'airports',
                    fields: [
                        { name: 'iata', type: 'string' },
                        { name: 'name', type: 'string' },
                        { name: 'city', type: 'string' },
                        { name: 'country', type: 'string' },
                        { name: 'lat', type: 'float' },
                        { name: 'lng', type: 'float' },
                        { name: 'score', type: 'int32' }
                    ],
                    default_sorting_field: 'score'
                });
                this.logger.log('Airports schema created.');
                // Trigger an initial sync in background
                this.syncAirports().catch(e => this.logger.error('Initial sync failed', e));
            }
        } catch (error) {
            this.logger.error('Failed to initialize Typesense schema', error);
        }
    }

    async syncAirports() {
        this.logger.log('Starting Airport sync to Typesense...');
        try {
            const airports = await this.prisma.airport.findMany({
                where: {
                    isSearchable: true,
                    airportType: { notIn: ['MILITARY', 'PRIVATE'] },
                    iataCode: { not: null }
                }
            });

            const documents = airports.map(airport => {
                let score = 0;
                // Basic scoring
                if (airport.isoCountry === 'IN') score += 2500;
                const topTier = ['DEL', 'BOM', 'BLR', 'MAA', 'HYD', 'CCU', 'GOI', 'GOX'];
                const secondTier = ['DXB', 'SIN', 'BKK'];
                if (airport.iataCode && topTier.includes(airport.iataCode)) score += 2000;
                else if (airport.iataCode && secondTier.includes(airport.iataCode)) score += 1500;
                if (airport.isMajor) score += 200;
                score += (airport.priorityScore || 0);

                return {
                    id: airport.iataCode,
                    iata: airport.iataCode,
                    name: airport.airportName || '',
                    city: airport.city || '',
                    country: airport.isoCountry || '',
                    lat: airport.latitude || 0,
                    lng: airport.longitude || 0,
                    score: score
                };
            });

            if (documents.length > 0) {
                await this.client.collections('airports').documents().import(documents, { action: 'upsert' });
                this.logger.log(`Successfully synced ${documents.length} airports to Typesense.`);
            }
            return { message: `Synced ${documents.length} airports`, success: true };
        } catch (error) {
            this.logger.error('Error syncing airports to Typesense', error);
            throw error;
        }
    }

    async searchAirports(query: string, limit: number = 10) {
        if (!query || query.length < 2) return [];
        try {
            const searchResults = await this.client.collections('airports').documents().search({
                q: query,
                query_by: 'iata,city,name',
                per_page: limit,
                sort_by: 'score:desc',
                typo_tokens_threshold: 1,
            });

            return searchResults.hits?.map((hit: any) => {
                const doc = hit.document;
                return {
                    id: doc.id,
                    iataCode: doc.iata,
                    airportName: doc.name,
                    city: doc.city,
                    isoCountry: doc.country,
                    score: doc.score,
                    // Frontend compatibility
                    airport_name: doc.name,
                    iata_code: doc.iata,
                    iso_country: doc.country,
                };
            }) || [];
        } catch (error) {
            this.logger.error('Typesense search failed', error);
            return [];
        }
    }
}
