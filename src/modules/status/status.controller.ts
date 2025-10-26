import { Controller,Get, HttpCode } from '@nestjs/common';
import { CountriesService } from '../countries/countries.service';

@Controller('status')
export class StatusController {
    constructor(private readonly countryService:CountriesService){}
    @Get()
    @HttpCode(200)
    async getStatus(){
         return await this.countryService.getStatus()
    }
}
