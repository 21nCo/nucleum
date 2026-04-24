# Whisper.cpp Integration with Core ML Support

This folder contains the necessary files to integrate the [whisper.cpp](https://github.com/ggml-org/whisper.cpp) library with Memotron, including optional Core ML acceleration.

## Setup Instructions

1. From the monorepo root, prepare the shared local Whisper checkout:
```bash
npm run setup:ios:whisper
```

   This clones and builds the ignored local checkout at `ios/vendor/whisper.cpp`.

2. Add the XCFramework to the Memotron project if the Xcode reference needs to be recreated:
   - Open Xcode and select the Memotron project
   - Go to the 'General' tab and scroll down to the 'Frameworks, Libraries, and Embedded Content' section
   - Click the '+' button
   - Click 'Add Other...' > 'Add Files...'
   - Navigate to the `../vendor/whisper.cpp/build-apple/whisper.xcframework` folder and select it
   - Make sure 'Embed & Sign' is selected

3. Add the necessary header files:
   - In Xcode, right-click on the project and select 'Add Files to "Memotron"'
   - Navigate to the `../vendor/whisper.cpp` folder and select the `whisper.h` file
   - Select 'Create folder references' and make sure the Memotron target is checked
   - Click 'Add'

4. Configure the bridging header:
   - In the Memotron target's build settings, search for 'Objective-C Bridging Header'
   - Set it to `Memotron/whisper/Memotron-Bridging-Header.h`

5. Make sure C++ support is enabled:
   - In build settings, set 'Enable C++ Exceptions' to Yes
   - Set 'Enable C++ Runtime Types' to Yes

## Core ML Acceleration

This implementation supports Core ML acceleration for improved performance on Apple Silicon devices.

### How Core ML Support Works

1. The regular whisper.cpp model is still needed for the decoder part.
2. Core ML is used for the encoder part, which is the most computationally intensive portion.
3. The system will automatically download both models when needed:
   - Main GGML model: `ggml-tiny.en.bin` (~75MB)
   - Core ML encoder model: `ggml-tiny.en-encoder.mlmodelc` (~150MB)

### Configuration

Core ML acceleration is enabled by default. You can control this in `AIService.swift`:

```swift
private var useCoreML: Bool = true  // Set to false to disable Core ML
```

### Performance Benefits

- **Improved Speed**: Up to 2-4x faster transcription on supported devices
- **Better Battery Efficiency**: Lower power consumption during transcription
- **Neural Engine Utilization**: Takes advantage of Apple's Neural Engine on newer devices

## Important Notes

- The model files are NOT included in the app bundle. They are downloaded on-demand when needed.
- You can adjust the model URL in `AIService.swift` to use different models (tiny, base, small, etc.)
- The first time a user requests a transcription, the model(s) will be downloaded from HuggingFace.
- After download, models are cached locally for future use.
- Models are stored in the app's documents directory in a folder called "WhisperModels".
- If Core ML initialization fails for any reason, the system gracefully falls back to the standard model.

## Model Sizes and Performance

| Model | GGML Size | CoreML Size | Accuracy | Memory Usage | Processing Speed |
|-------|-----------|-------------|----------|--------------|-----------------|
| Tiny  | ~75MB     | ~150MB      | Moderate | Low          | Fast            |
| Base  | ~150MB    | ~300MB      | Good     | Medium       | Medium          |
| Small | ~500MB    | ~1GB        | Very Good| High         | Slower          |
| Medium| ~1.5GB    | ~3GB        | Excellent| Very High    | Slowest         |

For iOS devices, the tiny or base models are recommended for the best balance of performance and accuracy.

## Troubleshooting

1. **"CoreML model failed to download"**: The application will fall back to the standard model. Check internet connectivity and try again.

2. **"Whisper context not initialized"**: Ensure whisper.xcframework is properly added to the project.

3. **Slow performance on first run**: The first run with Core ML may be slower as the model is compiled for your device's specific architecture.

4. **Out of memory errors**: Use a smaller model size, or disable Core ML for older devices with limited RAM. 
