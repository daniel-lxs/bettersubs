import { eq, sql } from 'drizzle-orm';
import createLogger from 'logging';

import { User } from '../../types/User';
import { getDb } from '../connection';
import { usersModel } from '../schema';
import { isValidEntity } from '../../helpers/isValidEntity';

const logger = createLogger('UserRepository');

export function createUser(user: User) {
  try {
    const db = getDb();
    const { username, email, passwordHash, isAdmin } = user;

    const query = sql`INSERT INTO users (username, email, passwordHash, isAdmin) VALUES (${username}, ${email}, ${passwordHash}, ${isAdmin})
    RETURNING *`;

    const result = db.get<User>(query);

    if (
      isValidEntity(result, [
        'id',
        'username',
        'email',
        'passwordHash',
        'isAdmin',
      ])
    ) {
      return result;
    }
    throw new Error('Failed to create user');
  } catch (error) {
    logger.error(error);
    throw new Error(`Failed to create user`);
  }
}

export function findUserById(id: number): User {
  const db = getDb();
  const result = db
    .select()
    .from(usersModel)
    .where(eq(usersModel.id, id))
    .get();

  if (
    isValidEntity(result, [
      'id',
      'username',
      'email',
      'passwordHash',
      'isAdmin',
    ])
  ) {
    return result as User;
  }
  logger.error('Record not found');
  throw new Error('Record not found');
}

export function findUserByUsername(username: string): User {
  const db = getDb();
  const result = db
    .select()
    .from(usersModel)
    .where(eq(usersModel.username, username))
    .all()[0];
  if (
    isValidEntity(result, [
      'id',
      'username',
      'email',
      'passwordHash',
      'isAdmin',
    ])
  ) {
    return result as User;
  }
  logger.error('Record not found');
  throw new Error('Record not found');
}
