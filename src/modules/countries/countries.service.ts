import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CUSTOM_AXIOS } from './../http-config/http-config.module';
import type { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

import { PrismaService } from 'src/modules/prisma/prisma.service';

export type CurrencyData = {
  code: string;
  name: string;
  symbol: string;
};

export interface Countries {
  name: string;
  capital: string;
  region: string;
  population: number;
  currencies?: CurrencyData[];
  flag: string;
  independent: string;
}

export interface ExchangeRateData {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}
export interface TopCountries{
    name:string,
    estimated_gdp:number|null
}

@Injectable()
export class CountriesService {
  private readonly api_countries: string;
  private readonly api_exchange_rate: string;
  private readonly logger = new Logger(CountriesService.name);
  private readonly cacheDir = path.join(process.cwd(), 'cache');

  constructor(
    @Inject(CUSTOM_AXIOS) private readonly axios: AxiosInstance,
    private readonly configService: ConfigService,
    private readonly db: PrismaService,
  ) {
    this.api_countries = this.configService.get<string>('COUNTRY_DATA_API')!;
    this.api_exchange_rate =
      this.configService.get<string>('EXCHANGE_RATE_URL')!;
    this.ensureCacheDir();
    this.logger.log(`🔧 CountriesService initialized`);
    this.logger.log(`📍 COUNTRY_DATA_API: ${this.api_countries}`);
    this.logger.log(`📍 EXCHANGE_RATE_URL: ${this.api_exchange_rate}`);
  }
  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  private async generateSummaryImage() {
    // Get total count
    const totalCountries = await this.db.country.count();

    // Get top 5 countries by GDP
    const topCountries = await this.db.country.findMany({
      orderBy: { estimated_gdp: 'desc' },
      take: 5,
      select: {
        name: true,
        estimated_gdp: true,
      },
    });

    const width = 800;
    const height = 600;

    // Create SVG content
    const svgContent = this.generateSVG(totalCountries, topCountries);

    // Convert SVG to PNG using sharp
    const imagePath = path.join(this.cacheDir, 'summary.png');
    await sharp(Buffer.from(svgContent)).png().toFile(imagePath);

    console.log(`Summary image saved to ${imagePath}`);
  }

  private generateSVG(totalCountries: number, topCountries: TopCountries[]): string {
    const yPos = 210; // starting vertical position for the country list
    const lineSpacing = 40; // space between each country line
    const width = 800;
    const height = yPos + topCountries.length * lineSpacing + 100;
    const timestamp = new Date().toLocaleString();

    const countryItems = topCountries
  .map((country, index) => {
    const gdpBillions = (country.estimated_gdp! / 1e9).toFixed(2);
    const y = yPos + index * lineSpacing;
    return `
      <text x="60" y="${y}" font-family="Arial" font-size="18" fill="#ffffff">
        ${index + 1}. ${country.name}: $${gdpBillions}B
      </text>
    `;
  })
  .join('');

return `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <!-- Background -->
    <rect width="${width}" height="${height}" fill="#1a1a2e"/>

    <!-- Title -->
    <text x="40" y="70" font-family="Arial" font-size="34" font-weight="bold" fill="#00d4ff">
      Countries Summary Report
    </text>

    <!-- Total Countries -->
    <text x="40" y="130" font-family="Arial" font-size="24" font-weight="bold" fill="#ffffff">
      Total Countries: ${totalCountries}
    </text>

    <!-- Top 5 Header -->
    <text x="40" y="180" font-family="Arial" font-size="22" font-weight="bold" fill="#00d4ff">
      Top 5 Countries by GDP:
    </text>

    <!-- Country List -->
    ${countryItems}

    <!-- Timestamp -->
    <text x="${width - 40}" y="${height - 30}" font-family="Arial" font-size="14" fill="#888888" text-anchor="end">
      Last refreshed: ${timestamp}
    </text>
  </svg>
`;
  }

  private async getExchangeRate(currency_code: string): Promise<number | null> {
    try {
      this.logger.debug(`⏳ Fetching exchange rate for ${currency_code}...`);
      const { data } = await this.axios.get<ExchangeRateData>(
        this.api_exchange_rate,
        { timeout: 5000 },
      );
      this.logger.debug(
        `✅ Exchange rate fetched for ${currency_code}: ${data.rates[currency_code]}`,
      );
      return data.rates[currency_code] || null;
    } catch (err) {
      this.logger.warn(`❌ Exchange rate fetch failed for ${currency_code}`);
      if (err instanceof Error) this.logger.warn(err.message);
      return null;
    }
  }

  private calculateEstimatedGdp(
    exchangeRate: number | null,
    population: number,
  ): number | null {
    if (exchangeRate == null) return null;
    const multiplier = Math.random() * (2000 - 1000) + 1000;
    return population * multiplier * exchangeRate;
  }
  private capitalizeFirstWord(str:string){

    return str.charAt(0).toUpperCase()+str.slice(1)
  }
  async uploadCountry() {
    console.error('🔴 SERVICE uploadCountry() CALLED - IMMEDIATE'); // Force to stderr
    this.logger.error('═══════════════════════════════════════');
    this.logger.error('🚀 uploadCountry() called');
    this.logger.error('═══════════════════════════════════════');

    try {
      if (!this.api_countries) {
        const error = 'COUNTRY_DATA_API is not defined';
        this.logger.error(`❌ ${error}`);
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      this.logger.error(`⏳ Step 1: Fetching countries from API...`);
      this.logger.error(`📌 URL: ${this.api_countries}`);
      this.logger.error(
        `📌 Axios instance timeout: ${this.axios.defaults.timeout}ms`,
      );

      let data: Countries[] = [];
      try {
        console.error('🔴 About to make axios GET request...');
        const startTime = Date.now();

        const response = await this.axios.get<Countries[]>(this.api_countries);

        const elapsed = Date.now() - startTime;
        console.error(`🔴 Axios request completed in ${elapsed}ms`);
        data = response.data;
        this.logger.error(
          `✅ Step 1 Complete: Received ${data.length} countries in ${elapsed}ms`,
        );
      } catch (apiErr) {
        this.logger.error(
          `❌ Step 1 Failed: Could not fetch countries from API`,
        );
        throw new HttpException(
          {
            error: 'External data source unavailable',
            details: `Could not fetch from ${this.api_countries}`,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );

        if (apiErr instanceof Error) {
          this.logger.error(`   Error: ${apiErr.message}`);
        }
        throw apiErr;
      }

      if (!Array.isArray(data)) {
        throw new Error(
          `Invalid API response: expected array, got ${typeof data}`,
        );
      }

      this.logger.log(
        `⏳ Step 2: Processing ${data.length} countries in batches...`,
      );
      const batchSize = 10;
      let processed = 0;
      let created = 0;
      let updated = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        this.logger.log(
          `   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)}: Processing items ${i} to ${Math.min(i + batchSize - 1, data.length - 1)}`,
        );

        const batchResults = await Promise.allSettled(
          batch.map(async (country) => {
            try {
              const nameLower = country.name.toLowerCase();

              const existing = await this.db.country.findFirst({
                where: { name: { equals: nameLower } },
              });

              if (existing) {
                const multiplier =
                  Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
                const refetched_estimated_gdp =
                  country.population *
                  (existing.exchange_rate || 0) *
                  multiplier;

                await this.db.country.update({
                  where: { name: nameLower },
                  data: {
                    capital: country.capital,
                    region: country.region,
                    population: country.population,
                    currency_code: existing.currency_code,
                    exchange_rate: existing.exchange_rate,
                    estimated_gdp: refetched_estimated_gdp,
                    flag_url: existing.flag_url,
                  },
                });
                this.logger.debug(`   ✅ Updated: ${country.name}`);
                updated++;
                await this.generateSummaryImage();
                return { status: 'updated', country: country.name };
              }

              const currencyCode = country.currencies?.[0]?.code ?? null;
              const exchangeRate = currencyCode
                ? await this.getExchangeRate(currencyCode)
                : null;
              const estimated_gdp = this.calculateEstimatedGdp(
                exchangeRate,
                country.population,
              );

              const newCountry = {
                name: nameLower,
                capital: country.capital,
                region: country.region,
                population: country.population,
                currency_code: currencyCode,
                exchange_rate: exchangeRate,
                estimated_gdp: estimated_gdp,
                flag_url: country.flag,
              };

              await this.db.country.create({ data: newCountry });
              this.logger.debug(`   🆕 Created: ${country.name}`);
              created++;
              await this.generateSummaryImage();
              return { status: 'created', country: country.name };
            } catch (itemErr) {
              this.logger.error(`   ❌ Failed to process ${country.name}`);
              if (itemErr instanceof Error) {
                this.logger.error(`      ${itemErr.message}`);
              }
              return {
                status: 'failed',
                country: country.name,
                error: itemErr,
              };
            }
          }),
        );

        const batchCreated = batchResults.filter(
          (r) => r.status === 'fulfilled' && r.value?.status === 'created',
        ).length;
        const batchUpdated = batchResults.filter(
          (r) => r.status === 'fulfilled' && r.value?.status === 'updated',
        ).length;
        const batchFailed = batchResults.filter(
          (r) => r.status === 'rejected',
        ).length;

        processed += batch.length;
        this.logger.log(
          `   ✓ Batch complete [Created: ${batchCreated}, Updated: ${batchUpdated}, Failed: ${batchFailed}]`,
        );
      }

      this.logger.log(`✅ Step 2 Complete: All countries processed`);
      this.logger.log('═══════════════════════════════════════');
      this.logger.log(`🎉 UPLOAD COMPLETE`);
      this.logger.log(`   Total Created: ${created}`);
      this.logger.log(`   Total Updated: ${updated}`);
      this.logger.log(`   Total Processed: ${processed}`);
      this.logger.log('═══════════════════════════════════════');

      return { created, updated, total: processed };
    } catch (err) {
      this.logger.error('═══════════════════════════════════════');
      this.logger.error('❌ UPLOAD FAILED');
      if (err instanceof Error) {
        this.logger.error(`Error: ${err.message}`);
        this.logger.error(`Stack: ${err.stack}`);
      } else {
        this.logger.error(`Error: ${JSON.stringify(err)}`);
      }
      this.logger.error('═══════════════════════════════════════');

      throw new HttpException(
        'Failed to upload countries',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getSingleCountry(name:string){
     try{
         const data = await this.db.country.findFirst({
        where:{name}
    })
    if(!data){
        throw new NotFoundException({
            error:"Country not Found"
        })
    }   
    return data
    }catch(error){
        if(error instanceof HttpException){
            throw error
        }else{
            throw new HttpException("Internal server Error",HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
   
  }
  async deleteCountry(name:string){
     try{
         return await this.db.country.delete({
        where:{name}
    })
    }catch(error){
        if(error instanceof HttpException){
            throw error
        }else{
            throw new HttpException("Internal server Error",HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
  

  }
  async getAllCountries(region:string,currency:string,sort:string){
     try{
           const filters:any ={}
        if(!region && !currency && !sort){
            return await this.db.country.findMany({})
        }
        if(region){
            const formatted_region =this.capitalizeFirstWord(region)
            this.logger.debug(formatted_region)
            filters.region ={equals:formatted_region}
        }
        if(currency){
            filters.currency_code ={equals:currency.toUpperCase()}
        }
        if(sort === "gdp_asc"){
            filters.sort = "asc"
        }else if(sort === "gdp_desc"){
            filters.sort ="desc"
        }
        const country = await this.db.country.findMany({
            where:filters,
            orderBy:{estimated_gdp:filters.sort}
         })
          if(!country || country.length === 0){
            throw new NotFoundException({
                error:"Country not found"
            })
         }
         this.logger.debug("country retrieved successfully")
           return country
    }catch(error){
        if(error instanceof HttpException){
            throw error
        }else{
            throw new HttpException("Internal server Error",HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
      
  }
  async getStatus(){
    try{
          const last_refreshed_at =  new Date()
    const total_countries =  await this.db.country.count()
    return {
        total_countries,
        last_refreshed_at
    }
    }catch(error){
        if(error instanceof HttpException){
            throw error
        }else{
            throw new HttpException("Internal server Error",HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
  
  }
  async getSummaryImage(){
     try{
          const imagePath = path.join(this.cacheDir, 'summary.png');
      if (!fs.existsSync(imagePath)) {
      throw new NotFoundException({
        error:"Summary image not found"
      });
    }
      return fs.readFileSync(imagePath);
    }catch(error){
        if(error instanceof HttpException){
            throw error
        }else{
            throw new HttpException("Internal server Error",HttpStatus.INTERNAL_SERVER_ERROR)
        }
    }
   
  }
}
