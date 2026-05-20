import { Controller, Post, Body, UnauthorizedException, ForbiddenException, Req } from '@nestjs/common';
import * as express from 'express';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Admin Auth')
@Controller({
    path: 'admin/auth',
    version: '1',
})
export class AdminAuthController {
    constructor(private readonly adminService: AdminService) { }

    @Post('login')
    @ApiOperation({ summary: 'Admin staff login' })
    @ApiResponse({ status: 201, description: 'JWT token return' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges' })
    async login(@Body() loginDto: any, @Req() req: express.Request) {
        if (!loginDto.email || !loginDto.password) {
            throw new UnauthorizedException('Email and password are required');
        }
        const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
        const userAgent = req.headers['user-agent'];
        return this.adminService.login(loginDto.email, loginDto.password, ipAddress, userAgent);
    }
}
