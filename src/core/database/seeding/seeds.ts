import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../../../modules/users/domain/user.entity';
import { Task } from '../../../modules/tasks/domain/tasks.entity';
import { users as userSeed } from './seed-data/users.seed';
import { tasks as taskSeed } from './seed-data/tasks.seed';
import { UserRole } from '../../../modules/users/domain/user-enum.role';

// Load environment variables
config();

// Define the data source
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'taskflow',
  entities: [User, Task],
  synchronize: true, 
});

// Helper function to ensure users have correct enum roles
const prepareUsers = () =>
  userSeed.map((u) => ({
    ...u,
    role: u.role === 'ADMIN' ? UserRole.ADMIN : UserRole.USER, // map string to enum
  }));

async function main() {
  try {
    // Initialize connection
    await AppDataSource.initialize();
    console.log(' Database connection initialized');

    const userRepo = AppDataSource.getRepository(User);
    const taskRepo = AppDataSource.getRepository(Task);

    // Clear existing data
    await taskRepo.delete({});
    await userRepo.delete({});
    console.log(' Existing data cleared');

    // Seed users
    const users = prepareUsers();
    await userRepo.save(users);
    console.log(`Seeded ${users.length} users successfully`);

    // Seed tasks
    await taskRepo.save(taskSeed);
    console.log(` Seeded ${taskSeed.length} tasks successfully`);

    console.log(' Database seeding completed');
  } catch (error) {
    console.error(' Error during database seeding:');
    console.error(error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the seeding
main();
