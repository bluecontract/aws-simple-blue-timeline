process.env.TZ = 'GMT';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import dotenv from 'dotenv';
dotenv.config();

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  moduleDirectories: ['node_modules', 'src'],
  roots: ['tests/integration']
};
