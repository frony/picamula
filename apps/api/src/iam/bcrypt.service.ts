import { Injectable } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { compare, genSalt, hash } from 'bcrypt';

@Injectable()
export class BcryptService implements HashingService {
  async hash(data: string | Buffer): Promise<string> {
    try {
      const salt = await genSalt();
      return hash(data, salt);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  compare(data: string | Buffer, encrypted: string): Promise<boolean> {
    return compare(data, encrypted);
  }
}
