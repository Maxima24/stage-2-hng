# Countries API

A progressive NestJS backend application that fetches, manages, and visualizes country data with automatic image generation.

## Overview

This project provides a REST API to manage country information including GDP data. It features:

- **Country Management**: Fetch and store country data from external APIs
- **Data Refresh**: Periodically refresh country data with timeout handling
- **Image Generation**: Automatically generates PNG summary reports with statistics
- **Image Serving**: Serve generated summary images via HTTP endpoint
- **Error Handling**: Comprehensive HTTP exception handling for API failures

## Features

- 🌍 External API integration with timeout protection
- 📊 Automatic PNG image generation with country statistics
- 💾 Prisma ORM for database management
- 📈 Top 5 countries ranking by GDP
- 🖼️ Cache management for generated images
- ⚡ TypeScript for type safety
- 🔧 Express.js under the hood

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **ORM**: Prisma
- **Image Processing**: Sharp
- **HTTP Client**: Axios
- **Runtime**: Node.js

## Project Setup

### Prerequisites

- Node.js 18+ installed
- pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="your-database-connection-string"
```

Supported databases: PostgreSQL, MySQL, SQLite, MongoDB

## Running the Application

```bash
# Development mode
pnpm run start

# Watch mode (auto-reload)
pnpm run start:dev

# Production mode
pnpm run start:prod
```

The application will start on `http://localhost:3000`

## API Endpoints

### Refresh Countries Data

**POST** `/countries/refresh`

Fetches country data from external API, saves to database, and generates a summary image.

```bash
curl -X POST http://localhost:3000/countries/refresh
```

**Response:**
```json
{
  "message": "Countries refreshed and image generated"
}
```

**Error Responses:**
- `408 Request Timeout` - External API request timed out (10s timeout)
- `502 Bad Gateway` - External API error
- `500 Internal Server Error` - Unexpected error

### Get Summary Image

**GET** `/countries/image`

Returns the generated country summary image as PNG.

```bash
curl http://localhost:3000/countries/image --output summary.png
```

**Response:**
- Content-Type: `image/png`
- Body: PNG image buffer

**Error Responses:**
- `404 Not Found` - Summary image not found (run refresh first)

## Image Generation

The generated `cache/summary.png` includes:

- **Total Countries Count**: Total number of countries in database
- **Top 5 Countries by GDP**: Ranked list with GDP in billions
- **Timestamp**: Last refresh time

### Image Specifications

- **Dimensions**: 800x600 pixels
- **Format**: PNG
- **Color Scheme**: Dark theme with cyan accents
- **Font**: Arial

## Project Structure

```
stage-2-hng/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   └── countries/
│   │   │       ├── countries.service.ts      # Business logic
│   │   │       ├── countries.controller.ts   # API endpoints
│   │   │       └── countries.module.ts       # Module definition
│   │   ├── app.module.ts                     # Root module
│   │   └── main.ts                           # Application entry point
│   ├── prisma/
│   │   └── schema.prisma                     # Database schema
│   ├── cache/                                # Generated images stored here
│   ├── .env                                  # Environment variables
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── README.md
```

## Database Schema Example

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Country {
  id    Int     @id @default(autoincrement())
  name  String  @unique
  gdp   Float   // GDP in USD
}
```

## Running Tests

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Deployment

### Using Mau (Recommended)

```bash
# Install Mau CLI
pnpm install -g @nestjs/mau

# Deploy to AWS
mau deploy
```

### Manual Deployment

1. Build the application:
   ```bash
   pnpm run build
   ```

2. Set production environment variables

3. Run production server:
   ```bash
   pnpm run start:prod
   ```

## Dependencies

### Core
```json
{
  "@nestjs/common": "^10.x",
  "@nestjs/core": "^10.x",
  "prisma": "^5.x",
  "@prisma/client": "^5.x"
}
```

### API & Data
```json
{
  "axios": "^1.x",
  "sharp": "^0.33.x"
}
```

### Development
```json
{
  "@nestjs/cli": "^10.x",
  "@types/node": "^20.x",
  "typescript": "^5.x"
}
```

## Error Handling

The application includes robust error handling:

| Error | Status | Description |
|-------|--------|-------------|
| Timeout | 408 | External API exceeds 10 seconds |
| Bad Gateway | 502 | External API error |
| Not Found | 404 | Missing summary image |
| Invalid Input | 400 | Invalid request parameters |
| Server Error | 500 | Unexpected server error |

## Code Example: Countries Service

```typescript
// src/modules/countries/countries.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import axios from 'axios';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CountriesService {
  private readonly cacheDir = path.join(process.cwd(), 'cache');

  constructor(private prisma: PrismaService) {
    this.ensureCacheDir();
  }

  async refreshCountries() {
    try {
      const countries = await this.fetchCountriesFromAPI();
      await this.prisma.country.deleteMany();
      await this.prisma.country.createMany({ data: countries });
      await this.generateSummaryImage();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Failed to refresh countries',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async fetchCountriesFromAPI(): Promise<any[]> {
    try {
      const response = await axios.get('https://api.example.com/countries', {
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          'External API request timed out',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }
      throw new HttpException(
        'Failed to fetch countries from external API',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getSummaryImage(): Promise<Buffer> {
    const imagePath = path.join(this.cacheDir, 'summary.png');
    if (!fs.existsSync(imagePath)) {
      throw new HttpException(
        'Summary image not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return fs.readFileSync(imagePath);
  }

  private async generateSummaryImage() {
    const totalCountries = await this.prisma.country.count();
    const topCountries = await this.prisma.country.findMany({
      orderBy: { gdp: 'desc' },
      take: 5,
      select: { name: true, gdp: true },
    });

    const svgContent = this.generateSVG(totalCountries, topCountries);
    const imagePath = path.join(this.cacheDir, 'summary.png');

    await sharp(Buffer.from(svgContent)).png().toFile(imagePath);
  }

  private generateSVG(totalCountries: number, topCountries: any[]): string {
    const timestamp = new Date().toLocaleString();
    // SVG generation logic...
    return svgContent;
  }

  private ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
}
```

## Code Example: Countries Controller

```typescript
// src/modules/countries/countries.controller.ts

import { Controller, Get, Post, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { CountriesService } from './countries.service';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post('refresh')
  @HttpCode(200)
  async refreshCountries() {
    await this.countriesService.refreshCountries();
    return { message: 'Countries refreshed and image generated' };
  }

  @Get('image')
  @HttpCode(200)
  async getImage(@Res() res: Response) {
    const imageBuffer = await this.countriesService.getSummaryImage();
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  }
}
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Sharp Documentation](https://sharp.pixelplumbing.com)
- [Axios Documentation](https://axios-http.com)
- [NestJS Discord](https://discord.gg/G7Qnnhy)

## Support

For issues or questions:
- Check the [NestJS documentation](https://docs.nestjs.com)
- Visit the [NestJS Discord channel](https://discord.gg/G7Qnnhy)
- Review error logs for debugging

## License

This project is MIT licensed.