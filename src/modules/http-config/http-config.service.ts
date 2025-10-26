import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosInstance } from 'axios';

@Injectable()
export class HttpConfigService implements OnModuleInit {
  constructor(private readonly httpService: HttpService) {}

  onModuleInit() {
    const axiosRef: AxiosInstance = this.httpService.axiosRef;
    
    // Set basic timeout - NO CACHE ADAPTER
    axiosRef.defaults.timeout = 15000;
    
    console.log('✅ HttpConfigService initialized with 15s timeout');

    // Request interceptor
    axiosRef.interceptors.request.use(
      (config) => {
        console.log(`📤 Request to: ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error.message);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    axiosRef.interceptors.response.use(
      (response) => {
        console.log(`📥 Response from: ${response.config.url} - Status: ${response.status}`);
        return response;
      },
      (error) => {
        if (error.code === 'ECONNABORTED') {
          console.error('❌ Request timed out:', error.config?.url);
        } else if (!error.response) {
          console.error('❌ Network Error:', error.message);
        } else {
          const { status, data, config } = error.response;
          console.error(`❌ API error [${status}] on ${config?.url}:`, data);
        }
        return Promise.reject(error);
      },
    );
  }

  getHttpService(): HttpService {
    return this.httpService;
  }
}