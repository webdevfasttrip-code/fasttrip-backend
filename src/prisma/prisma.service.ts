import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('Database connected 🚀');
        return;
      } catch (err) {
        retries--;
        this.logger.error(
          `Database connection failed. Retrying... (${retries} attempts left)`,
        );
        this.logger.error(err.message);
        if (retries === 0) {
          this.logger.error('Could not connect to database after 5 attempts.');
          throw err;
        }
        // Wait for 5 seconds before retrying (gives Neon time to wake up)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
