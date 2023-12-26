import bcrypt from 'bcrypt';
import { RegisterUserDto } from '../../controllers/dtos';
import { createUser } from '../../data/repositories/userRepository';
import { User } from '../../types/User';

export function registerUser(user: RegisterUserDto): User {
  const hash = hashPassword(user.password);

  const createdUser = createUser({
    username: user.username,
    email: user.email,
    passwordHash: hash,
    isAdmin: false,
  });
  return createdUser;
}
function hashPassword(password: string): string {
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds);
  return bcrypt.hashSync(password, salt);
}
export function validatePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
