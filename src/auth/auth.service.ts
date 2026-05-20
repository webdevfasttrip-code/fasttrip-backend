import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Provider, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private transporter: nodemailer.Transporter;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: Number(this.configService.get('EMAIL_PORT')),
      secure: false, // configure based on provider (e.g., true for port 465)
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });
  }

  async signup(signupDto: SignupDto) {
    const existingUser = await this.usersService.findByEmail(signupDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    const user = await this.usersService.create({
      email: signupDto.email,
      password: hashedPassword,
      name: signupDto.name,
      phone: signupDto.phone,
      provider: Provider.LOCAL,
      role: UserRole.USER,
    });

    const verificationToken = await this.jwtService.signAsync(
      { sub: user.id },
      { expiresIn: '1d', secret: process.env.JWT_ACCESS_SECRET || 'super-secret' }
    );
    
    const verificationUrl = `http://localhost:5173/verify-email?token=${verificationToken}`;
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM'),
        to: user.email,
        subject: 'Welcome! Verify your email',
        html: `<p>Please verify your email by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`,
      });
      console.log(`Verification email sent to ${user.email}`);
    } catch (err) {
      console.error('Failed to send verification email:', err);
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || user.provider !== Provider.LOCAL || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('User is blocked');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async googleLogin(token: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      if (!payload || !payload.email) {
        throw new BadRequestException('Invalid Google token');
      }

      let user = await this.usersService.findByEmail(payload.email);
      
      if (user) {
        if (user.isBlocked) {
          throw new UnauthorizedException('User is blocked');
        }
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } else {
        user = await this.usersService.create({
          email: payload.email,
          name: payload.name || '',
          provider: Provider.GOOGLE,
          providerId: payload.sub,
          isEmailVerified: true,
          role: UserRole.USER,
        });
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-refresh-secret',
      });
      
      const user = await this.usersService.findById(payload.sub);
      if (!user || user.isBlocked) {
        throw new UnauthorizedException();
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'super-secret',
      });
      
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { isEmailVerified: true },
      });
      return { message: 'Email verified successfully' };
    } catch (e) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.provider !== Provider.LOCAL) {
      return { message: 'If that email is registered, a reset link will be sent.' };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id },
      { expiresIn: '15m', secret: process.env.JWT_ACCESS_SECRET || 'super-secret' }
    );
    
    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
    
    try {
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM'),
        to: user.email,
        subject: 'Password Reset Request',
        html: `<p>You requested a password reset. Click the link below to securely reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
      console.log(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error('Failed to send password reset email:', err);
    }
    
    return { message: 'If that email is registered, a reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'super-secret',
      });
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
      });
      
      return { message: 'Password reset successfully' };
    } catch (e) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'super-secret',
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-refresh-secret',
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
