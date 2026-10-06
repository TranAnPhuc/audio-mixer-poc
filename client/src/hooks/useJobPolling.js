import { useState, useEffect, useRef, useCallback } from 'react';
import { getJobStatus } from '../services/api';

/**
 * Custom Hook điều phối Polling trạng thái tiến trình xử lý âm thanh
 * @param {string|null} jobId ID của tác vụ MixJob
 * @param {object} [options]
 * @param {function} [options.onSuccess] Callback khi tác vụ đạt SUCCESS
 * @param {function} [options.onError] Callback khi tác vụ bị FAILED
 * @param {number} [options.intervalMs=1500] Chu kỳ polling (mặc định 1.5 giây)
 * @returns {{ status: string, progress: number, result: object|null, error: string|null, isPolling: boolean, reset: function }}
 */
export function useJobPolling(jobId, options = {}) {
  const { onSuccess, onError, intervalMs = 1500 } = options;

  const [status, setStatus] = useState('IDLE');
  const [progress, setProgress] = useState(0);
  const [tempo, setTempo] = useState(null);
  const [harmonic, setHarmonic] = useState(null);
  const [stems, setStems] = useState(null);
  const [vocalOffsetMs, setVocalOffsetMs] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  // Dùng ref để giữ tham chiếu callback mới nhất mà không kích hoạt re-render effect
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const reset = useCallback(() => {
    setStatus('IDLE');
    setProgress(0);
    setTempo(null);
    setHarmonic(null);
    setStems(null);
    setVocalOffsetMs(0);
    setResult(null);
    setError(null);
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!jobId) {
      reset();
      return;
    }

    let isMounted = true;
    let timerId = null;

    setIsPolling(true);
    setStatus('PENDING');
    setProgress(0);
    setError(null);
    setResult(null);
    setTempo(null);
    setHarmonic(null);
    setStems(null);

    const checkStatus = async () => {
      try {
        const response = await getJobStatus(jobId);
        if (!isMounted) return;

        if (response.success && response.data) {
          const {
            status: jobStatus,
            progress: jobProgress,
            tempo: jobTempo,
            harmonic: jobHarmonic,
            stems: jobStems,
            vocalOffsetMs: jobOffset,
            result: jobResult,
            errorMessage,
            error: jobError
          } = response.data;

          setStatus(jobStatus);
          setProgress(typeof jobProgress === 'number' ? jobProgress : 0);

          if (typeof jobOffset === 'number') {
            setVocalOffsetMs(jobOffset);
          }

          if (jobTempo) {
            setTempo(jobTempo);
          }

          if (jobHarmonic) {
            setHarmonic(jobHarmonic);
          }

          if (jobStems) {
            setStems(jobStems);
          }

          if (jobStatus === 'SUCCESS') {
            if (timerId) clearInterval(timerId);
            setIsPolling(false);
            setProgress(100);
            if (jobTempo) setTempo(jobTempo);
            if (jobHarmonic) setHarmonic(jobHarmonic);
            if (jobStems) setStems(jobStems);
            if (typeof jobOffset === 'number') setVocalOffsetMs(jobOffset);
            setResult(jobResult);
            onSuccessRef.current?.(jobResult);
          } else if (jobStatus === 'FAILED') {
            if (timerId) clearInterval(timerId);
            setIsPolling(false);
            const errDetail = errorMessage || jobError?.message || 'Quá trình phối âm bị lỗi trên máy chủ.';
            setError(errDetail);
            onErrorRef.current?.(errDetail);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn(`[useJobPolling] Lỗi khi thăm dò job ${jobId}:`, err.message);
        // Tạm thời không ngắt interval ngay vì có thể do mạng chập chờn
      }
    };

    // 1. Gọi kiểm tra ngay lập tức lần đầu
    checkStatus();

    // 2. Thiết lập chu kỳ Polling mỗi intervalMs (1500ms)
    timerId = setInterval(checkStatus, intervalMs);

    // 3. Cleanup Function: Dọn dẹp interval khi unmount hoặc khi jobId đổi
    return () => {
      isMounted = false;
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [jobId, intervalMs, reset]);

  return {
    status,
    progress,
    tempo,
    harmonic,
    stems,
    vocalOffsetMs,
    result,
    error,
    isPolling,
    reset
  };
}

export default useJobPolling;
