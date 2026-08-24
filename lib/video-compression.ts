"use client";

import { registerAacEncoder } from "@mediabunny/aac-encoder";
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  canEncodeAudio,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
} from "mediabunny";

export const MAX_PROPERTY_VIDEO_DURATION_SECONDS = 90;
export const MAX_PROPERTY_VIDEO_SOURCE_BYTES = 500 * 1024 * 1024;
export const MAX_PROPERTY_VIDEO_OUTPUT_BYTES = 18 * 1024 * 1024;

const TARGET_VIDEO_BITRATE = 1_000_000;
const TARGET_AUDIO_BITRATE = 80_000;
const MAX_OUTPUT_WIDTH = 1280;
const MAX_OUTPUT_HEIGHT = 720;

const ACCEPTED_VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "m4v",
  "webm",
]);

let aacFallbackRegistered = false;

export interface PropertyVideoInfo {
  durationSeconds: number;
  width: number;
  height: number;
  sourceBytes: number;
  sourceMimeType: string;
  sourceName: string;
}

export interface CompressedPropertyVideo {
  file: File;
  info: PropertyVideoInfo;
  originalBytes: number;
  compressedBytes: number;
  compressionRatio: number;
}

export interface VideoCompressionProgress {
  stage: "analyzing" | "compressing" | "finalizing";
  progress: number;
}

function extensionOf(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) || "" : "";
}

function sanitizedBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const cleaned = withoutExtension
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return cleaned || "property-video";
}

function isAcceptedVideoFile(file: File): boolean {
  const extension = extensionOf(file.name);

  if (ACCEPTED_VIDEO_EXTENSIONS.has(extension)) {
    return true;
  }

  return file.type.startsWith("video/");
}

function userFriendlyMediaError(error: unknown): Error {
  const raw =
    error instanceof Error
      ? error.message
      : "The selected video could not be processed.";

  const message = raw.toLowerCase();

  if (
    message.includes("decode") ||
    message.includes("codec") ||
    message.includes("unsupported")
  ) {
    return new Error(
      "This browser cannot decode this video's codec. Choose an MP4/H.264, MOV, M4V, or WebM video recorded with a standard phone/camera codec.",
    );
  }

  if (
    message.includes("memory") ||
    message.includes("allocation") ||
    message.includes("out of")
  ) {
    return new Error(
      "The browser ran out of memory while compressing this video. Close other heavy tabs or choose a smaller video and try again.",
    );
  }

  return new Error(`Video compression failed. ${raw}`);
}

async function createInput(file: File): Promise<Input> {
  return new Input({
    formats: ALL_FORMATS,
    source: new BlobSource(file, {
      maxCacheSize: 8 * 1024 * 1024,
    }),
  });
}

async function ensureAacEncoder(): Promise<void> {
  if (await canEncodeAudio("aac")) {
    return;
  }

  if (!aacFallbackRegistered) {
    registerAacEncoder();
    aacFallbackRegistered = true;
  }
}

export async function inspectPropertyVideo(
  file: File,
): Promise<PropertyVideoInfo> {
  if (!(file instanceof File)) {
    throw new Error("Choose a valid video file.");
  }

  if (file.size <= 0) {
    throw new Error("The selected video is empty.");
  }

  if (file.size > MAX_PROPERTY_VIDEO_SOURCE_BYTES) {
    throw new Error(
      "The original video is too large. Choose a source video smaller than 500 MB.",
    );
  }

  if (!isAcceptedVideoFile(file)) {
    throw new Error("Choose an MP4, MOV, M4V, or WebM video.");
  }

  try {
    const input = await createInput(file);

    if (!(await input.canRead())) {
      throw new Error("The video container is unsupported or damaged.");
    }

    const videoTrack = await input.getPrimaryVideoTrack();

    if (!videoTrack) {
      throw new Error("The selected file does not contain a video track.");
    }

    if (!(await videoTrack.canDecode())) {
      throw new Error("The browser cannot decode this video codec.");
    }

    const metadataDuration = await input.getDurationFromMetadata(undefined, {
      skipLiveWait: true,
    });

    const durationSeconds =
      metadataDuration !== null &&
      Number.isFinite(metadataDuration) &&
      metadataDuration > 0
        ? metadataDuration
        : await input.computeDuration(undefined, {
            metadataOnly: true,
            skipLiveWait: true,
          });

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error("The video's duration could not be determined.");
    }

    if (durationSeconds > MAX_PROPERTY_VIDEO_DURATION_SECONDS + 0.05) {
      throw new Error(
        `Each property verification video must be ${MAX_PROPERTY_VIDEO_DURATION_SECONDS} seconds or shorter.`,
      );
    }

    const [width, height] = await Promise.all([
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
    ]);

    if (
      !Number.isFinite(width) ||
      width <= 0 ||
      !Number.isFinite(height) ||
      height <= 0
    ) {
      throw new Error("The video's dimensions could not be determined.");
    }

    return {
      durationSeconds,
      width,
      height,
      sourceBytes: file.size,
      sourceMimeType: file.type || "video/*",
      sourceName: file.name,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes("90 seconds") ||
        error.message.includes("500 MB") ||
        error.message.includes("empty") ||
        error.message.includes("does not contain")
      )
    ) {
      throw error;
    }

    throw userFriendlyMediaError(error);
  }
}

function sizeTransform(width: number, height: number): {
  width?: number;
  height?: number;
} {
  const widthScale = MAX_OUTPUT_WIDTH / width;
  const heightScale = MAX_OUTPUT_HEIGHT / height;
  const scale = Math.min(1, widthScale, heightScale);

  if (scale >= 1) {
    return {};
  }

  if (widthScale <= heightScale) {
    const targetWidth = Math.max(2, Math.floor((width * scale) / 2) * 2);
    return { width: targetWidth };
  }

  const targetHeight = Math.max(2, Math.floor((height * scale) / 2) * 2);
  return { height: targetHeight };
}

export async function compressPropertyVideo(
  file: File,
  onProgress?: (progress: VideoCompressionProgress) => void,
): Promise<CompressedPropertyVideo> {
  onProgress?.({
    stage: "analyzing",
    progress: 0,
  });

  const info = await inspectPropertyVideo(file);

  onProgress?.({
    stage: "analyzing",
    progress: 1,
  });

  try {
    await ensureAacEncoder();

    const input = await createInput(file);
    const target = new BufferTarget();

    const output = new Output({
      format: new Mp4OutputFormat({
        fastStart: "in-memory",
      }),
      target,
    });

    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video: async (track) => {
        const [width, height] = await Promise.all([
          track.getDisplayWidth(),
          track.getDisplayHeight(),
        ]);

        return {
          codec: "avc",
          ...sizeTransform(width, height),
          frameRate: 30,
          quality: new Quality({
            bitrate: TARGET_VIDEO_BITRATE,
            bitrateMode: "constant",
          }),
          keyFrameInterval: 2,
          hardwareAcceleration: "prefer-hardware",
          forceTranscode: true,
        };
      },
      audio: {
        codec: "aac",
        quality: new Quality({
          bitrate: TARGET_AUDIO_BITRATE,
          bitrateMode: "constant",
        }),
        forceTranscode: true,
      },
      tags: {},
    });

    if (!conversion.isValid) {
      const reasons = conversion.discardedTracks
        .map((item) => item.reason)
        .filter(Boolean)
        .join("; ");

      throw new Error(
        reasons ||
          "This video's tracks cannot be converted to a browser-compatible MP4.",
      );
    }

    conversion.onProgress = (progress) => {
      onProgress?.({
        stage: "compressing",
        progress: Math.min(1, Math.max(0, progress)),
      });
    };

    await conversion.execute();

    onProgress?.({
      stage: "finalizing",
      progress: 1,
    });

    const buffer = target.buffer;

    if (!buffer || buffer.byteLength <= 0) {
      throw new Error("The compressor produced an empty output file.");
    }

    if (buffer.byteLength > MAX_PROPERTY_VIDEO_OUTPUT_BYTES) {
      throw new Error(
        `The compressed video is still too large (${(
          buffer.byteLength /
          (1024 * 1024)
        ).toFixed(1)} MB). Choose a shorter or lower-resolution clip.`,
      );
    }

    const compressedFile = new File(
      [buffer],
      `${sanitizedBaseName(file.name)}-nookly.mp4`,
      {
        type: "video/mp4",
        lastModified: Date.now(),
      },
    );

    return {
      file: compressedFile,
      info,
      originalBytes: file.size,
      compressedBytes: compressedFile.size,
      compressionRatio:
        file.size > 0 ? compressedFile.size / file.size : 1,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes("still too large") ||
        error.message.includes("empty output")
      )
    ) {
      throw error;
    }

    throw userFriendlyMediaError(error);
  }
}
