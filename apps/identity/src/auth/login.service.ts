import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IUserRepository, UserRecord } from '@sipera/data-access';

export interface LoginInput {
  noTelp: string;
  password: string;
}

export interface LoginSuccess {
  ok: true;
  user: {
    id: number;
    nama: string;
    no_telp: string;
    role: string;
    instansi: string | null;
    foto: string | null;
    api_token: string;
  };
}

export interface LoginFailure {
  ok: false;
  code: 'user_not_found' | 'invalid_password' | 'blocked' | 'deleted';
}

export type LoginResult = LoginSuccess | LoginFailure;

export interface LoginServiceDeps {
  users: IUserRepository;
  jwtSecret: string;
  jwtTtlSeconds: number;
}

export class LoginService {
  constructor(private readonly deps: LoginServiceDeps) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.deps.users.findByNoTelp(input.noTelp);
    if (!user) return { ok: false, code: 'user_not_found' };
    if (user.deletedAt) return { ok: false, code: 'deleted' };
    if (user.blockedAt) return { ok: false, code: 'blocked' };

    const passwordOk = await bcrypt.compare(input.password, user.password);
    if (!passwordOk) return { ok: false, code: 'invalid_password' };

    const token = this.issueToken(user);
    return {
      ok: true,
      user: {
        id: user.id,
        nama: user.nama,
        no_telp: user.noTelp,
        role: user.role,
        instansi: user.instansi,
        foto: user.foto,
        api_token: token,
      },
    };
  }

  private issueToken(user: UserRecord): string {
    return jwt.sign(
      {
        nama: user.nama,
        id: user.id,
        no_telp: user.noTelp,
        role: user.role,
        foto: user.foto,
      },
      this.deps.jwtSecret,
      { expiresIn: this.deps.jwtTtlSeconds },
    );
  }
}
