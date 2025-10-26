import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Param,
  Query,
  Delete,
  NotFoundException,
  Res
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import type {Response} from 'express'

@Controller('countries')
export class CountriesController {
  constructor(private readonly countryService: CountriesService) {}

  @Post('/refresh')
  @HttpCode(201)
  async uploadCountry() {
    console.error('🔴 CONTROLLER uploadCountry() CALLED');
    try {
      console.error('🔴 About to call service...');
      const data = await this.countryService.uploadCountry();
      console.error('🔴 Service returned:', data);
      return data;
    } catch (error) {
      console.error('🔴 Error caught in controller:', error);
      throw error;
    }
  }
  @Get('/image')
@HttpCode(200)
async getImage(@Res() res:Response){
    const imageBuffer = await this.countryService.getSummaryImage()
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer)

}
  @Get(':name')
  @HttpCode(200)
  async getSingleCountry(@Param('name') name: string) {
    const formattedName = name.toLowerCase();
    return await this.countryService.getSingleCountry(formattedName);
  }
  @Get()
  @HttpCode(200)
  async getAllCount(
    @Query('region') region: string,
    @Query('currency') currency: string,
    @Query('sort') sort: string,
  ) {
    return await this.countryService.getAllCountries(region, currency, sort);
  }

 @Delete(':name')
 @HttpCode(204)
 async deleteCountry(@Param('name') name:string){
      const deleted = await this.countryService.deleteCountry(name)
      if(!deleted){
           throw new NotFoundException(`Country with Name ${name} not found`);
      }
      return {
        message:"Country deleted successfully"
      }
 }

}
