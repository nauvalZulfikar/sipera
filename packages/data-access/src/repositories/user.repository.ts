import type { Prisma, PrismaClient, User } from '@prisma/client';

export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;
export type UserRecord = User;

export interface IUserRepository {
  findByNoTelp(noTelp: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  create(input: UserCreateInput): Promise<User>;
  update(id: number, input: UserUpdateInput): Promise<User>;
  softDelete(id: number): Promise<User>;
  listActive(opts?: { skip?: number; take?: number; role?: string }): Promise<User[]>;
  countActive(opts?: { role?: string }): Promise<number>;
}

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByNoTelp(noTelp: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { noTelp } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(input: UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data: input });
  }

  async update(id: number, input: UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: input });
  }

  async softDelete(id: number): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });
  }

  async listActive(opts: { skip?: number; take?: number; role?: string } = {}): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { deletedAt: null, ...(opts.role ? { role: opts.role } : {}) },
      skip: opts.skip ?? 0,
      take: opts.take ?? 50,
      orderBy: { id: 'asc' },
    });
  }

  async countActive(opts: { role?: string } = {}): Promise<number> {
    return this.prisma.user.count({
      where: { deletedAt: null, ...(opts.role ? { role: opts.role } : {}) },
    });
  }
}
