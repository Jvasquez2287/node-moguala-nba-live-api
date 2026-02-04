/**
 * Configuration module for NBA Tracker API.
 * Handles environment variables and configuration for NBA API and Groq.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

export class ApiConfig {
  /** List of proxy configurations */
  private configList: string[];

  constructor() {
    const configEnv = process.env.NBA_API_CONFIG || process.env.NBA_API_PROXY || '';

    if (configEnv) {
      this.configList = configEnv.split(',').map(p => p.trim()).filter(p => p.length > 0);
    } else {
      this.configList = [];
    }
  }

  /**
   * Get configuration value. Returns null if not configured.
   */
  getConfig(): string | null {
    if (this.configList.length === 0) {
      return null;
    }

    if (this.configList.length === 1) {
      return this.configList[0];
    }

    // Random selection for load balancing
    const randomIndex = Math.floor(Math.random() * this.configList.length);
    return this.configList[randomIndex];
  }

  /**
   * Get configuration as an object for axios/http clients.
   */
  getConfigDict(): { http?: string; https?: string } | null {
    const config = this.getConfig();
    if (!config) {
      return null;
    }

    return {
      http: config,
      https: config,
    };
  }
}

// Global configuration instance
export const apiConfig = new ApiConfig();

/**
 * Get the global configuration instance.
 */
export function getApiConfig(): ApiConfig {
  return apiConfig;
}

/**
 * Get keyword arguments for NBA API endpoints.
 */
export function getApiKwargs(): { proxy?: string } {
  const config = apiConfig.getConfig();
  if (config) {
    return { proxy: config };
  }
  return {};
}

/**
 * Get Groq API key from environment variables.
 */
export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

/**
 * Get frontend URL for CORS configuration.
 */
export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL || '*';
}

/**
 * Get port for the server.
 */
export function getPort(): number {
  return parseInt(process.env.PORT || '8000', 10);
}

/**
 * Get NBA API key for balldontlie SDK.
 */
export function getNbaApiKey(): string | undefined {
  return process.env.NBA_API_KEY;
}