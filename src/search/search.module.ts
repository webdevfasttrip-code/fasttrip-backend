import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { AmadeusService } from '../suppliers/amadeus.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';

import { MVFDProvider } from '../flights/providers/flights/mvfd.provider';
import { InternalInventoryProvider } from '../flights/providers/flights/internal-inventory.provider';
import { TypesenseService } from './typesense.service';

@Module({
    imports: [PrismaModule, AdminModule],
    controllers: [SearchController],
    providers: [SearchService, AmadeusService, MVFDProvider, InternalInventoryProvider, TypesenseService],
    exports: [SearchService, TypesenseService],
})
export class SearchModule { }
