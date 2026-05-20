import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersAdminService } from './users-admin.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller({
    path: 'admin/users',
    version: '1',
})
@UseGuards(AuthGuard('admin-jwt'), RolesGuard, PermissionsGuard)
@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN)
export class UsersAdminController {
    constructor(private readonly usersService: UsersAdminService) { }

    @Get()
    @ApiOperation({ summary: 'List all regular users' })
    @Permissions('MANAGE_USERS')
    findAll() {
        return this.usersService.findAll();
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get user registration statistics' })
    @Permissions('MANAGE_USERS')
    getStats() {
        return this.usersService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get details for a specific user' })
    @Permissions('MANAGE_USERS')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id/block')
    @ApiOperation({ summary: 'Toggle block status for a user' })
    @Permissions('MANAGE_USERS')
    toggleBlock(@Param('id') id: string) {
        return this.usersService.toggleBlock(id);
    }
}
