import prisma, { JobStatus } from '../src/config/db.js';

async function testDatabase() {
  console.log('--- Bắt đầu kiểm tra kết nối Database & Prisma Client ---');

  try {
    // 1. Tạo một bản ghi MixJob thử nghiệm
    const testJob = await prisma.mixJob.create({
      data: {
        status: JobStatus.PENDING,
        progress: 0,
        trackAOriginalName: 'vocal_sample.mp3',
        trackAPath: '/storage/uploads/vocal_sample.mp3',
        trackAMimeType: 'audio/mpeg',
        trackASize: 402328,
        trackBOriginalName: 'beat_sample.mp3',
        trackBPath: '/storage/uploads/beat_sample.mp3',
        trackBMimeType: 'audio/mpeg',
        trackBSize: 402328
      }
    });

    console.log('✔ Tạo thành công MixJob ID:', testJob.id);
    console.log('✔ Trạng thái ban đầu:', testJob.status);

    // 2. Cập nhật tiến độ giả lập
    const updatedJob = await prisma.mixJob.update({
      where: { id: testJob.id },
      data: {
        status: JobStatus.PROCESSING,
        progress: 50
      }
    });
    console.log('✔ Cập nhật thành công:', updatedJob.status, `(${updatedJob.progress}%)`);

    // 3. Đọc lại bản ghi để xác thực
    const retrievedJob = await prisma.mixJob.findUnique({
      where: { id: testJob.id }
    });

    if (!retrievedJob || retrievedJob.progress !== 50) {
      throw new Error('Dữ liệu truy vấn không khớp với dữ liệu đã cập nhật!');
    }
    console.log('✔ Truy vấn và kiểm tra toàn vẹn dữ liệu thành công!');

    // 4. Dọn dẹp bản ghi kiểm thử
    await prisma.mixJob.delete({
      where: { id: testJob.id }
    });
    console.log('✔ Đã dọn dẹp bản ghi test thành công.');

    console.log('🎉 TOÀN BỘ TIÊU CHUẨN NGHIỆM THU DATABASE ĐÃ ĐẠT CHUẨN (DoD PASSED)!');
  } catch (error) {
    console.error('❌ Lỗi kiểm tra database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
