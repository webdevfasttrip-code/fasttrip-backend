import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(action: string, performedBy: string, targetId?: string) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          action,
          performedBy,
          targetId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for action: ${action}`, error.stack);
    }
  }
}
