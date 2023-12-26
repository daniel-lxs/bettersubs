import bcrypt from 'bcrypt';
import { RegisterUserDto } from '../../controllers/dtos';
import { createUser } from '../../data/repositories/userRepository';
import { User } from '../../types/User';

export async function registerUser(user: RegisterUserDto): Promise<User> {
  const hash = await hashPassword(user.password);

  const createdUser = createUser({
    username: user.username,
    email: user.email,
    passwordHash: hash,
    isAdmin: false,
  });
  return createdUser;
}
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  return await bcrypt.hash(password, salt);
}
export async function validatePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
