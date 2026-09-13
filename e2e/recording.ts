/**
 * In-page evidence recorder (World V2 rebuild V3 — final capture set).
 *
 * Playwright's own `video` option screencasts the browser from context
 * creation (a black lead-in before the game has drawn a frame) and carries
 * NO audio track. This helper records the game's own canvas
 * (`canvas.captureStream`) together with the procedural audio bed and cues
 * (the DEV-only `window.__audioCaptureStream` tap on the audio kit's
 * master gain, src/gameplay/audio.ts) through a `MediaRecorder` running in
 * the page. Recording starts only when the caller says so — after the
 * game has booted and drawn — so the file opens on the first real frame.
 *
 * Chunks are streamed to Node through an exposed binding as they are
 * produced (one-second timeslices), so a long route never accumulates a
 * multi-hundred-megabyte blob in the page. Driver/evidence tooling only:
 * nothing here reads or writes game state.
 */
import { closeSync, mkdirSync, openSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Page } from '@playwright/test';

export interface RecordingInfo {
  /** Whether an audio track (the audio kit's master tap) was attached. */
  audio: boolean;
  mime: string;
  width: number;
  height: number;
  fps: number;
}

interface RecorderWindow {
  __audioCaptureStream?: () => MediaStream | null;
  __evidenceRecorder?: {
    recorder: MediaRecorder;
    stopped: Promise<void>;
  };
  __evidenceChunk?: (base64: string) => Promise<void>;
}

/**
 * Starts recording the game canvas (+ audio when the DEV tap exists) into
 * `outPath` (WebM, VP8 + Opus where supported). Call once per page.
 */
export async function startRecording(
  page: Page,
  outPath: string,
  options?: { fps?: number; videoBitsPerSecond?: number },
): Promise<RecordingInfo> {
  const fps = options?.fps ?? 12;
  const videoBitsPerSecond = options?.videoBitsPerSecond ?? 2_500_000;

  mkdirSync(dirname(outPath), { recursive: true });

  const fd = openSync(outPath, 'w');
  let closed = false;

  await page.exposeBinding('__evidenceChunk', (_source, base64: string) => {
    if (!closed) {
      writeSync(fd, Buffer.from(base64, 'base64'));
    }
  });

  page.once('close', () => {
    if (!closed) {
      closed = true;
      closeSync(fd);
    }
  });

  const info = await page.evaluate(
    ({ fps: rate, bps }) => {
      const w = window as unknown as RecorderWindow;
      const canvas = document.querySelector('canvas');

      if (canvas === null) {
        throw new Error('recording: no game canvas');
      }

      const stream = canvas.captureStream(rate);
      let audio = false;

      if (typeof w.__audioCaptureStream === 'function') {
        const tap = w.__audioCaptureStream();

        if (tap !== null) {
          for (const track of tap.getAudioTracks()) {
            stream.addTrack(track);
          }

          audio = tap.getAudioTracks().length > 0;
        }
      }

      const preferred = 'video/webm;codecs=vp8,opus';
      const mime = MediaRecorder.isTypeSupported(preferred)
        ? preferred
        : 'video/webm';
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: bps,
      });
      let chain: Promise<void> = Promise.resolve();
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          void chain.then(() => resolve());
        };
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) {
          return;
        }

        // Serialise the chunk hand-off so the file keeps chunk order.
        chain = chain.then(async () => {
          const buffer = await event.data.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';

          for (let index = 0; index < bytes.length; index += 0x8000) {
            binary += String.fromCharCode(
              ...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)),
            );
          }

          await w.__evidenceChunk?.(btoa(binary));
        });
      };

      w.__evidenceRecorder = { recorder, stopped };
      recorder.start(1000);

      return {
        audio,
        mime,
        width: canvas.width,
        height: canvas.height,
        fps: rate,
      };
    },
    { fps, bps: videoBitsPerSecond },
  );

  // The Node side closes the file when stopRecording resolves.
  (page as unknown as { __evidenceClose?: () => void }).__evidenceClose =
    () => {
      if (!closed) {
        closed = true;
        closeSync(fd);
      }
    };

  return info;
}

/** Stops the recorder, flushes the last chunk and closes the file. */
export async function stopRecording(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const w = window as unknown as RecorderWindow;
    const active = w.__evidenceRecorder;

    if (active === undefined) {
      return;
    }

    if (active.recorder.state !== 'inactive') {
      active.recorder.stop();
    }

    await active.stopped;
    w.__evidenceRecorder = undefined;
  });

  (page as unknown as { __evidenceClose?: () => void }).__evidenceClose?.();
}
