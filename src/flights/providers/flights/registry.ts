import { AmadeusProvider } from './amadeus.provider';
import { MVFDProvider } from './mvfd.provider';
import { InternalInventoryProvider } from './internal-inventory.provider';
import { PrismaService } from '../../../prisma/prisma.service';

export function getRegisteredProviders(prisma?: any) {
    return [
        new AmadeusProvider(),
        new MVFDProvider(),
        new InternalInventoryProvider(prisma)
    ];
}
