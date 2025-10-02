import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRedux } from './entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from './enums/role.enum';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T = any>(): MockRepository<T> => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  preload: jest.fn(),
  remove: jest.fn(),
});

const createdUser: UserRedux = {
  id: 1,
  firstName: 'Joe',
  lastName: 'Doe',
  email: 'joe.doe@example.com',
  phone: '555-987-6543',
  role: Role.Regular,
  permissions: [],
  isTfaEnabled: false,
};

const newUserInput = {
  firstName: 'Joe',
  lastName: 'Doe',
  email: 'joe.doe@example.com',
  password: 'P@ssw0rd123',
  confirmPassword: 'P@ssw0rd123',
  phone: '555-987-6543',
};

// type HasVideo = {
//   videos: boolean;
// };
//
// const Relations = {
//   relations: { videos: false },
// };

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DataSource, useValue: {} },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // To retrieve Request Scoped or Transient Scoped providers
    // use the resolve method, instead of get
    // service = await module.resolve(CoffeesService);
    userRepository = module.get<MockRepository>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    describe('When creating a new user succeeds', () => {
      it('Should return the user object', async () => {
        userRepository.save.mockReturnValue(createdUser);
        const newUser = (await service.create(newUserInput)) as UserRedux;
        expect(newUser).toEqual(createdUser);
        expect(true).toBeTruthy();
      });
    });

    describe('When creating a new user fails', () => {
      it('Should throw an error', async () => {
        try {
          const badInput = { ...newUserInput };
          badInput.confirmPassword = 'foo1234567';
          await service.create(badInput);
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(false).toBeFalsy();
        }
      });
    });
  });

  describe('findAll', () => {
    describe('When there are users found', () => {
      it('Should return a list of all users', async () => {
        userRepository.find.mockReturnValue([createdUser]);
        const users = await service.findAll();
        expect(users).toEqual([createdUser]);
        expect(true).toBeTruthy();
      });
    });

    describe('When there are no users found', () => {
      it('Should throw the NotFoundException', async () => {
        userRepository.find.mockReturnValue([]);
        try {
          await service.findAll();
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toEqual('No users were found');
          expect(error.status).toEqual(404);
          expect(false).toBeFalsy();
        }
      });
    });

    describe('When the users search throws an error', () => {
      it('Should throw the BadRequestException', async () => {
        const errorMessage = 'Some boo boo happened';
        const error = new BadRequestException(errorMessage);
        userRepository.find.mockRejectedValue(error);
        try {
          await service.findAll();
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toEqual(errorMessage);
          expect(error.status).toEqual(400);
          expect(false).toBeFalsy();
        }
      });
    });
  });

  describe('findOne', () => {
    describe('When a user is found', () => {
      it('Should return a user object of type UserRedux', async () => {
        userRepository.findOne.mockReturnValue(createdUser);
        const users = await service.findOne(1);
        expect(users).toEqual(createdUser);
        expect(true).toBeTruthy();
      });
    });

    describe('When the user is not found', () => {
      it('Should throw the NotFoundException', async () => {
        userRepository.find.mockRejectedValue([]);
        try {
          await service.findOne(123);
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toEqual('User #123 not found');
          expect(false).toBeFalsy();
        }
      });
    });

    describe('When searching a user throws an error', () => {
      it('Should throw the BadRequestException', async () => {
        const errorMessage = 'Some boo boo happened';
        const error = new BadRequestException(errorMessage);
        userRepository.findOne.mockRejectedValue(error);
        try {
          await service.findOne(123);
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toEqual(errorMessage);
          expect(error.status).toEqual(400);
          expect(false).toBeFalsy();
        }
      });
    });
  });

  describe('update', () => {
    describe('When the user update succeeds', () => {
      it('Should return a user object', async () => {
        userRepository.preload.mockReturnValue(createdUser);
        userRepository.save.mockReturnValue(createdUser);
        const users = await service.update(1, { phone: '555-123-4567' });
        expect(users).toEqual(createdUser);
        expect(true).toBeTruthy();
      });
    });

    describe(`When preload doesn't find the user`, () => {
      it('Should throw the NotFoundException', async () => {
        userRepository.preload.mockReturnValue(undefined);
        try {
          await service.update(123, { phone: '555-123-4567' });
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.status).toEqual(404);
          expect(error.message).toEqual('User #123 not found');
          expect(false).toBeFalsy();
        }
      });
    });

    describe('When the user update fails', () => {
      it('Should throw the BadRequestException', async () => {
        userRepository.preload.mockReturnValue(createdUser);
        const errorMessage = 'Some boo boo happened';
        const error = new BadRequestException(errorMessage);
        userRepository.save.mockRejectedValue(error);
        try {
          await service.update(123, { phone: '555-123-4567' });
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toEqual(errorMessage);
          expect(error.status).toEqual(400);
          expect(false).toBeFalsy();
        }
      });
    });
  });

  describe('remove', () => {
    describe('When removing a user succeeds', () => {
      it('Should return the user basic info', async () => {
        userRepository.findOne.mockReturnValue(createdUser);
        userRepository.remove.mockReturnValue(createdUser);
        const users = await service.remove(1);
        expect(users).toEqual(createdUser);
        expect(true).toBeTruthy();
      });
    });

    describe(`When trying to remove a user that doesn't exist`, () => {
      it('Should throw the NotFoundException', async () => {
        userRepository.findOne.mockReturnValue(undefined);
        userRepository.remove.mockReturnValue(createdUser);
        try {
          await service.remove(123);
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toEqual('User #123 not found');
          expect(false).toBeFalsy();
        }
      });
    });

    describe(`When trying to remove a user fails`, () => {
      it('Should throw the BadRequestException', async () => {
        userRepository.findOne.mockReturnValue(createdUser);
        const errorMessage = 'Some boo boo happened';
        const error = new BadRequestException(errorMessage);
        userRepository.remove.mockRejectedValue(error);
        try {
          await service.remove(123);
          expect(false).toBeTruthy();
        } catch (error) {
          expect(error).toBeInstanceOf(BadRequestException);
          expect(error.message).toEqual(errorMessage);
          expect(error.status).toEqual(400);
          expect(false).toBeFalsy();
        }
      });
    });
  });
});
