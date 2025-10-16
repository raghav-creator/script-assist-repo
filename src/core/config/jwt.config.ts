import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'd9f84c7b4e4b8fbbd32f1a88c6e9f01c5e4a2e1f3a3d6e7f8b9c0a1b2c3d4e',
  expiresIn: process.env.JWT_EXPIRATION || '1d',
})); 