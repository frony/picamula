import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { User, UserRedux } from './entities/user.entity';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { VerifyEmailDto } from './dto/verify-email.dto';

// @ApiBearerAuth('JWT-auth')
@ApiTags('users')
@Auth(AuthType.Bearer, AuthType.ApiKey)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiResponse({
    status: 201,
    description: 'Create a new user',
    type: UserRedux,
  })
  @ApiOperation({
    summary: 'Create a user in the database',
  })
  // @HttpCode(HttpStatus.OK)
  @Roles(Role.Admin)
  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserRedux> {
    try {
      return this.usersService.create(createUserDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiResponse({
    status: 200,
    description: 'Find all users',
    type: [UserRedux],
  })
  @ApiOperation({
    summary: 'Find all users',
  })
  @HttpCode(HttpStatus.OK)
  @Roles(Role.Admin)
  @Get()
  async findAll() {
    const allUsers = await this.usersService.findAll();
    return allUsers;
  }

  @ApiResponse({
    status: 200,
    description: 'Find a user by ID',
    type: UserRedux,
  })
  @ApiOperation({
    summary: 'Find a user by ID',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserRedux> {
    const user: UserRedux = await this.usersService.findOne(+id);
    return user;
  }

  @ApiResponse({
    status: 200,
    description: 'Find a user by ID',
    type: UserRedux,
  })
  @ApiOperation({
    summary: 'Find a user by ID',
  })
  @HttpCode(HttpStatus.OK)
  @Get('findOneEmail/:id')
  async findOneByEmail(@Param('email') email: string): Promise<UserRedux> {
    const user: UserRedux = await this.usersService.findOneByEmail(email);
    return user;
  }

  @ApiResponse({
    status: 200,
    description: 'Verify user email with token',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email verified successfully' }
      }
    }
  })
  @ApiOperation({
    summary: 'Verify user email with token from email',
  })
  @Auth(AuthType.None)
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    try {
      return await this.usersService.verifyEmail(verifyEmailDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({
    summary: "Update a user's data",
  })
  @Roles(Role.Admin)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserRedux> {
    try {
      const response = await this.usersService.update(+id, updateUserDto);
      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`User #${id} not found`);
      }
      throw new BadRequestException(error.message);
    }
  }

  @ApiOperation({
    summary: 'Delete a user',
  })
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
