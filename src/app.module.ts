import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { HttpConfigModule } from './modules/http-config/http-config.module';
import { CountriesModule } from './modules/countries/countries.module';
import { PrismaModule } from 'src/modules/prisma/prisma.module';
import { StatusController } from './modules/status/status.controller';
import { StatusModule } from './modules/status/status.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpConfigModule,
    PrismaModule,
    CountriesModule,
    StatusModule,
  ],
  controllers: [AppController, StatusController],
  providers: [AppService],
})
export class AppModule {}