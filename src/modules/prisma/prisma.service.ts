import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    console.error('🔴 PrismaService constructor called');
    super({
      log: ['error', 'warn'],
    });
    console.error('🔴 PrismaService super() completed');
  }

  async onModuleInit() {
    console.error('🔴 PrismaService.onModuleInit() CALLED');
    this.logger.log('🔄 Attempting to connect to database...');
    
    try {
      const startTime = Date.now();
      console.error('🔴 About to call $connect()...');
      
      await this.$connect();
      
      const elapsed = Date.now() - startTime;
      console.error(`🔴 ✅ $connect() completed successfully in ${elapsed}ms`);
      this.logger.log(`✅ Database connected in ${elapsed}ms`);
    } catch (err) {
      console.error('🔴 ❌ $connect() FAILED');
      this.logger.error('❌ Failed to connect to database');
      if (err instanceof Error) {
        console.error(`Error message: ${err.message}`);
        console.error(`Error stack: ${err.stack}`);
      } else {
        console.error(`Error: ${JSON.stringify(err)}`);
      }
      throw err;
    }
  }

  async onModuleDestroy() {
    console.error('🔴 PrismaService.onModuleDestroy() called');
    await this.$disconnect();
    console.error('🔴 PrismaService disconnected');
  }
}