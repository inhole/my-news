import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Start seeding...');

  // Create categories
  const categories = [
    { name: 'General', slug: 'general', description: 'General news' },
    { name: 'Business', slug: 'business', description: 'Business news' },
    { name: 'Technology', slug: 'technology', description: 'Technology news' },
    { name: 'Entertainment', slug: 'entertainment', description: 'Entertainment news' },
    { name: 'Sports', slug: 'sports', description: 'Sports news' },
    { name: 'Science', slug: 'science', description: 'Science news' },
    { name: 'Health', slug: 'health', description: 'Health news' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    console.log(`Created/Updated category: ${category.name}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
