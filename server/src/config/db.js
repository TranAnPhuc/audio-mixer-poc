import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';

// 1. Enum biểu diễn trạng thái chuẩn của MixJob
export const JobStatus = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
});

// 2. Singleton Pattern cho Prisma Client
// Ngăn chặn việc khởi tạo nhiều instance PrismaClient gây cạn kiệt Connection Pool
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' }
        ]
      : ['error']
  });

if (isDevelopment) {
  // Lắng nghe log query trong môi trường dev để tối ưu hóa hiệu năng
  prisma.$on?.('query', (e) => {
    console.log(`[Prisma Query]: ${e.query} - Params: ${e.params} - Duration: ${e.duration}ms`);
  });
  globalForPrisma.prisma = prisma;
}

// 3. Xử lý đóng kết nối an toàn (Graceful Disconnect) khi tắt ứng dụng
const handleExit = async () => {
  await prisma.$disconnect();
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

export default prisma;
