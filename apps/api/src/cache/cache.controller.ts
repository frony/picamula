import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { CustomCacheService } from './cache.service';

@ApiTags('CustomCache')
@ApiBearerAuth('JWT-auth')
@Auth(AuthType.Bearer)
@Controller('CustomCache')
export class CustomCacheController {
  constructor(private readonly customCacheService: CustomCacheService) { }

  @Get()
  info() {
    return {
      message: 'Custom cache API',
      endpoints: {
        get: 'GET /CustomCache/get?key=<key>',
        set: 'POST /CustomCache/set { "key": "...", "value": "..." }',
        delete: 'DELETE /CustomCache/delete?key=<key>',
      },
    };
  }

  @Get('get')
  async get(@Query('key') key: string) {
    const value = await this.customCacheService.get(key);
    if (value === null) {
      return { message: 'Cache not found', value: null };
    }
    return { message: 'Cache retrieved successfully', value };
  }

  @Post('set')
  async set(@Body() body: { key: string; value: string }) {
    const { key, value } = body;
    const result = await this.customCacheService.set(key, value);
    if (result === undefined) {
      return { message: 'Cache not set', result: null };
    }
    return { message: 'Cache set successfully', result };
  }

  @Delete('delete')
  async delete(@Query('key') key: string) {
    const result = await this.customCacheService.delete(key);
    if (!result) {
      return { message: 'Cache not deleted', result: null };
    }
    return { message: 'Cache deleted successfully', result: true };
  }
}
