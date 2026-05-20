import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminService } from '../admin.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'super-secret',
    });
  }

  async validate(payload: { sub: string; email: string; role: string; permissions: string[] }) {
    console.log('Validating admin JWT payload:', JSON.stringify(payload));
    const adminUser = await this.adminService.findById(payload.sub);
    if (!adminUser) {
      console.error(`Admin JWT Validation Failed: User not found for ID: ${payload.sub}`);
      throw new UnauthorizedException('Admin User not found in database. Please log out and re-login.');
    }
    if (!adminUser.isActive) {
      console.error(`Admin JWT Validation Failed: User is inactive: ${adminUser.email}`);
      throw new UnauthorizedException('Admin account is inactive. Contact support.');
    }
    console.log(`Admin JWT Validation Success for: ${adminUser.email} (${adminUser.role})`);
    // Attach to request object
    return {
      ...adminUser,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
