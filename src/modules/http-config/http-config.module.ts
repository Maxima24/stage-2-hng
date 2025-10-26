// http-config.module.ts
import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import axios, { AxiosInstance } from 'axios';

export const CUSTOM_AXIOS = 'CUSTOM_AXIOS';

const customAxiosProvider = {
  provide: CUSTOM_AXIOS,
  useFactory: (): AxiosInstance => {
    const instance = axios.create({
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    instance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('Request Error:', error.message);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNABORTED') {
          console.error('Request timed out:', error.config?.url);
        } else if (!error.response) {
          console.error('Network Error:', error.message);
        } else {
          const { status, data, config } = error.response;
          console.error(`API error [${status}] on ${config?.url}:`, data);
        }
        return Promise.reject(error);
      },
    );

    return instance;
  },
};

@Global()
@Module({
  imports: [HttpModule],
  providers: [customAxiosProvider],
  exports: [HttpModule, CUSTOM_AXIOS],
})
export class HttpConfigModule {}