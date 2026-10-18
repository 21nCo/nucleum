/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  convertAudioBufferToWav,
  convertWebMToWav
} from "@nucleum/client/runtime/audio/audio.utils";

describe("client/runtime/audio/audio.utils", () => {
  let originalAudioContext: typeof AudioContext | undefined;

  beforeEach(() => {
    originalAudioContext = (globalThis as any).AudioContext;
  });

  afterEach(() => {
    (globalThis as any).AudioContext = originalAudioContext;
    vi.resetAllMocks();
  });

  it("converts AudioBuffer instances to WAV", () => {
    const channelA = new Float32Array([0.25, -0.25]);
    const channelB = new Float32Array([0.75, -0.75]);
    const audioBuffer = {
      sampleRate: 44100,
      numberOfChannels: 2,
      length: 2,
      getChannelData: vi.fn((channel: number) =>
        channel === 0 ? channelA : channelB
      )
    } as unknown as AudioBuffer;

    const wav = convertAudioBufferToWav(audioBuffer);
    const view = new DataView(wav);

    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getInt16(44, true)).toBe(Math.trunc(0.25 * 0x7fff));
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.75 * 0x7fff));
    expect(view.getInt16(48, true)).toBe(Math.trunc(-0.25 * 0x8000));
    expect(view.getInt16(50, true)).toBe(Math.trunc(-0.75 * 0x8000));
  });

  it("converts WebM blobs to WAV blobs", async () => {
    const channel = new Float32Array([0.1]);
    const mockAudioBuffer = {
      sampleRate: 16000,
      numberOfChannels: 1,
      length: 1,
      getChannelData: vi.fn(() => channel)
    } as unknown as AudioBuffer;

    const decodeAudioData = vi.fn(async () => mockAudioBuffer);
    class MockAudioContext {
      decodeAudioData = decodeAudioData;
    }

    (globalThis as any).AudioContext = MockAudioContext as any;

    const blob = {
      arrayBuffer: async () => new ArrayBuffer(4)
    } as unknown as Blob;

    const result = await convertWebMToWav(blob);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("audio/wav");
    expect(result.size).toBeGreaterThan(0);
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
  });
});
