import { Module } from '@nestjs/common';
import { CountriesService } from '../countries/countries.service';
import { ConfigModule } from '@nestjs/config';
import { HttpConfigModule } from '../http-config/http-config.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
      imports: [ConfigModule, HttpConfigModule, PrismaModule],
    providers:[CountriesService],
    exports:[CountriesService]
})
export class StatusModule {
 
}
