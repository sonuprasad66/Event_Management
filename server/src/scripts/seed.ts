import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';

async function seed() {
  if (process.env.NODE_ENV === 'development') {
    await prisma.eventMedia.deleteMany();
    await prisma.event.deleteMany();
    await prisma.category.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
  }

  const adminHash = await bcrypt.hash('Admin@123', 12);
  const userHash = await bcrypt.hash('User@123', 12);

  const admin = await prisma.user.create({
    data: { username: 'admin', email: 'admin@example.com', passwordHash: adminHash, role: 'ADMIN', timezone: 'Asia/Kolkata' },
  });

  const demoUser = await prisma.user.create({
    data: { username: 'demo_user', email: 'demo@example.com', passwordHash: userHash, role: 'USER', timezone: 'Asia/Kolkata' },
  });

  const tech = await prisma.category.create({ data: { name: 'Technology', slug: 'technology', createdById: admin.id } });
  const business = await prisma.category.create({ data: { name: 'Business', slug: 'business', createdById: admin.id } });

  const webDev = await prisma.category.create({ data: { name: 'Web Development', slug: 'web-development', parentId: tech.id, createdById: admin.id } });
  const ai = await prisma.category.create({ data: { name: 'Artificial Intelligence', slug: 'artificial-intelligence', parentId: tech.id, createdById: admin.id } });

  await prisma.category.create({ data: { name: 'React', slug: 'react', parentId: webDev.id, createdById: admin.id } });
  await prisma.category.create({ data: { name: 'Node.js', slug: 'nodejs', parentId: webDev.id, createdById: admin.id } });
  await prisma.category.create({ data: { name: 'Marketing', slug: 'marketing', parentId: business.id, createdById: admin.id } });
  await prisma.category.create({ data: { name: 'Finance', slug: 'finance', parentId: business.id, createdById: admin.id } });

  const past = (days: number) => new Date(Date.now() - days * 86400000);
  const future = (days: number) => new Date(Date.now() + days * 86400000);

  const e1 = await prisma.event.create({
    data: { title: 'React Summit 2024', description: 'The biggest React conference with top speakers from around the world covering hooks, performance, and modern patterns.', categoryId: webDev.id, createdById: admin.id, publishAtUtc: past(5), sourceTimezone: 'Asia/Kolkata' },
  });
  const e2 = await prisma.event.create({
    data: { title: 'AI & Machine Learning Workshop', description: 'Hands-on workshop covering the fundamentals of machine learning, neural networks, and practical AI applications.', categoryId: ai.id, createdById: demoUser.id, publishAtUtc: past(2), sourceTimezone: 'Asia/Kolkata' },
  });
  const e3 = await prisma.event.create({
    data: { title: 'Node.js Best Practices', description: 'Learn advanced Node.js patterns including clustering, streams, error handling, and production deployment strategies.', categoryId: webDev.id, createdById: admin.id, publishAtUtc: past(1), sourceTimezone: 'Asia/Kolkata' },
  });

  // Future events
  await prisma.event.create({
    data: { title: 'Future Tech Conference 2025', description: 'Upcoming conference showcasing the latest trends in technology, from quantum computing to AR/VR.', categoryId: tech.id, createdById: admin.id, publishAtUtc: future(7), sourceTimezone: 'Asia/Kolkata' },
  });
  await prisma.event.create({
    data: { title: 'Business Growth Strategies', description: 'Learn proven strategies for scaling your business, managing teams, and achieving sustainable growth.', categoryId: business.id, createdById: demoUser.id, publishAtUtc: future(14), sourceTimezone: 'Asia/Kolkata' },
  });

  // Soft deleted event
  const deletedEvent = await prisma.event.create({
    data: { title: 'Cancelled Event Example', description: 'This event was cancelled and soft deleted as an example.', categoryId: tech.id, createdById: admin.id, publishAtUtc: past(10), sourceTimezone: 'Asia/Kolkata', deletedAt: past(1), deletedById: admin.id },
  });

  // Add placeholder media for published events
  await prisma.eventMedia.createMany({
    data: [
      { eventId: e1.id, url: 'https://picsum.photos/800/400?random=1', publicId: 'placeholder-1', fileName: 'event1.jpg', mimeType: 'image/jpeg', size: 102400 },
      { eventId: e1.id, url: 'https://picsum.photos/800/400?random=2', publicId: 'placeholder-2', fileName: 'event1b.jpg', mimeType: 'image/jpeg', size: 98304 },
      { eventId: e2.id, url: 'https://picsum.photos/800/400?random=3', publicId: 'placeholder-3', fileName: 'event2.jpg', mimeType: 'image/jpeg', size: 115200 },
      { eventId: e3.id, url: 'https://picsum.photos/800/400?random=4', publicId: 'placeholder-4', fileName: 'event3.jpg', mimeType: 'image/jpeg', size: 89600 },
    ],
  });

  console.log('Admin: username=admin, password=Admin@123');
  console.log('User:  username=demo_user, password=User@123');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
