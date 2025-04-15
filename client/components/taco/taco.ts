import { logger } from "$lib/client/components/debug/logger.client";
import { embedBridge } from "$lib/client/components/embed/embed.store";
import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
import { wait } from "$lib/client/utils/time.utils";
import { generateMiniRandomId } from "$lib/shared/utils/crypto.utils";

export enum TranscriptionModel {
  TINY_EN = "tiny.en",
  BASE_EN = "base.en",
  SMALL_EN = "small.en",
  MEDIUM_EN = "medium.en",
  DISTILL_SMALL_EN = "distil-small.en"
}

export interface TranscriptionStatus {
  status: "processing" | "completed" | "failed";
  transcription?: string;
  progress?: number;
  error?: string;
}

export class Taco {
  private static instance: Taco;
  //   private lmStudioUrl: string = "http://localhost:1234/v1/audio/transcriptions";
  private lmStudioUrl: string = "http://localhost:1234/v1/models";

  private constructor() {}

  public static getInstance(): Taco {
    if (!Taco.instance) {
      Taco.instance = new Taco();
    }
    return Taco.instance;
  }

  /**
   * Generates a transcript from audio using LM Studio's Whisper model
   * @param audioData - The audio data to transcribe (Float32Array)
   * @param model - The Whisper model to use (defaults to base.en)
   * @returns Promise<string> - The transcribed text
   */
  public async generateTranscriptUsingLmStudio(
    audioData: Float32Array,
    model: TranscriptionModel = TranscriptionModel.BASE_EN
  ): Promise<string> {
    try {
      logger.debug({
        at: "Taco.generateTranscript",
        model,
        audioDataSize: audioData.length
      });

      // Convert Float32Array to WAV format
      const wavBuffer = this.convertToWav(audioData);

      const formData = new FormData();
      formData.append("file", new Blob([wavBuffer], { type: "audio/wav" }));
      formData.append("model", model);

      const response = await fetch(this.lmStudioUrl, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.text;
    } catch (error) {
      logger.error({
        at: "Taco.generateTranscript",
        error
      });
      throw error;
    }
  }

  /**
   * Converts Float32Array audio data to WAV format
   * @param audioData - Float32Array audio data
   * @returns ArrayBuffer - WAV format audio data
   */
  private convertToWav(audioData: Float32Array): ArrayBuffer {
    // WAV header parameters
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;

    // Calculate WAV header size (44 bytes)
    const headerSize = 44;
    const dataSize = audioData.length * 2; // 16-bit samples
    const bufferSize = headerSize + dataSize;

    // Create buffer for WAV file
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // Write WAV header
    // RIFF identifier
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true); // File size
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // Format chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Chunk size
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, (sampleRate * numChannels * bitsPerSample) / 8, true); // Byte rate
    view.setUint16(32, (numChannels * bitsPerSample) / 8, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample

    // Data chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true); // Data size

    // Write audio data
    const data = new Int16Array(buffer, headerSize);
    for (let i = 0; i < audioData.length; i++) {
      data[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7fff;
    }

    return buffer;
  }

  /**
   * Initiates audio transcription using iOS ML service
   * @param audioData - The audio data to transcribe (Float32Array)
   * @returns Promise<string> - The job ID for tracking transcription progress
   */
  public async initiateTranscriptionUsingCoreML(url: string): Promise<string> {
    try {
      logger.debug({
        at: "Taco.initiateTranscriptionUsingML",
        url
      });

      // Send audio data to iOS and get job ID
      const jobId = await embedBridge.fetch(
        generateMiniRandomId(),
        EmbedMessage.TRANSCRIBE_AUDIO,
        { url }
      );

      if (!jobId) {
        throw new Error("Failed to get transcription job ID");
      }

      return jobId;
    } catch (error) {
      logger.error({
        at: "Taco.initiateTranscriptionUsingML",
        error
      });
      throw error;
    }
  }

  /**
   * Checks the status of a transcription job
   * @param jobId - The ID of the transcription job to check
   * @returns Promise<TranscriptionStatus> - The current status of the transcription
   */
  public async checkTranscriptionStatus(
    jobId: string
  ): Promise<TranscriptionStatus> {
    try {
      logger.debug({
        at: "Taco.checkTranscriptionStatus",
        jobId
      });

      const result = await embedBridge.fetch(
        generateMiniRandomId(),
        EmbedMessage.CHECK_TRANSCRIPTION_STATUS,
        { jobId }
      );

      if (!result) {
        throw new Error("Failed to get transcription status");
      }

      return result as TranscriptionStatus;
    } catch (error) {
      logger.error({
        at: "Taco.checkTranscriptionStatus",
        error
      });
      throw error;
    }
  }
}
