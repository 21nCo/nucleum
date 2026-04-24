//
//  WhisperCppWrapper.mm
//  Memotron
//
//  Created for Memotron on 4/20/25.
//

#import "WhisperCppWrapper.h"
#include <cstring>
#include <string>
#include <vector>
#include <fstream>
#include <iostream>
#include <thread>

// Import whisper.cpp header
#include <whisper/whisper.h>

@implementation WhisperCppWrapper {
    struct whisper_context * ctx;
    BOOL isUsingCoreML;
}

- (instancetype)initWithModelPath:(NSString *)modelPath {
    return [self initWithModelPath:modelPath coreMLModelPath:nil];
}

- (instancetype)initWithModelPath:(NSString *)modelPath coreMLModelPath:(nullable NSString *)coreMLModelPath {
    self = [super init];
    if (self) {
        isUsingCoreML = NO;
        
        // Initialize without Core ML
        ctx = whisper_init_from_file([modelPath UTF8String]);
        
        if (ctx == nullptr) {
            NSLog(@"Failed to initialize whisper context with model: %@", modelPath);
            return nil;
        }
    }
    return self;
}

- (void)dealloc {
    if (ctx) {
        whisper_free(ctx);
        ctx = nullptr;
    }
}

- (NSString *)transcribeAudioAtPath:(NSString *)audioPath error:(NSError **)error {
    return [self transcribeAudioAtPath:audioPath 
                              language:nil 
                    enableDiarization:NO 
                      enableTimestamps:NO 
                 enableImprovedFormat:NO 
                                error:error];
}

- (NSString *)transcribeAudioAtPath:(NSString *)audioPath 
                           language:(nullable NSString *)language
                 enableDiarization:(BOOL)enableDiarization
                   enableTimestamps:(BOOL)enableTimestamps
              enableImprovedFormat:(BOOL)enableImprovedFormat
                             error:(NSError **)error {
    if (!ctx) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:1 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Whisper context not initialized"}];
        }
        return nil;
    }
    
    // Load WAV file
    NSData *audioData = [NSData dataWithContentsOfFile:audioPath];
    if (!audioData) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:2 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Failed to load audio file"}];
        }
        return nil;
    }
    
    NSLog(@"Audio file size: %lu bytes", (unsigned long)audioData.length);
    
    // Process WAV header (assuming standard WAV format)
    if (audioData.length < 44) { // Minimum WAV header size
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:3 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Invalid WAV file: too small"}];
        }
        return nil;
    }
    
    const uint8_t *bytes = (const uint8_t *)[audioData bytes];
    
    // Verify RIFF header
    if (bytes[0] != 'R' || bytes[1] != 'I' || bytes[2] != 'F' || bytes[3] != 'F') {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:4 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Invalid WAV file: not RIFF format"}];
        }
        return nil;
    }
    
    // Find the "fmt " chunk first
    int fmtPos = -1;
    int fmtSize = 0;
    for (int i = 12; i < audioData.length - 8; i++) {
        if (bytes[i] == 'f' && bytes[i+1] == 'm' && bytes[i+2] == 't' && bytes[i+3] == ' ') {
            fmtPos = i + 8;  // Skip "fmt " and chunk size
            fmtSize = bytes[i+4] | (bytes[i+5] << 8) | (bytes[i+6] << 16) | (bytes[i+7] << 24);
            NSLog(@"Found fmt chunk at position %d with size %d", i, fmtSize);
            break;
        }
    }
    
    if (fmtPos == -1) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:5 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Invalid WAV file: no fmt chunk"}];
        }
        return nil;
    }
    
    // Read format information from the fmt chunk
    int format_tag = bytes[fmtPos] | (bytes[fmtPos + 1] << 8);
    int num_channels = bytes[fmtPos + 2] | (bytes[fmtPos + 3] << 8);
    int sample_rate = bytes[fmtPos + 4] | (bytes[fmtPos + 5] << 8) | (bytes[fmtPos + 6] << 16) | (bytes[fmtPos + 7] << 24);
    int bits_per_sample = bytes[fmtPos + 14] | (bytes[fmtPos + 15] << 8);
    
    NSLog(@"Format tag: %d", format_tag);
    NSLog(@"Sample rate from WAV: %d Hz", sample_rate);
    NSLog(@"Number of channels: %d", num_channels);
    NSLog(@"Bits per sample: %d", bits_per_sample);
    
    // Find the "data" chunk
    int dataPos = -1;
    int dataSize = 0;
    
    // Search for the "data" chunk
    for (int i = fmtPos + fmtSize; i < audioData.length - 8; i++) {
        if (bytes[i] == 'd' && bytes[i+1] == 'a' && bytes[i+2] == 't' && bytes[i+3] == 'a') {
            dataSize = bytes[i+4] | (bytes[i+5] << 8) | (bytes[i+6] << 16) | (bytes[i+7] << 24);
            dataPos = i + 8; // Skip the "data" marker and size
            NSLog(@"Found data chunk at position %d with size %d bytes", i, dataSize);
            break;
        }
    }
    
    if (dataPos == -1) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:6 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Invalid WAV file: no data chunk"}];
        }
        return nil;
    }
    
    // Calculate actual samples
    const int n_samples = dataSize / (bits_per_sample / 8) / num_channels;
    const double audio_length_ms = (n_samples * 1000.0) / sample_rate;
    NSLog(@"Audio length: %.2f ms (%d samples)", audio_length_ms, n_samples);
    
    // Convert to float samples for whisper
    std::vector<float> pcmf32;
    pcmf32.resize(n_samples);
    
    // Convert samples based on bit depth
    if (bits_per_sample == 16) {
        const int16_t *samples = (const int16_t *)(bytes + dataPos);
        for (int i = 0; i < n_samples; i++) {
            // Average multiple channels if necessary
            float sum = 0.0f;
            for (int j = 0; j < num_channels; j++) {
                sum += samples[i * num_channels + j] / 32768.0f;
            }
            pcmf32[i] = sum / num_channels;
        }
    } else if (bits_per_sample == 8) {
        const uint8_t *samples = bytes + dataPos;
        for (int i = 0; i < n_samples; i++) {
            float sum = 0.0f;
            for (int j = 0; j < num_channels; j++) {
                sum += (samples[i * num_channels + j] - 128) / 128.0f;
            }
            pcmf32[i] = sum / num_channels;
        }
    } else if (bits_per_sample == 24) {
        // Handle 24-bit audio (3 bytes per sample)
        for (int i = 0; i < n_samples; i++) {
            float sum = 0.0f;
            for (int j = 0; j < num_channels; j++) {
                // Read 3 bytes and convert to a 24-bit integer
                int sample_idx = dataPos + (i * num_channels + j) * 3;
                int32_t sample = (bytes[sample_idx] << 8) | (bytes[sample_idx + 1] << 16) | (bytes[sample_idx + 2] << 24);
                // Convert to float and normalize
                sum += sample / 8388608.0f; // 2^23
            }
            pcmf32[i] = sum / num_channels;
        }
    } else if (bits_per_sample == 32) {
        // Handle 32-bit audio (could be int or float)
        // Check if this is float format
        int format_tag = bytes[20] | (bytes[21] << 8);
        if (format_tag == 3) { // IEEE float
            const float *samples = (const float *)(bytes + dataPos);
            for (int i = 0; i < n_samples; i++) {
                float sum = 0.0f;
                for (int j = 0; j < num_channels; j++) {
                    sum += samples[i * num_channels + j];
                }
                pcmf32[i] = sum / num_channels;
            }
        } else { // 32-bit int
            const int32_t *samples = (const int32_t *)(bytes + dataPos);
            for (int i = 0; i < n_samples; i++) {
                float sum = 0.0f;
                for (int j = 0; j < num_channels; j++) {
                    sum += samples[i * num_channels + j] / 2147483648.0f; // 2^31
                }
                pcmf32[i] = sum / num_channels;
            }
        }
    } else {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:5 
                                     userInfo:@{NSLocalizedDescriptionKey: [NSString stringWithFormat:@"Unsupported bit depth: %d", bits_per_sample]}];
        }
        return nil;
    }
    
    // Ensure minimum audio length (100ms at 16kHz = 1600 samples)
    const int required_samples = (int)(0.1 * 16000); // 100ms at 16kHz
    NSLog(@"Original PCM size: %zu samples", pcmf32.size());
    
    if (pcmf32.size() < required_samples) {
        NSLog(@"Audio too short, padding from %zu to %d samples", pcmf32.size(), required_samples);
        std::vector<float> padded(required_samples, 0.0f);
        std::copy(pcmf32.begin(), pcmf32.end(), padded.begin());
        pcmf32 = std::move(padded);
    }
    
    // Verify final buffer size
    NSLog(@"Final PCM size: %zu samples (%.2f ms at 16kHz)", 
          pcmf32.size(), 
          (pcmf32.size() * 1000.0) / 16000.0);
    
    // Prepare whisper parameters with custom settings
    whisper_full_params wparams = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    wparams.print_realtime   = false;
    wparams.print_progress   = false;
    wparams.print_timestamps = enableTimestamps;
    wparams.translate        = false;
    wparams.language         = language ? [language UTF8String] : "en";
    wparams.n_threads        = std::min(8, (int)std::thread::hardware_concurrency());
    wparams.offset_ms        = 0;
    
    // Enhanced formatting options
    if (enableImprovedFormat) {
        wparams.print_special    = false;
        wparams.no_context       = false;
        wparams.single_segment   = false;
    }
    
    // Speaker diarization is not directly supported by whisper.cpp core
    // but we can enable some related features
    if (enableDiarization) {
        // Enable word-level timestamps which can help with speaker separation in post-processing
        wparams.print_timestamps = true;
        wparams.token_timestamps = true;
    }
    
    // Run the whisper inference
    if (whisper_full(ctx, wparams, pcmf32.data(), pcmf32.size()) != 0) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:3 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Failed to process audio with whisper"}];
        }
        return nil;
    }
    
    // Extract the transcription result
    NSMutableString *transcription = [NSMutableString string];
    const int n_segments = whisper_full_n_segments(ctx);
    
    if (enableTimestamps) {
        // Include timestamps in the output
        for (int i = 0; i < n_segments; ++i) {
            const int64_t t0 = whisper_full_get_segment_t0(ctx, i);
            const int64_t t1 = whisper_full_get_segment_t1(ctx, i);
            const char* segment_text = whisper_full_get_segment_text(ctx, i);
            
            // Convert timestamps to seconds
            double start_time = t0 / 100.0;
            double end_time = t1 / 100.0;
            
            [transcription appendFormat:@"[%.2f - %.2f] %s ", start_time, end_time, segment_text];
        }
    } else {
        // Standard output without timestamps
        for (int i = 0; i < n_segments; ++i) {
            const char* segment_text = whisper_full_get_segment_text(ctx, i);
            [transcription appendFormat:@"%s ", segment_text];
        }
    }
    
    return [transcription stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
}

- (NSString *)transcribeAudioFromPCMData:(const float *)pcmData 
                              sampleCount:(int)sampleCount 
                               sampleRate:(int)sampleRate 
                                    error:(NSError **)error {
    return [self transcribeAudioFromPCMData:pcmData 
                                sampleCount:sampleCount 
                                 sampleRate:sampleRate 
                                   language:nil 
                         enableDiarization:NO 
                           enableTimestamps:NO 
                      enableImprovedFormat:NO 
                                     error:error];
}

- (NSString *)transcribeAudioFromPCMData:(const float *)pcmData 
                              sampleCount:(int)sampleCount 
                               sampleRate:(int)sampleRate
                                 language:(nullable NSString *)language
                       enableDiarization:(BOOL)enableDiarization
                         enableTimestamps:(BOOL)enableTimestamps
                    enableImprovedFormat:(BOOL)enableImprovedFormat
                                   error:(NSError **)error {
    if (!ctx) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:1 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Whisper context not initialized"}];
        }
        return nil;
    }
    
    if (!pcmData || sampleCount <= 0) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:2 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Invalid PCM data or sample count"}];
        }
        return nil;
    }
    
    NSLog(@"Processing PCM data: %d samples at %d Hz", sampleCount, sampleRate);
    
    // Copy PCM data to vector (Whisper expects 16kHz, so resample if needed)
    std::vector<float> pcmf32;
    
    if (sampleRate == 16000) {
        // Direct copy if already 16kHz
        pcmf32.assign(pcmData, pcmData + sampleCount);
        NSLog(@"Using PCM data directly (already 16kHz)");
    } else {
        // Simple resampling (linear interpolation)
        const double ratio = 16000.0 / sampleRate;
        const int target_samples = (int)(sampleCount * ratio);
        pcmf32.resize(target_samples);
        
        NSLog(@"Resampling from %d Hz to 16 kHz: %d -> %d samples", sampleRate, sampleCount, target_samples);
        
        for (int i = 0; i < target_samples; i++) {
            const double src_index = i / ratio;
            const int src_i = (int)src_index;
            const double frac = src_index - src_i;
            
            if (src_i + 1 < sampleCount) {
                // Linear interpolation
                pcmf32[i] = pcmData[src_i] * (1.0 - frac) + pcmData[src_i + 1] * frac;
            } else {
                // Use last sample
                pcmf32[i] = pcmData[std::min(src_i, sampleCount - 1)];
            }
        }
    }
    
    // Ensure minimum audio length (100ms at 16kHz = 1600 samples)
    const int required_samples = (int)(0.1 * 16000); // 100ms at 16kHz
    NSLog(@"PCM size after resampling: %zu samples", pcmf32.size());
    
    if (pcmf32.size() < required_samples) {
        NSLog(@"Audio too short, padding from %zu to %d samples", pcmf32.size(), required_samples);
        std::vector<float> padded(required_samples, 0.0f);
        std::copy(pcmf32.begin(), pcmf32.end(), padded.begin());
        pcmf32 = std::move(padded);
    }
    
    // Verify final buffer size
    NSLog(@"Final PCM size: %zu samples (%.2f ms at 16kHz)", 
          pcmf32.size(), 
          (pcmf32.size() * 1000.0) / 16000.0);
    
    // Prepare whisper parameters with custom settings
    whisper_full_params wparams = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    wparams.print_realtime   = false;
    wparams.print_progress   = false;
    wparams.print_timestamps = enableTimestamps;
    wparams.translate        = false;
    wparams.language         = language ? [language UTF8String] : "en";
    wparams.n_threads        = std::min(8, (int)std::thread::hardware_concurrency());
    wparams.offset_ms        = 0;
    
    // Enhanced formatting options
    if (enableImprovedFormat) {
        wparams.print_special    = false;
        wparams.no_context       = false;
        wparams.single_segment   = false;
    }
    
    // Speaker diarization is not directly supported by whisper.cpp core
    // but we can enable some related features
    if (enableDiarization) {
        // Enable word-level timestamps which can help with speaker separation in post-processing
        wparams.print_timestamps = true;
        wparams.token_timestamps = true;
    }
    
    // Run the whisper inference
    if (whisper_full(ctx, wparams, pcmf32.data(), pcmf32.size()) != 0) {
        if (error) {
            *error = [NSError errorWithDomain:@"WhisperCppWrapper" 
                                         code:3 
                                     userInfo:@{NSLocalizedDescriptionKey: @"Failed to process audio with whisper"}];
        }
        return nil;
    }
    
    // Extract the transcription result
    NSMutableString *transcription = [NSMutableString string];
    const int n_segments = whisper_full_n_segments(ctx);
    
    if (enableTimestamps) {
        // Include timestamps in the output
        for (int i = 0; i < n_segments; ++i) {
            const int64_t t0 = whisper_full_get_segment_t0(ctx, i);
            const int64_t t1 = whisper_full_get_segment_t1(ctx, i);
            const char* segment_text = whisper_full_get_segment_text(ctx, i);
            
            // Convert timestamps to seconds
            double start_time = t0 / 100.0;
            double end_time = t1 / 100.0;
            
            [transcription appendFormat:@"[%.2f - %.2f] %s ", start_time, end_time, segment_text];
        }
    } else {
        // Standard output without timestamps
        for (int i = 0; i < n_segments; ++i) {
            const char* segment_text = whisper_full_get_segment_text(ctx, i);
            [transcription appendFormat:@"%s ", segment_text];
        }
    }
    
    return [transcription stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
}

- (BOOL)isUsingCoreML {
    return isUsingCoreML;
}

+ (NSString *)version {
    return [NSString stringWithUTF8String:whisper_print_system_info()];
}

@end 