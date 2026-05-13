//
//  WhisperCppWrapper.h
//  Memotron
//
//  Created for Memotron on 4/20/25.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface WhisperCppWrapper : NSObject

// Initialize with a model path
- (nullable instancetype)initWithModelPath:(NSString *)modelPath;

// Initialize with a model path and optional Core ML model path
- (nullable instancetype)initWithModelPath:(NSString *)modelPath coreMLModelPath:(nullable NSString *)coreMLModelPath;

// Transcribe audio file at the specified path
- (nullable NSString *)transcribeAudioAtPath:(NSString *)audioPath error:(NSError * _Nullable * _Nullable)error;

// Transcribe audio file with advanced parameters
- (nullable NSString *)transcribeAudioAtPath:(NSString *)audioPath
                           language:(nullable NSString *)language
                 enableDiarization:(BOOL)enableDiarization
                   enableTimestamps:(BOOL)enableTimestamps
              enableImprovedFormat:(BOOL)enableImprovedFormat
                             error:(NSError * _Nullable * _Nullable)error;

// Transcribe audio from raw PCM float data (more efficient for non-WAV formats)
- (nullable NSString *)transcribeAudioFromPCMData:(const float *)pcmData
                              sampleCount:(int)sampleCount
                               sampleRate:(int)sampleRate
                                    error:(NSError * _Nullable * _Nullable)error;

// Transcribe audio from raw PCM float data with advanced parameters
- (nullable NSString *)transcribeAudioFromPCMData:(const float *)pcmData
                              sampleCount:(int)sampleCount
                               sampleRate:(int)sampleRate
                                 language:(nullable NSString *)language
                       enableDiarization:(BOOL)enableDiarization
                         enableTimestamps:(BOOL)enableTimestamps
                    enableImprovedFormat:(BOOL)enableImprovedFormat
                                   error:(NSError * _Nullable * _Nullable)error;

// Get library version
+ (NSString *)version;

// Check if Core ML is being used
- (BOOL)isUsingCoreML;

@end

NS_ASSUME_NONNULL_END
