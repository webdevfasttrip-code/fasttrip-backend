import { Module } from '@nestjs/common';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { AmadeusClient } from './amadeus.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [FlightsController],
    providers: [FlightsService, AmadeusClient],
    exports: [FlightsService],
})
export class FlightsModule { }
