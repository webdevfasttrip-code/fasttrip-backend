import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MarkupService } from './markup/markup.service';
import { MarkupController } from './markup/markup.controller';
import { SeriesFareService } from './series-fares/series-fares.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminManageController } from './admin-manage.controller';
import { AdminRevenueController } from './revenue/admin-revenue.controller';
import { CRMController } from './crm/crm.controller';
import { CRMService } from './crm/crm.service';
import { SupplierController } from './supplier/supplier.controller';
import { SupplierService } from './supplier/supplier.service';
import { VisaAdminController } from '../visa/visa-admin.controller';
import { VisaService } from '../visa/visa.service';

import { FlightsModule } from '../flights/flights.module';

import { MasterAdminController } from './master/master-admin.controller';
import { MasterAdminService } from './master/master-admin.service';

@Module({
    imports: [
        PrismaModule,
        ConfigModule,
        FlightsModule,
        PassportModule.register({ defaultStrategy: 'admin-jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_ACCESS_SECRET') || 'super-secret',
                signOptions: {
                    expiresIn: '1d',
                },
            }),
        }),
    ],
    controllers: [
        AdminAuthController,
        AdminController,
        AdminManageController,
        MarkupController,
        AdminRevenueController,
        CRMController,
        SupplierController,
        MasterAdminController,
        VisaAdminController,
    ],
    providers: [
        AdminService,
        MarkupService,
        SeriesFareService,
        AdminJwtStrategy,
        CRMService,
        SupplierService,
        MasterAdminService,
        VisaService,
    ],
    exports: [AdminService, MarkupService, SeriesFareService, CRMService, SupplierService, MasterAdminService, AdminJwtStrategy, PassportModule],
})
export class AdminModule { }
