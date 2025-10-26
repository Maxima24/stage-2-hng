import { Module } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CountriesController } from './countries.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpConfigModule } from '../http-config/http-config.module';
import { PrismaModule } from 'src/modules/prisma/prisma.module';

@Module({
  imports: [ConfigModule, HttpConfigModule, PrismaModule],
  providers: [CountriesService],
  controllers: [CountriesController], 
})
export class CountriesModule {}