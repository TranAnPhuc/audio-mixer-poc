#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Stem Separation Runner Script (separate_stems.py)
Tách thân âm Vocals và Instrumental sử dụng Demucs v4 (Hybrid Transformer) 
hoặc cơ chế Fallback DSP thông minh (Center-Channel Phase Cancellation & Vocal Bandpass).

Đầu vào qua CLI:
  --input <path>       : Đường dẫn tệp âm thanh đầu vào
  --output-dir <path>  : Thư mục lưu trữ 2 tệp đầu ra (vocals.wav, no_vocals.wav)
  --mode <vocals|no_vocals|both> : Chế độ trích xuất (mặc định: both)

Đầu ra qua stdout (JSON):
  {
    "success": true,
    "engine": "demucs" | "dsp_fallback",
    "vocalsPath": "...",
    "instrumentalPath": "...",
    "durationSec": 10.5,
    "executionTimeMs": 350
  }
"""

import sys
import os
import io

# Đảm bảo stdout và stderr luôn sử dụng UTF-8 trên mọi nền tảng (đặc biệt là Windows)
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import argparse
import json
import time
import shutil
import subprocess

def get_audio_duration_and_channels(input_path):
    """
    Sử dụng ffprobe để đo thời lượng (giây) và số kênh âm thanh của tệp
    """
    ffprobe_cmd = shutil.which("ffprobe") or "ffprobe"

    try:
        cmd = [
            ffprobe_cmd,
            "-v", "error",
            "-select_streams", "a:0",
            "-show_entries", "stream=channels:format=duration",
            "-of", "json",
            input_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        
        duration = float(data.get("format", {}).get("duration", 0.0))
        channels = int(data.get("streams", [{}])[0].get("channels", 2))
        return duration, channels
    except Exception as e:
        sys.stderr.write(f"[WARN] Failed to read audio metadata: {e}\n")
        return 0.0, 2

def run_demucs_separation(input_path, output_dir, mode):
    """
    Chạy tách thân âm bằng mô hình AI Demucs v4 (Hybrid Transformer)
    """
    import torch
    import demucs.separate

    temp_demucs_dir = os.path.join(output_dir, "_demucs_tmp")
    os.makedirs(temp_demucs_dir, exist_ok=True)

    try:
        # Gọi Demucs CLI với kiến trúc tối ưu: 2-stems (vocals + no_vocals) và model htdemucs
        cmd = [
            sys.executable,
            "-m", "demucs.separate",
            "-n", "htdemucs",
            "--two-stems", "vocals",
            "-o", temp_demucs_dir,
            input_path
        ]
        
        # Nếu có CUDA thì dùng GPU, ngược lại chạy đa luồng CPU
        if not torch.cuda.is_available():
            cmd.extend(["-d", "cpu"])

        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

        base_name = os.path.splitext(os.path.basename(input_path))[0]
        model_out_dir = os.path.join(temp_demucs_dir, "htdemucs", base_name)

        source_vocals = os.path.join(model_out_dir, "vocals.wav")
        source_no_vocals = os.path.join(model_out_dir, "no_vocals.wav")

        target_vocals = os.path.join(output_dir, "vocals.wav")
        target_no_vocals = os.path.join(output_dir, "no_vocals.wav")

        if os.path.exists(source_vocals):
            shutil.copy2(source_vocals, target_vocals)
        if os.path.exists(source_no_vocals):
            shutil.copy2(source_no_vocals, target_no_vocals)

        return True, target_vocals, target_no_vocals
    finally:
        # Dọn dẹp thư mục tạm của Demucs
        if os.path.exists(temp_demucs_dir):
            try:
                shutil.rmtree(temp_demucs_dir)
            except Exception:
                pass

def run_dsp_fallback_separation(input_path, output_dir, mode, channels):
    """
    Cơ chế Fallback DSP thông minh sử dụng FFmpeg:
    - Trích xuất Vocal: Center-channel isolation + Vocal Formant Bandpass (200Hz - 4500Hz).
    - Trích xuất Instrumental: Center-channel phase cancellation (L - R) + Sub-bass recovery (< 120Hz).
    """
    ffmpeg_cmd = shutil.which("ffmpeg") or "ffmpeg"
    target_vocals = os.path.join(output_dir, "vocals.wav")
    target_no_vocals = os.path.join(output_dir, "no_vocals.wav")

    # 1. Trích xuất Vocals (Mid / Center channel + dải tần giọng hát)
    if channels >= 2:
        # Âm thanh Stereo: Lấy tín hiệu tâm (Mid = (L+R)/2) và lọc dải tần vocal (200Hz - 4500Hz)
        vocal_filter = (
            "aresample=44100,"
            "pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1,"
            "highpass=f=200,lowpass=f=4500,"
            "volume=1.4"
        )
    else:
        # Âm thanh Mono: Lọc dải tần vocal trực tiếp
        vocal_filter = (
            "aresample=44100,"
            "pan=stereo|c0=c0|c1=c0,"
            "highpass=f=200,lowpass=f=4500,"
            "volume=1.4"
        )

    cmd_vocal = [
        ffmpeg_cmd, "-y",
        "-i", input_path,
        "-af", vocal_filter,
        "-c:a", "pcm_s16le",
        target_vocals
    ]
    subprocess.run(cmd_vocal, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

    # 2. Trích xuất Instrumental / No-Vocals
    if channels >= 2:
        # Âm thanh Stereo: Triệt tiêu âm thanh chính giữa bằng Phase Inversion (c0-c1 & c1-c0)
        # Giữ lại dải trầm (< 120Hz) qua sub-mix để đảm bảo tiếng kick/bass không bị mất hoàn toàn
        inst_filter = (
            "aresample=44100,"
            "asplit=2[m][b];"
            "[m]pan=stereo|c0=0.5*c0-0.5*c1|c1=-0.5*c0+0.5*c1[side];"
            "[b]lowpass=f=120,volume=0.8[sub];"
            "[side][sub]amix=inputs=2:weights=1.0 0.8:dropout_transition=0"
        )
    else:
        # Âm thanh Mono: Áp dụng Notch / Band-reject filter loại bỏ dải tần vocal chủ đạo
        inst_filter = (
            "aresample=44100,"
            "pan=stereo|c0=c0|c1=c0,"
            "bandreject=f=1000:width_type=h:w=2000,"
            "volume=1.0"
        )

    cmd_inst = [
        ffmpeg_cmd, "-y",
        "-i", input_path,
        "-filter_complex", inst_filter,
        "-c:a", "pcm_s16le",
        target_no_vocals
    ]
    subprocess.run(cmd_inst, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

    return target_vocals, target_no_vocals

def main():
    parser = argparse.ArgumentParser(description="Stem Separation Runner")
    parser.add_argument("--input", required=True, help="Input audio file path")
    parser.add_argument("--output-dir", required=True, help="Directory to save separated stems")
    parser.add_argument("--mode", default="both", choices=["vocals", "no_vocals", "both"], help="Separation mode")

    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_dir = os.path.abspath(args.output_dir)

    if not os.path.exists(input_path):
        error_res = {
            "success": False,
            "error": f"Input file not found: {input_path}"
        }
        print(json.dumps(error_res))
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    start_time = time.perf_counter()
    duration_sec, channels = get_audio_duration_and_channels(input_path)

    engine_used = "dsp_fallback"
    vocals_path = None
    instrumental_path = None

    # Kiểm tra sự hiện diện của Demucs & PyTorch
    demucs_installed = False
    try:
        import demucs
        import torch
        demucs_installed = True
    except ImportError:
        demucs_installed = False

    if demucs_installed:
        try:
            sys.stderr.write("[INFO] Demucs v4 detected. Running Hybrid Transformer separation...\n")
            success, voc_p, inst_p = run_demucs_separation(input_path, output_dir, args.mode)
            if success and os.path.exists(voc_p) and os.path.exists(inst_p):
                engine_used = "demucs"
                vocals_path = voc_p
                instrumental_path = inst_p
        except Exception as e:
            sys.stderr.write(f"[WARN] Demucs failed ({e}). Falling back to DSP engine...\n")

    # Nếu không có Demucs hoặc Demucs thất bại: Chạy DSP Fallback
    if engine_used != "demucs":
        sys.stderr.write("[INFO] Running DSP Fallback: Center-Channel Cancellation & Vocal Formant Isolation...\n")
        try:
            vocals_path, instrumental_path = run_dsp_fallback_separation(input_path, output_dir, args.mode, channels)
        except Exception as dsp_err:
            error_res = {
                "success": False,
                "error": f"DSP Fallback error: {str(dsp_err)}"
            }
            print(json.dumps(error_res))
            sys.exit(1)

    execution_time_ms = int((time.perf_counter() - start_time) * 1000)

    result = {
        "success": True,
        "engine": engine_used,
        "vocalsPath": os.path.abspath(vocals_path),
        "instrumentalPath": os.path.abspath(instrumental_path),
        "durationSec": round(duration_sec, 2),
        "executionTimeMs": execution_time_ms
    }

    # Xuất JSON duy nhất ra stdout để Node.js parse sạch sẽ
    print(json.dumps(result))

if __name__ == "__main__":
    main()
