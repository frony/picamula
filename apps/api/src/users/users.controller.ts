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
  Query,
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
import { ActiveUser } from '../iam/decorators/active-user.decorator';
import { ActiveUserData } from '../iam/interfaces/active-user-data.interface';

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
    description: 'Get current user data',
    type: UserRedux,
  })
  @ApiOperation({
    summary: 'Get current authenticated user data',
  })
  @HttpCode(HttpStatus.OK)
  @Get('me')
  async getCurrentUser(@ActiveUser() user: ActiveUserData): Promise<UserRedux> {
    const currentUser = await this.usersService.findOne(user.sub);
    if (!currentUser) {
      throw new NotFoundException(`User not found`);
    }
    return currentUser;
  }

  @ApiOperation({
    summary: 'Get users by their email addresses',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of users matching the provided emails',
    type: [UserRedux],
  })
  @Get('by-emails')
  async getUsersByEmails(
    @Query('emails') emails: string,
  ): Promise<UserRedux[]> {
    try {
      if (!emails) {
        return [];
      }
      const emailArray = emails.split(',').map((email) => email.trim());
      console.log('Fetching users by emails:', emailArray);
      const users = await this.usersService.findByEmails(emailArray);
      console.log('Found users:', users);
      const result = users.map(user => {
        const { id, firstName, lastName, email, phone, role, permissions, isTfaEnabled } = user;
        return { id, firstName, lastName, email, phone, role, permissions, isTfaEnabled };
      });
      console.log('Returning users:', result);
      return result;
    } catch (error) {
      console.error('Error in getUsersByEmails:', error);
      throw new BadRequestException(error.message);
    }
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
