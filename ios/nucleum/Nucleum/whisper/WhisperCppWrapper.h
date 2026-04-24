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
- (instancetype)initWithModelPath:(NSString *)modelPath;

// Initialize with a model path and optional Core ML model path
- (instancetype)initWithModelPath:(NSString *)modelPath coreMLModelPath:(nullable NSString *)coreMLModelPath;

// Transcribe audio file at the specified path
- (NSString *)transcribeAudioAtPath:(NSString *)audioPath error:(NSError **)error;

// Transcribe audio file with advanced parameters
- (NSString *)transcribeAudioAtPath:(NSString *)audioPath 
                           language:(nullable NSString *)language
                 enableDiarization:(BOOL)enableDiarization
                   enableTimestamps:(BOOL)enableTimestamps
              enableImprovedFormat:(BOOL)enableImprovedFormat
                             error:(NSError **)error;

// Transcribe audio from raw PCM float data (more efficient for non-WAV formats)
- (NSString *)transcribeAudioFromPCMData:(const float *)pcmData 
                              sampleCount:(int)sampleCount 
                               sampleRate:(int)sampleRate 
                                    error:(NSError **)error;

// Transcribe audio from raw PCM float data with advanced parameters
- (NSString *)transcribeAudioFromPCMData:(const float *)pcmData 
                              sampleCount:(int)sampleCount 
                               sampleRate:(int)sampleRate
                                 language:(nullable NSString *)language
                       enableDiarization:(BOOL)enableDiarization
                         enableTimestamps:(BOOL)enableTimestamps
                    enableImprovedFormat:(BOOL)enableImprovedFormat
                                   error:(NSError **)error;

// Get library version
+ (NSString *)version;

// Check if Core ML is being used
- (BOOL)isUsingCoreML;

@end

NS_ASSUME_NONNULL_END 