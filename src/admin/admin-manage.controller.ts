import { Controller, Post, Get, Param, Body, UseGuards, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin Management')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles(AdminRole.SUPER_ADMIN)
@Controller({
  path: 'admin/manage',
  version: '1',
})
export class AdminManageController {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new admin user (Super Admin only)' })
  async createAdmin(@Body() dto: any, @Req() req: any) {
    const { email, password, name, role, permissions } = dto;
    
    if (!email || !password || !name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    const existingUser = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existingUser) {
        throw new BadRequestException('Admin with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === AdminRole.SUPER_ADMIN ? AdminRole.SUPER_ADMIN : AdminRole.ADMIN;

    const newAdmin = await this.prisma.adminUser.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: assignedRole,
        permissions: permissions || [],
        createdBy: {
          connect: { id: req.user.id }
        }
      },
      select: { id: true, email: true, name: true, role: true, permissions: true, isActive: true }
    });



    return newAdmin;
  }

  @Get('list')
  @ApiOperation({ summary: 'List all admin users (Super Admin only)' })
  async listAdmins() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate an admin user (Super Admin only)' })
  async deactivateAdmin(@Param('id') id: string, @Req() req: any) {
    if (id === req.user.id) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true }
    });



    return updated;
  }
}
