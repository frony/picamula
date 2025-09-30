import { Injectable } from '@nestjs/common';
import { HashingService } from '../hashing/hashing.service';
import { randomUUID } from 'crypto';

/**
 * Move it into its own file
 */
export interface GeneratedApiKeyPayload {
  apiKey: string; // a user-friendly API key
  hashedKey: string; // hashed version of the API key to be stored in the DB
}
@Injectable()
export class ApiKeysService {
  constructor(private readonly hashingService: HashingService) {}

  /**
   * Generate and hash an api key
   * @param id
   * @return { apiKey: string, hashedKey: string }
   */
  async createAndHash(id: string): Promise<GeneratedApiKeyPayload> {
    const apiKey = this.generateApiKey(id);
    const hashedKey = await this.hashingService.hash(apiKey);

    // Combine the generated apiKey and the hashedKey
    const combined = `${apiKey} ${hashedKey}`;

    // Base64 encode the combined string
    const encodedApiKey = Buffer.from(combined).toString('base64');

    return { apiKey: encodedApiKey, hashedKey };
  }

  /**
   * Compare apiKey to its hashed value
   * for validation
   * @param apiKey
   * @param hashedKey
   * @return Boolean
   */
  async validate(apiKey: string, hashedKey: string): Promise<boolean> {
    return this.hashingService.compare(apiKey, hashedKey);
  }

  /**
   * Extracts the id prepended to the api key
   * when the api key was generated
   * @param apiKey
   * @return {string} The extracted id
   */
  extractIdFromApiKey(apiKey: string): string {
    // URL decode the apiKey first to handle special characters
    const decodedApiKey = decodeURIComponent(apiKey);
    const [id] = Buffer.from(decodedApiKey, 'base64').toString('ascii').split(' ');
    return id;
  }

  extractHashedKeyFromApiKey(apiKey: string): string {
    // URL decode the apiKey first to handle special characters
    const decodedApiKey = decodeURIComponent(apiKey);
    const parts = Buffer.from(decodedApiKey, 'base64').toString('ascii').split(' ');
    return parts.slice(1).join(' '); // Join everything after the first part as the hashedKey
  }

  /**
   * Generate an pai key
   * @param id
   * @private
   * @return String
   */
  private generateApiKey(id: string): string {
    // Generate random UUID string
    // and prepend it with an api key identifier
    // in this case, id
    const apiKey = `${id} ${randomUUID()}`;
    // Generate the corresponding base64 string for consistency
    // and more user-friendly without spaces, etc.
    return Buffer.from(apiKey).toString('base64');
  }
}
