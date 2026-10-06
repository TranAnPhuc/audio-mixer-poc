import axios from 'axios';

// Khởi tạo instance Axios kết nối qua Vite Proxy (/api/v1 -> localhost:5000)
const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 60000 // Timeout 60s cho các tệp âm thanh dung lượng lớn
});

/**
 * Tải lên 2 tệp âm thanh (Vocal & Beat) và khởi tạo tác vụ phối âm
 * @param {object} params
 * @param {File} params.trackAFile Tệp âm thanh Vocal (Track A)
 * @param {File} params.trackBFile Tệp âm thanh Beat (Track B)
 * @param {number} [params.vocalOffsetMs=0] Độ lệch thời gian Vocal (ms)
 * @param {function} [params.onUploadProgress] Callback nhận tiến độ upload (0 -> 100%)
 * @returns {Promise<{ success: boolean, statusCode: number, data: { jobId: string, status: string, message: string } }>}
 */
export async function uploadTracksForMixing({ trackAFile, trackBFile, vocalOffsetMs = 0, onUploadProgress }) {
  const formData = new FormData();
  formData.append('trackA', trackAFile);
  formData.append('trackB', trackBFile);
  formData.append('vocalOffsetMs', vocalOffsetMs);

  const response = await apiClient.post('/mix', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onUploadProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percentCompleted);
      }
    }
  });

  return response.data;
}

/**
 * Truy vấn trạng thái tác vụ theo jobId
 * @param {string} jobId
 */
export async function getJobStatus(jobId) {
  const response = await apiClient.get(`/mix/${jobId}`);
  return response.data;
}

export default {
  uploadTracksForMixing,
  getJobStatus
};
