"use client";

import type { Conversion, Input } from "mediabunny";

export const VIDEO_COMPRESSION_THRESHOLD_BYTES = 5 * 1024 * 1024;
export const VIDEO_COMPRESSION_TARGET_BYTES = Math.floor(
  4.7 * 1024 * 1024,
);

const MIN_VIDEO_BITRATE = 260_000;
const MAX_VIDEO_BITRATE = 1_400_000;
const AUDIO_BITRATE = 48_000;
const TARGET_FRAME_RATE = 24;
const MAX_LONG_SIDE = 854;
const MAX_SHORT_SIDE = 480;

let aacFallbackRegistered = false;

export interface VideoCompressionOptions {
  onProgress?: (progress: number) => void;
}

export interface VideoCompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  duration: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  wasCompressed: boolean;
}

function makeEven(value: number): number {
  const rounded = Math.max(2, Math.round(value));
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

function calculateOutputSize(
  width: number,
  height: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    throw new Error("The video dimensions could not be read.");
  }

  const landscape = width >= height;
  const longSide = landscape ? width : height;
  const shortSide = landscape ? height : width;

  const scale = Math.min(
    1,
    MAX_LONG_SIDE / longSide,
    MAX_SHORT_SIDE / shortSide,
  );

  return {
    width: makeEven(width * scale),
    height: makeEven(height * scale),
  };
}

function calculateVideoBitrate(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 650_000;
  }

  const usableBits = VIDEO_COMPRESSION_TARGET_BYTES * 8 * 0.94;
  const totalBitrate = Math.floor(usableBits / duration);
  const videoBitrate = totalBitrate - AUDIO_BITRATE;

  return Math.max(
    MIN_VIDEO_BITRATE,
    Math.min(MAX_VIDEO_BITRATE, videoBitrate),
  );
}

function compressedFileName(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[^/.]+$/, "");
  return `${withoutExtension}-nookly-compressed.mp4`;
}

export async function compressVideoFile(
  file: File,
  options: VideoCompressionOptions = {},
): Promise<VideoCompressionResult> {
  if (file.size <= VIDEO_COMPRESSION_THRESHOLD_BYTES) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      duration: 0,
      originalWidth: 0,
      originalHeight: 0,
      outputWidth: 0,
      outputHeight: 0,
      wasCompressed: false,
    };
  }

  if (typeof window === "undefined") {
    throw new Error("Video compression is only available in the browser.");
  }

  if (!("VideoEncoder" in window) || !("VideoDecoder" in window)) {
    throw new Error(
      "This browser cannot compress videos. Use a current version of Chrome, Edge, or Safari.",
    );
  }

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    canEncodeAudio,
    canEncodeVideo,
  } = await import("mediabunny");

  let input: Input | null = null;
  let conversion: Conversion | null = null;

  try {
    options.onProgress?.(0.01);

    input = new Input({
      source: new BlobSource(file),
      formats: ALL_FORMATS,
    });

    if (!(await input.canRead())) {
      throw new Error(
        "The selected video format could not be read by this browser.",
      );
    }

    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) {
      throw new Error("The selected file does not contain a video track.");
    }

    if (!(await videoTrack.canDecode())) {
      throw new Error(
        "This browser cannot decode the phone video's codec. Try selecting an MP4 recorded with H.264 compatibility enabled.",
      );
    }

    const [
      metadataDuration,
      originalWidth,
      originalHeight,
      audioTrack,
    ] = await Promise.all([
      input.getDurationFromMetadata(),
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      input.getPrimaryAudioTrack(),
    ]);

    const duration =
      metadataDuration && metadataDuration > 0
        ? metadataDuration
        : await input.computeDuration(undefined, {
            metadataOnly: true,
          });

    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("The video duration could not be determined.");
    }

    const outputSize = calculateOutputSize(
      originalWidth,
      originalHeight,
    );
    const videoBitrate = calculateVideoBitrate(duration);

    /*
     * frameRate is a ConversionVideoOptions transform setting, not a
     * canEncodeVideo() encoder capability option. The capability check
     * therefore verifies only the actual encoder configuration.
     */
    const videoEncodingSupported = await canEncodeVideo("avc", {
      width: outputSize.width,
      height: outputSize.height,
      bitrate: videoBitrate,
      bitrateMode: "variable",
      hardwareAcceleration: "prefer-hardware",
    });

    if (!videoEncodingSupported) {
      throw new Error(
        "This browser cannot encode a compatible MP4 video on this device.",
      );
    }

    if (audioTrack) {
      const audioEncodingSupported = await canEncodeAudio("aac", {
        numberOfChannels: 1,
        sampleRate: 48_000,
        bitrate: AUDIO_BITRATE,
      });

      if (!audioEncodingSupported && !aacFallbackRegistered) {
        const { registerAacEncoder } = await import(
          "@mediabunny/aac-encoder"
        );

        registerAacEncoder();
        aacFallbackRegistered = true;
      }
    }

    const output = new Output({
      target: new BufferTarget(),
      format: new Mp4OutputFormat({
        fastStart: "in-memory",
      }),
    });

    conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video: {
        codec: "avc",
        width: outputSize.width,
        height: outputSize.height,
        frameRate: TARGET_FRAME_RATE,
        bitrate: videoBitrate,
        hardwareAcceleration: "prefer-hardware",
      },
      audio: audioTrack
        ? {
            codec: "aac",
            numberOfChannels: 1,
            sampleRate: 48_000,
            bitrate: AUDIO_BITRATE,
          }
        : undefined,
      tags: {},
    });

    if (!conversion.isValid) {
      throw new Error(
        "The video contains tracks that cannot be converted safely.",
      );
    }

    conversion.onProgress = (progress) => {
      const safeProgress = Number.isFinite(progress)
        ? Math.max(0, Math.min(1, progress))
        : 0;

      options.onProgress?.(safeProgress);
    };

    await conversion.execute();

    const buffer = output.target.buffer;

    if (!buffer || buffer.byteLength === 0) {
      throw new Error("Compression finished without producing a video.");
    }

    if (buffer.byteLength >= file.size) {
      throw new Error(
        "The compressed result was not smaller than the original video.",
      );
    }

    const compressed = new File(
      [buffer],
      compressedFileName(file.name),
      {
        type: "video/mp4",
        lastModified: Date.now(),
      },
    );

    options.onProgress?.(1);

    return {
      file: compressed,
      originalSize: file.size,
      compressedSize: compressed.size,
      duration,
      originalWidth,
      originalHeight,
      outputWidth: outputSize.width,
      outputHeight: outputSize.height,
      wasCompressed: true,
    };
  } catch (error) {
    if (conversion) {
      await conversion.cancel().catch(() => undefined);
    }

    throw error instanceof Error
      ? error
      : new Error("The video could not be compressed.");
  } finally {
    input?.dispose();
  }
}