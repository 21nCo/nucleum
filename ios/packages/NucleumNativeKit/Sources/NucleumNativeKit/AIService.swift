//
//  AIService.swift
//  Memotron
//
//  Created by AI on 4/13/25.
//

import AVFoundation
import Combine
import CoreML
import CoreMedia
import Foundation

#if canImport(Darwin)
  import Darwin
#endif

// TranscriptionTask status enum
enum TranscriptionStatus: String, Codable {
  case downloading
  case processing
  case completed
  case failed
}

// TranscriptionChunk model
struct TranscriptionChunk: Codable {
  let index: Int
  let startTime: Double
  let endTime: Double
  var text: String
  var isProcessed: Bool
}

// TranscriptionTask model
struct TranscriptionTask: Codable {
  let id: String
  let requestId: String
  let audioURL: String
  let audioFilePath: String?
  let modelPath: String
  let createdAt: Date
  var updatedAt: Date
  var status: TranscriptionStatus
  var progress: Double
  var transcription: String
  var chunks: [TranscriptionChunk]

  enum CodingKeys: String, CodingKey {
    case id, requestId, audioURL, audioFilePath, modelPath, createdAt, updatedAt, status, progress,
      transcription, chunks
  }

  init(
    id: String, requestId: String, audioURL: String, audioFilePath: String?, modelPath: String,
    progress: Double, status: TranscriptionStatus, chunks: [TranscriptionChunk], createdAt: Date,
    updatedAt: Date, transcription: String
  ) {
    self.id = id
    self.requestId = requestId
    self.audioURL = audioURL
    self.audioFilePath = audioFilePath
    self.modelPath = modelPath
    self.createdAt = createdAt
    self.updatedAt = updatedAt
    self.status = status
    self.progress = progress
    self.transcription = transcription
    self.chunks = chunks
  }
}

class AIService: NSObject, ObservableObject, AIServiceProvider {
  static let shared = AIService()

  @Published var isRecording = false
  @Published var hasRecording = false
  @Published var isTranscribing = false
  @Published var transcription = ""
  @Published var error: String? = nil
  @Published var isPlaying = false

  var audioFileURL: URL? { _audioFileURL }

  private var audioRecorder: AVAudioRecorder?
  private var audioPlayer: AVAudioPlayer?
  private var whisperWrapper: WhisperCppWrapper?
  private var _audioFileURL: URL?
  private var modelURL: URL?
  private var coreMLURL: URL?
  private var useCoreML: Bool = false

  // For integration with the existing code
  private var pendingRequest: DataRequest?
  private var transcriptionTimer: Timer?
  private var whisperModelsDirectory: URL {
    let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[
      0]
    let directory = documentsDirectory.appendingPathComponent("WhisperModels", isDirectory: true)

    // Create directory if it doesn't exist
    if !FileManager.default.fileExists(atPath: directory.path) {
      try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    return directory
  }

  // For integration with the existing code
  private let defaultModelURL = URL(
    string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin")!
  private let defaultModelName = "ggml-tiny.en.bin"
  private let defaultCoreMLModelURL = URL(
    string:
      "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-encoder.mlmodelc.zip")!
  private let defaultCoreMLModelName = "ggml-tiny.en-encoder.mlmodelc"

  // Model URLs for different sizes
  private let modelURLs: [String: (ggml: URL, coreml: URL, name: String)] = [
    "tiny": (
      ggml: URL(
        string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin")!,
      coreml: URL(
        string:
          "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en-encoder.mlmodelc.zip"
      )!,
      name: "ggml-tiny.en.bin"
    ),
    "base": (
      ggml: URL(
        string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin")!,
      coreml: URL(
        string:
          "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-encoder.mlmodelc.zip"
      )!,
      name: "ggml-base.en.bin"
    ),
    "small": (
      ggml: URL(
        string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin")!,
      coreml: URL(
        string:
          "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en-encoder.mlmodelc.zip"
      )!,
      name: "ggml-small.en.bin"
    ),
    "medium": (
      ggml: URL(
        string: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en.bin")!,
      coreml: URL(
        string:
          "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.en-encoder.mlmodelc.zip"
      )!,
      name: "ggml-medium.en.bin"
    ),
  ]

  override init() {
    super.init()
    setupModelURLs()

    // Check for incomplete transcriptions when service initializes
    DispatchQueue.global(qos: .background).async { [weak self] in
      self?.checkForIncompleteTranscriptions()
    }
  }

  private func setupModelURLs() {
    // Get document directory
    let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[
      0]
    let whisperDirectory = documentsDirectory.appendingPathComponent(
      "WhisperModels", isDirectory: true)

    // Create directory if it doesn't exist
    try? FileManager.default.createDirectory(
      at: whisperDirectory, withIntermediateDirectories: true)

    // Set up model paths - using tiny.en model for faster results
    modelURL = whisperDirectory.appendingPathComponent("ggml-tiny.en.bin")

    // Disable CoreML for now as it's not properly supported
    useCoreML = false
    coreMLURL = nil

    // Check if we need to download the model
    downloadModelIfNeeded()
  }

  public func downloadModelIfNeeded() {
    guard let modelURL = modelURL else { return }

    // Only download if the model doesn't exist
    if !FileManager.default.fileExists(atPath: modelURL.path) {
      // Actually download the model instead of just showing an error
      print("Model doesn't exist at \(modelURL.path). Downloading it now...")

      // Update UI to show downloading status
      error = "Downloading Whisper model. Please wait..."

      // Use DownloadManager to download the model
      DownloadManager.shared.downloadFile(from: defaultModelURL) { [weak self] result in
        guard let self = self else { return }

        DispatchQueue.main.async {
          switch result {
          case .success(let downloadedURL):
            do {
              // If model file already exists at the destination, remove it
              if FileManager.default.fileExists(atPath: self.modelURL!.path) {
                try FileManager.default.removeItem(at: self.modelURL!)
              }

              // Copy the downloaded model to our model location
              try FileManager.default.copyItem(at: downloadedURL, to: self.modelURL!)

              // Clear error message
              self.error = nil
              print("Whisper model downloaded successfully to: \(self.modelURL!.path)")
            } catch {
              self.error = "Failed to save Whisper model: \(error.localizedDescription)"
              print("Failed to save Whisper model: \(error.localizedDescription)")
            }
          case .failure(let error):
            self.error = "Failed to download Whisper model: \(error.localizedDescription)"
            print("Failed to download Whisper model: \(error.localizedDescription)")
          }
        }
      }
    }

    // We don't download CoreML models as they're not supported in the current implementation
  }

  func startRecording() {
    #if os(iOS)
      let audioSession = AVAudioSession.sharedInstance()

      do {
        try audioSession.setCategory(
          .playAndRecord, mode: .measurement,
          options: [.allowBluetooth, .defaultToSpeaker, .mixWithOthers])
        try audioSession.setActive(true)
      } catch {
        self.error = "Audio session setup failed: \(error.localizedDescription)"
        print("Audio session setup failed: \(error)")
        return
      }
    #endif

    do {

      // Set up audio recorder settings for Whisper compatibility
      let settings: [String: Any] = [
        AVFormatIDKey: Int(kAudioFormatLinearPCM),
        AVSampleRateKey: 16000.0,
        AVNumberOfChannelsKey: 1,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsNonInterleaved: false,
        AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
      ]

      // Create audio file URL in temporary directory
      let tempDir = FileManager.default.temporaryDirectory
      _audioFileURL = tempDir.appendingPathComponent("recording.wav")

      // Remove existing recording if any
      if let url = _audioFileURL, FileManager.default.fileExists(atPath: url.path) {
        try FileManager.default.removeItem(at: url)
      }

      // Initialize audio recorder
      guard let url = _audioFileURL else {
        error = "Failed to create audio file URL"
        return
      }

      audioRecorder = try AVAudioRecorder(url: url, settings: settings)
      audioRecorder?.delegate = self

      // Prepare recorder and ensure we can record
      guard let recorder = audioRecorder, recorder.prepareToRecord() else {
        error = "Failed to prepare audio recorder"
        return
      }

      // Start recording
      guard recorder.record() else {
        error = "Failed to start recording"
        return
      }

      isRecording = true
      hasRecording = false
      transcription = ""
      error = nil

    } catch {
      self.error = "Recording setup failed: \(error.localizedDescription)"
      print("Recording setup failed: \(error)")
    }
  }

  func stopRecording() {
    audioRecorder?.stop()

    // Verify the recording length
    if let url = _audioFileURL,
      let audioFile = try? AVAudioFile(forReading: url)
    {
      let duration = Double(audioFile.length) / audioFile.processingFormat.sampleRate
      print("Recording stopped. Duration: \(duration * 1000)ms, Samples: \(audioFile.length)")

      if duration < 0.1 {
        error = "Recording too short (< 100ms). Please record for longer."
        hasRecording = false
        return
      }
    }

    isRecording = false
    hasRecording = true
  }

  func playRecordedAudio() {
    guard let audioFileURL = _audioFileURL,
      FileManager.default.fileExists(atPath: audioFileURL.path)
    else {
      error = "No recording to play"
      return
    }

    do {
      // Configure audio session for playback
      #if os(iOS)
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .default)
      #endif

      // Initialize player
      audioPlayer = try AVAudioPlayer(contentsOf: audioFileURL)
      audioPlayer?.delegate = self
      audioPlayer?.prepareToPlay()

      // Start playback
      if audioPlayer?.play() == true {
        isPlaying = true
      } else {
        error = "Failed to play audio"
      }
    } catch {
      self.error = "Playback failed: \(error.localizedDescription)"
    }
  }

  func stopPlayback() {
    audioPlayer?.stop()
    isPlaying = false
  }

  func transcribeAudio() {
    guard let audioFileURL = _audioFileURL,
      FileManager.default.fileExists(atPath: audioFileURL.path)
    else {
      error = "No recording to transcribe"
      return
    }

    // Create a variable to store the file URL that can be modified
    var fileURLToTranscribe = audioFileURL

    // Check if the audio file is valid and meets the minimum length requirement
    do {
      let audioFile = try AVAudioFile(forReading: audioFileURL)
      let audioLength = Double(audioFile.length) / audioFile.processingFormat.sampleRate * 1000  // in milliseconds

      // If the audio is too short, we need to pad it
      if audioLength < 100 {
        // Create a padded version of the audio
        let paddedAudioURL = try padAudioToMinLength(audioFileURL)
        // Use the padded audio instead
        fileURLToTranscribe = paddedAudioURL
      }
    } catch {
      self.error = "Failed to process audio file: \(error.localizedDescription)"
      return
    }

    // Initialize whisper if needed
    if whisperWrapper == nil {
      guard let modelURL = modelURL else {
        error = "Whisper model configuration issue"
        return
      }

      if !FileManager.default.fileExists(atPath: modelURL.path) {
        // Start model download if not already in progress
        if error == nil || !error!.contains("Downloading") {
          downloadModelIfNeeded()
        }
        // Don't proceed with transcription
        error = "Whisper model not found. Downloading it now..."
        return
      }

      initializeWhisper(modelURL: modelURL)
    }

    guard whisperWrapper != nil else {
      error = "Failed to initialize whisper"
      return
    }

    // Set transcribing state
    isTranscribing = true
    // Clear any previous error
    error = nil

    // Perform transcription in background
    DispatchQueue.global(qos: .userInitiated).async { [weak self, fileURLToTranscribe] in
      guard let self = self else { return }

      do {
        let result = try self.whisperWrapper?.transcribeAudio(atPath: fileURLToTranscribe.path)

        DispatchQueue.main.async {
          self.isTranscribing = false

          if let result = result, !result.isEmpty {
            self.transcription = result
          } else {
            self.error = "Transcription failed with unknown error"
          }
        }
      } catch {
        DispatchQueue.main.async {
          self.isTranscribing = false
          let nsError = error as NSError
            // Check if it's a CoreML error
          if nsError.localizedDescription.contains("Core ML model") && self.useCoreML {
              // Reset the wrapper to force re-initialization
              self.whisperWrapper = nil
              // Turn off CoreML for next attempt
              self.useCoreML = false
              // Try again without CoreML
              self.error = "CoreML error, retrying with standard model..."
              self.transcribeAudio()
            } else {
            self.error = "Transcription failed: \(nsError.localizedDescription)"

              // If we get the bit depth error, try to diagnose the audio file
            if nsError.localizedDescription.contains("bit depth")
              || nsError.localizedDescription.contains("input is too short")
              {
                self.diagnoseAudioFile(fileURLToTranscribe)
              }
            }
        }
      }
    }
  }

  private func initializeWhisper(modelURL: URL) {
    // Try to use CoreML if available, but fall back to regular model if not
    if useCoreML, let coreMLURL = coreMLURL,
      FileManager.default.fileExists(atPath: coreMLURL.path)
    {
      whisperWrapper = WhisperCppWrapper(
        modelPath: modelURL.path, coreMLModelPath: coreMLURL.path)

      // If initialization failed and we tried to use CoreML, retry without it
      if whisperWrapper == nil {
        print("CoreML initialization failed, falling back to standard model")
        useCoreML = false
        whisperWrapper = WhisperCppWrapper(modelPath: modelURL.path)
      }
    } else {
      // If CoreML is not available, just use the regular model
      whisperWrapper = WhisperCppWrapper(modelPath: modelURL.path)
      // Only show CoreML warning if we were expecting to use it
      if useCoreML {
        print("CoreML model not found, using standard Whisper model instead")
        useCoreML = false
      }
    }
  }

  private func diagnoseAudioFile(_ url: URL) {
    do {
      // Get the audio file attributes to help diagnose issues
      let audioFileAttributes = try AVAudioFile(forReading: url)
      let format = audioFileAttributes.fileFormat
      let sampleRate = format.sampleRate
      let channelCount = format.channelCount
      let formatDescription = format.description

      // Get detailed format information
      var formatInfo = "Format: \(formatDescription)"

      // Examine the PCM format if available
      let streamDescription = format.streamDescription
      let formatID = streamDescription.pointee.mFormatID
      let formatIDString = self.formatIDToString(formatID)
      let bitDepth = streamDescription.pointee.mBitsPerChannel
      let bytesPerPacket = streamDescription.pointee.mBytesPerPacket
      let framesPerPacket = streamDescription.pointee.mFramesPerPacket
      let bytesPerFrame = streamDescription.pointee.mBytesPerFrame

      formatInfo += """
          \nFormat ID: \(formatIDString) 
          \nBit Depth: \(bitDepth) 
          \nBytes Per Packet: \(bytesPerPacket) 
          \nFrames Per Packet: \(framesPerPacket) 
          \nBytes Per Frame: \(bytesPerFrame)
        """

      // Try to read the WAV header directly to check for issues
      if let fileData = try? Data(contentsOf: url, options: .mappedIfSafe) {
        let bytes = [UInt8](fileData.prefix(44))  // Read first 44 bytes (WAV header)

        if bytes.count >= 44 {
          let riffHeader = String(bytes: bytes[0..<4], encoding: .ascii) ?? "?"
          let chunkSize =
            bytes[4] | (UInt8(bytes[5]) << 8) | (UInt8(bytes[6]) << 16) | (UInt8(bytes[7]) << 24)
          let format = String(bytes: bytes[8..<12], encoding: .ascii) ?? "?"
          let formatChunk = String(bytes: bytes[12..<16], encoding: .ascii) ?? "?"
          let audioFormat = bytes[20] | (UInt8(bytes[21]) << 8)
          let numChannels = bytes[22] | (UInt8(bytes[23]) << 8)
          let sampleRateHeader =
            bytes[24] | (UInt8(bytes[25]) << 8) | (UInt8(bytes[26]) << 16)
            | (UInt8(bytes[27]) << 24)
          let bitsPerSample = bytes[34] | (UInt8(bytes[35]) << 8)

          formatInfo += """
              \n\nWAV Header Analysis:
              \nRIFF Header: \(riffHeader)
              \nChunk Size: \(chunkSize)
              \nFormat: \(format)
              \nFormat Chunk: \(formatChunk)
              \nAudio Format: \(audioFormat) (1=PCM)
              \nNumber of Channels: \(numChannels)
              \nSample Rate: \(sampleRateHeader)
              \nBits Per Sample: \(bitsPerSample)
            """
        }
      }

      // Format a diagnostic message
      let diagnosticMessage = """
        Audio file diagnostics:
        - Sample rate: \(sampleRate)
        - Channels: \(channelCount)
        - \(formatInfo)
        """

      print(diagnosticMessage)

      // Update the error with diagnostic info
      self.error =
        "Audio format issue. Try restarting the app and recording again. \(self.error ?? "")"
    } catch {
      print("Failed to diagnose audio file: \(error)")
    }
  }

  // Helper function to convert format ID to readable string
  private func formatIDToString(_ formatID: UInt32) -> String {
    let formatIDBytes = [
      UInt8(formatID >> 24 & 0xff),
      UInt8(formatID >> 16 & 0xff),
      UInt8(formatID >> 8 & 0xff),
      UInt8(formatID & 0xff),
    ]

    if let string = String(bytes: formatIDBytes, encoding: .ascii) {
      return string
    } else {
      return String(format: "0x%08x", formatID)
    }
  }

  func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
    if let error = error {
      self.error = "Recording error: \(error.localizedDescription)"
    }
  }

  // MARK: - URL-based Transcription

  func transcribeAudio(request: DataRequest, completion: @escaping (Result<String, Error>) -> Void)
  {
    // Store the request for later use
    self.pendingRequest = request

    // Check if we're already transcribing
    guard !isTranscribing else {
      completion(
        .failure(
          NSError(
            domain: "AIService", code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Already transcribing audio"])))
      return
    }

    // Set timeout (2 minutes for large files)
    transcriptionTimer = Timer.scheduledTimer(
      timeInterval: 120.0,
      target: self,
      selector: #selector(handleTranscriptionTimeout),
      userInfo: nil,
      repeats: false
    )

    isTranscribing = true

    // Parse URL from request body
    guard let urlValue = request.body["url"]?.value as? String,
      let audioURL = URL(string: urlValue)
    else {
      isTranscribing = false
      transcriptionTimer?.invalidate()
      completion(
        .failure(
          NSError(
            domain: "AIService", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid audio URL"]
          )))
      return
    }

    Log.info("Starting transcription for audio at URL: \(audioURL)")

    // Get model type from request, default to "tiny"
    let modelType = request.body["model"]?.value as? String ?? "tiny"

    // Ensure we have the model for the specified type
    ensureWhisperModel(modelType: modelType) { [weak self] modelResult in
      guard let self = self else { return }

      switch modelResult {
      case .success((let baseModelPath, let coreMLModelPath)):
        // Now download the audio file
        self.downloadAudio(from: audioURL) { audioResult in
          switch audioResult {
          case .success(let audioFilePath):
            // Choose transcription method based on file type
            let fileExtension = audioFilePath.pathExtension.lowercased()

            // Use simple transcription like AudioTranscriptionView (no chunking)
            Log.info(
              "Using simple transcription like AudioTranscriptionView for: \(audioFilePath.path)")
            self.performSimpleTranscription(
              audioPath: audioFilePath,
              baseModelPath: baseModelPath,
              completion: completion)
          case .failure(let error):
            self.isTranscribing = false
            self.transcriptionTimer?.invalidate()
            completion(.failure(error))
          }
        }
      case .failure(let error):
        self.isTranscribing = false
        self.transcriptionTimer?.invalidate()
        completion(.failure(error))
      }
    }
  }

  private func getModelURLs(for modelType: String) -> (ggml: URL, coreml: URL, name: String) {
    return modelURLs[modelType] ?? modelURLs["tiny"]!
  }

  private func ensureWhisperModel(
    modelType: String = "tiny",
    completion: @escaping (Result<(URL, URL?), Error>) -> Void
  ) {
    let modelInfo = getModelURLs(for: modelType)
    let localModelPath = whisperModelsDirectory.appendingPathComponent(modelInfo.name)
    let localCoreMLPath = whisperModelsDirectory.appendingPathComponent(
      modelInfo.name.replacingOccurrences(of: ".bin", with: "-encoder.mlmodelc"))

    // Check if model files exist
    let modelExists = FileManager.default.fileExists(atPath: localModelPath.path)
    let coreMLExists = FileManager.default.fileExists(atPath: localCoreMLPath.path)

    if modelExists {
      // Model exists, return paths
      let coreMLPath = coreMLExists ? localCoreMLPath : nil
      completion(.success((localModelPath, coreMLPath)))
      return
    }

    // Model doesn't exist, download it
    Log.info("Downloading Whisper model: \(modelType)")
    downloadModel(from: modelInfo.ggml, to: localModelPath) { [weak self] result in
      switch result {
      case .success:
        Log.info("Successfully downloaded Whisper model")
        // Try to download CoreML model (optional)
        if !coreMLExists {
          self?.downloadModel(from: modelInfo.coreml, to: localCoreMLPath) { coreMLResult in
            // CoreML download is optional, proceed regardless
            let finalCoreMLPath = coreMLResult.isSuccess ? localCoreMLPath : nil
            completion(.success((localModelPath, finalCoreMLPath)))
          }
        } else {
          completion(.success((localModelPath, localCoreMLPath)))
        }
      case .failure(let error):
        Log.error(message: "Failed to download Whisper model: \(error.localizedDescription)")
        completion(.failure(error))
      }
    }
  }

  func cancelTranscription() {
    // Cancel any active download task
    if let urlValue = pendingRequest?.body["url"]?.value as? String,
      let audioURL = URL(string: urlValue)
    {
      DownloadManager.shared.cancelDownload(for: audioURL)
    }

    // Cancel the timer
    transcriptionTimer?.invalidate()
    isTranscribing = false

    // If there is a pending request, mark it as canceled in persistent storage
    if let req = pendingRequest,
      let task = getCurrentTranscriptionTask()
    {
      var updatedTask = task
      updatedTask.status = .failed
      updatedTask.updatedAt = Date()
      saveTranscriptionTask(updatedTask)

      // Notify the app that the transcription was canceled
      let appStore = AppStore.shared
      appStore.sendMessageToApp(message: [
        "id": req.id,
        "type": IncomingMessage.TRANSCRIBE_AUDIO,
        "data": ["error": "Transcription canceled by user"],
      ])
    }

    pendingRequest = nil
  }

  // MARK: - AIService Transcription Methods

  @objc func handleTranscriptionTimeout() {
    Log.error(message: "Transcription request timed out")

    // Cancel ongoing tasks
    isTranscribing = false

    // Notify about the timeout if there's a pending request
    if let req = pendingRequest {
      let appStore = AppStore.shared
      appStore.sendMessageToApp(message: [
        "id": req.id,
        "type": IncomingMessage.TRANSCRIBE_AUDIO,
        "data": ["error": "Transcription request timed out"],
      ])

      pendingRequest = nil
    }
  }

  // Helper to get the current transcription task
  private func getCurrentTranscriptionTask() -> TranscriptionTask? {
    guard let req = pendingRequest else {
      return nil
    }

    // Get all transcription tasks
    let tasksDirectory = getTasksDirectory()
    guard let fileNames = try? FileManager.default.contentsOfDirectory(atPath: tasksDirectory.path)
    else {
      return nil
    }

    // Find the task matching the current request
    for fileName in fileNames {
      if fileName.hasSuffix(".json") {
        let taskPath = tasksDirectory.appendingPathComponent(fileName)
        do {
          let data = try Data(contentsOf: taskPath)
          let decoder = JSONDecoder()
          let task = try decoder.decode(TranscriptionTask.self, from: data)

          if task.requestId == req.id {
            return task
          }
        } catch {
          Log.error(message: "Error reading task file: \(error.localizedDescription)")
        }
      }
    }

    return nil
  }

  // MARK: - Transcription Recovery

  func checkForIncompleteTranscriptions() {
    // Get all transcription tasks
    let tasksDirectory = getTasksDirectory()
    guard let fileNames = try? FileManager.default.contentsOfDirectory(atPath: tasksDirectory.path)
    else {
      return
    }

    var incompleteTasks: [TranscriptionTask] = []

    // Find incomplete tasks
    for fileName in fileNames {
      if fileName.hasSuffix(".json") {
        let taskPath = tasksDirectory.appendingPathComponent(fileName)
        do {
          let data = try Data(contentsOf: taskPath)
          let decoder = JSONDecoder()
          let task = try decoder.decode(TranscriptionTask.self, from: data)

          // Check if task is in progress (downloading or processing)
          if task.status == .downloading || task.status == .processing {
            incompleteTasks.append(task)
          }
        } catch {
          Log.error(message: "Error reading task file: \(error.localizedDescription)")
        }
      }
    }

    // Sort by most recent first
    incompleteTasks.sort { $0.updatedAt > $1.updatedAt }

    // Log the incomplete tasks
    if !incompleteTasks.isEmpty {
      Log.info("Found \(incompleteTasks.count) incomplete transcription tasks")

      // For now, just mark them as failed
      // In a more advanced implementation, we could resume them automatically
      for var task in incompleteTasks {
        task.status = .failed
        task.updatedAt = Date()
        saveTranscriptionTask(task)
      }
    }
  }

  // Method to resume a specific transcription
  func resumeTranscription(taskId: String, completion: @escaping (Result<String, Error>) -> Void) {
    // Check if we're already transcribing
    guard !isTranscribing else {
      completion(
        .failure(
          NSError(
            domain: "AIService", code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Already transcribing audio"])))
      return
    }

    // Load the task
    guard let task = loadTranscriptionTask(id: taskId) else {
      completion(
        .failure(
          NSError(
            domain: "AIService", code: 5,
            userInfo: [NSLocalizedDescriptionKey: "Could not find transcription task"])))
      return
    }

    // Create a new request from the stored task
    let request = DataRequest(
      id: UUID().uuidString,
      type: IncomingMessage.TRANSCRIBE_AUDIO,
      body: ["url": AnyCodable(task.audioURL)]
    )

    // Store the request
    self.pendingRequest = request

    // Set timeout
    transcriptionTimer = Timer.scheduledTimer(
      timeInterval: 120.0,
      target: self,
      selector: #selector(handleTranscriptionTimeout),
      userInfo: nil,
      repeats: false
    )

    isTranscribing = true

    // Check if we already have the audio file
    if let audioFilePath = task.audioFilePath, FileManager.default.fileExists(atPath: audioFilePath)
    {
      // We have the audio file, continue with transcription
      let audioFileURL = URL(fileURLWithPath: audioFilePath)
      let baseModelPath = URL(fileURLWithPath: task.modelPath)

      // Continue transcription with optimized method for MP3
      // Use simple transcription like AudioTranscriptionView (no chunking)
      Log.info(
        "Resuming with simple transcription like AudioTranscriptionView for: \(audioFileURL.path)")
      performSimpleTranscription(
        audioPath: audioFileURL,
        baseModelPath: baseModelPath,
        completion: completion)
    } else {
      // Need to re-download the audio
      let audioURL = URL(string: task.audioURL)!

      // Get model type from stored task (default to "tiny" if not specified)
      let modelType = "tiny"  // Default for older tasks

      // Ensure we have the model
      ensureWhisperModel(modelType: modelType) { [weak self] modelResult in
        guard let self = self else { return }

        switch modelResult {
        case .success((let baseModelPath, let coreMLModelPath)):
          // Download the audio file
          self.downloadAudio(from: audioURL) { audioResult in
            switch audioResult {
            case .success(let audioFilePath):
              // Use simple transcription like AudioTranscriptionView (no chunking)
              Log.info(
                "Resuming with simple transcription like AudioTranscriptionView for: \(audioFilePath.path)"
              )
              self.performSimpleTranscription(
                audioPath: audioFilePath,
                baseModelPath: baseModelPath,
                completion: completion)
            case .failure(let error):
              self.isTranscribing = false
              self.transcriptionTimer?.invalidate()
              completion(.failure(error))
            }
          }
        case .failure(let error):
          self.isTranscribing = false
          self.transcriptionTimer?.invalidate()
          completion(.failure(error))
        }
      }
    }
  }

  // Add the loadTranscriptionTask method
  func loadTranscriptionTask(id: String) -> TranscriptionTask? {
    let tasksDirectory = getTasksDirectory()
    let taskPath = tasksDirectory.appendingPathComponent("\(id).json")

    guard FileManager.default.fileExists(atPath: taskPath.path) else {
      return nil
    }

    do {
      let data = try Data(contentsOf: taskPath)
      let decoder = JSONDecoder()
      let task = try decoder.decode(TranscriptionTask.self, from: data)
      return task
    } catch {
      Log.error(message: "Failed to load transcription task: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Model Download Methods

  func isModelDownloaded(modelType: String) -> Bool {
    let modelInfo = getModelURLs(for: modelType)
    let localModelPath = whisperModelsDirectory.appendingPathComponent(modelInfo.name)
    return FileManager.default.fileExists(atPath: localModelPath.path)
  }

  func downloadModel(
    modelType: String,
    progressCallback: @escaping (Double) -> Void,
    completion: @escaping (Result<Void, Error>) -> Void
  ) {
    let modelInfo = getModelURLs(for: modelType)
    let localModelPath = whisperModelsDirectory.appendingPathComponent(modelInfo.name)

    // Check if model already exists
    if FileManager.default.fileExists(atPath: localModelPath.path) {
      progressCallback(1.0)
      completion(.success(()))
      return
    }

    Log.info("Starting download of model: \(modelType)")

    // Use URLSession with progress tracking
    let downloadTask = URLSession.shared.downloadTask(with: modelInfo.ggml) {
      (tempURL, response, error) in
      if let error = error {
        Log.error(message: "Failed to download model: \(error.localizedDescription)")
        completion(.failure(error))
        return
      }

      guard let tempURL = tempURL else {
        let error = NSError(
          domain: "AIService", code: 4,
          userInfo: [NSLocalizedDescriptionKey: "No data received when downloading model"]
        )
        Log.error(message: "No data received when downloading model")
        completion(.failure(error))
        return
      }

      do {
        // Remove existing file if it exists
        if FileManager.default.fileExists(atPath: localModelPath.path) {
          try FileManager.default.removeItem(at: localModelPath)
        }

        // Move downloaded file to destination
        try FileManager.default.moveItem(at: tempURL, to: localModelPath)
        Log.info("Model downloaded successfully to: \(localModelPath.path)")

        DispatchQueue.main.async {
          progressCallback(1.0)
          completion(.success(()))
        }
      } catch {
        Log.error(message: "Failed to save model: \(error.localizedDescription)")
        DispatchQueue.main.async {
          completion(.failure(error))
        }
      }
    }

    // Observe progress
    let observation = downloadTask.progress.observe(\.fractionCompleted) { progress, _ in
      DispatchQueue.main.async {
        progressCallback(progress.fractionCompleted)
      }
    }

    // Store observation to prevent deallocation
    objc_setAssociatedObject(
      downloadTask, "progressObservation", observation, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

    downloadTask.resume()
  }
}

// MARK: - WhisperWrapper Class
class WhisperWrapper {
  private let modelPath: URL
  private let coreMLModelPath: URL?
  private var whisperContext: WhisperCppWrapper?
  private var isUsingCoreML: Bool = false

  init(modelPath: URL, coreMLModelPath: URL? = nil) {
    self.modelPath = modelPath
    self.coreMLModelPath = coreMLModelPath

    // Initialize without CoreML as it's not supported in the current implementation
    self.whisperContext = WhisperCppWrapper(modelPath: modelPath.path)

    if whisperContext == nil {
      Log.error(message: "Failed to initialize WhisperCppWrapper with model at: \(modelPath.path)")
    } else {
      Log.info("Successfully initialized WhisperCppWrapper (standard mode)")
    }
  }

  func transcribe(audioURL: URL) throws -> String {
    guard let whisperContext = whisperContext else {
      throw NSError(
        domain: "WhisperWrapper", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Whisper context not initialized"])
    }

    do {
      let result = try whisperContext.transcribeAudio(atPath: audioURL.path)
      return result
    } catch {
      Log.error(message: "Whisper transcription failed: \(error.localizedDescription)")
      throw error
    }
  }

  func isUsingCoreMLAcceleration() -> Bool {
    return isUsingCoreML
  }
}

// NOTE: To implement the actual whisper.cpp integration:
// 1. Add the whisper.xcframework to the project
// 2. Create Objective-C++ bridging headers
// 3. Implement the C++ bindings to call whisper.cpp functions
// 4. Replace the WhisperWrapper with actual implementation

// MARK: - DownloadManager

class DownloadManager {
  static let shared = DownloadManager()

  private var downloadTasks: [URL: URLSessionDownloadTask] = [:]
  private var resumeData: [URL: Data] = [:]
  private var completionHandlers: [URL: (Result<URL, Error>) -> Void] = [:]

  private init() {}

  func downloadFile(from url: URL, completion: @escaping (Result<URL, Error>) -> Void) {
    // If we already have a task for this URL, cancel it
    if let existingTask = downloadTasks[url] {
      existingTask.cancel()
    }

    // Check if we have cached file
    if let cachedFile = getCachedFile(for: url) {
      Log.info("Using cached file for \(url.lastPathComponent)")
      completion(.success(cachedFile))
      return
    }

    // Create a new download task
    let task = URLSession.shared.downloadTask(with: url) { [weak self] (tempURL, response, error) in
      guard let self = self else { return }

      self.downloadTasks[url] = nil

      if let error = error {
        // Check if we have resume data
        if let resumeData = (error as NSError).userInfo[NSURLSessionDownloadTaskResumeData] as? Data
        {
          self.resumeData[url] = resumeData
          // Create a new download task with resume data
          self.resumeDownload(for: url)
        } else {
          Log.error(message: "Download error: \(error.localizedDescription)")
          completion(.failure(error))
        }
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
        (200...299).contains(httpResponse.statusCode)
      else {
        let error = NSError(
          domain: "AIService", code: (response as? HTTPURLResponse)?.statusCode ?? 0,
          userInfo: [NSLocalizedDescriptionKey: "Server error"]
        )
        Log.error(message: "Server error")
        completion(.failure(error))
        return
      }

      guard let tempURL = tempURL else {
        let error = NSError(
          domain: "AIService", code: 4,
          userInfo: [NSLocalizedDescriptionKey: "No data received"]
        )
        Log.error(message: "No data received")
        completion(.failure(error))
        return
      }

      do {
        // Get appropriate file extension
        let fileExtension =
          url.pathExtension.isEmpty ? self.getFileExtension(from: response) : url.pathExtension

        // Create a unique file name
        let fileName = "\(url.hashValue)_\(url.lastPathComponent)"

        // Get the directory for this file type
        let fileURL = self.getFileDirectory(for: fileExtension).appendingPathComponent(fileName)

        // Remove existing file if necessary
        if FileManager.default.fileExists(atPath: fileURL.path) {
          try FileManager.default.removeItem(at: fileURL)
        }

        // Move the file from temp location to our directory
        try FileManager.default.moveItem(at: tempURL, to: fileURL)
        Log.info("File downloaded successfully to: \(fileURL.path)")

        // Clear resume data for this URL
        self.resumeData[url] = nil

        completion(.success(fileURL))
      } catch {
        Log.error(message: "Failed to save downloaded file: \(error.localizedDescription)")
        completion(.failure(error))
      }
    }

    downloadTasks[url] = task
    completionHandlers[url] = completion
    task.resume()
  }

  func cancelDownload(for url: URL) {
    if let task = downloadTasks[url] {
      task.cancel()
      downloadTasks[url] = nil
      completionHandlers[url] = nil
    }
  }

  func resumeDownload(for url: URL) {
    guard let resumeData = resumeData[url],
      let completion = completionHandlers[url]
    else {
      return
    }

    let task = URLSession.shared.downloadTask(withResumeData: resumeData) {
      [weak self] (tempURL, response, error) in
      guard let self = self else { return }

      self.downloadTasks[url] = nil

      if let error = error {
        if let resumeData = (error as NSError).userInfo[NSURLSessionDownloadTaskResumeData] as? Data
        {
          self.resumeData[url] = resumeData
          // Try again later
        } else {
          Log.error(message: "Download error: \(error.localizedDescription)")
          completion(.failure(error))
          self.completionHandlers[url] = nil
        }
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
        (200...299).contains(httpResponse.statusCode)
      else {
        let error = NSError(
          domain: "AIService", code: (response as? HTTPURLResponse)?.statusCode ?? 0,
          userInfo: [NSLocalizedDescriptionKey: "Server error"]
        )
        Log.error(message: "Server error")
        completion(.failure(error))
        self.completionHandlers[url] = nil
        return
      }

      // Process successful download - same as in downloadFile
      guard let tempURL = tempURL else {
        let error = NSError(
          domain: "AIService", code: 4,
          userInfo: [NSLocalizedDescriptionKey: "No data received"]
        )
        Log.error(message: "No data received")
        completion(.failure(error))
        self.completionHandlers[url] = nil
        return
      }

      do {
        // Get appropriate file extension
        let fileExtension =
          url.pathExtension.isEmpty ? self.getFileExtension(from: response) : url.pathExtension

        // Create a unique file name
        let fileName = "\(url.hashValue)_\(url.lastPathComponent)"

        // Get the directory for this file type
        let fileURL = self.getFileDirectory(for: fileExtension).appendingPathComponent(fileName)

        // Remove existing file if necessary
        if FileManager.default.fileExists(atPath: fileURL.path) {
          try FileManager.default.removeItem(at: fileURL)
        }

        // Move the file from temp location to our directory
        try FileManager.default.moveItem(at: tempURL, to: fileURL)
        Log.info("File downloaded successfully to: \(fileURL.path)")

        // Clear resume data for this URL
        self.resumeData[url] = nil

        completion(.success(fileURL))
        self.completionHandlers[url] = nil
      } catch {
        Log.error(message: "Failed to save downloaded file: \(error.localizedDescription)")
        completion(.failure(error))
        self.completionHandlers[url] = nil
      }
    }

    downloadTasks[url] = task
    task.resume()
  }

  // MARK: - Helper methods

  private func getCachedFile(for url: URL) -> URL? {
    let fileName = "\(url.hashValue)_\(url.lastPathComponent)"
    let fileExtension = url.pathExtension
    let fileURL = getFileDirectory(for: fileExtension).appendingPathComponent(fileName)

    if FileManager.default.fileExists(atPath: fileURL.path) {
      // Check if file is recent (less than 1 day old)
      if let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
        let creationDate = attributes[.creationDate] as? Date,
        Date().timeIntervalSince(creationDate) < 86400
      {  // 24 hours
        return fileURL
      }
    }

    return nil
  }

  private func getFileDirectory(for fileType: String) -> URL {
    let documentsDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]

    var directoryName: String

    switch fileType.lowercased() {
    case "mp3", "wav", "m4a", "aac":
      directoryName = "AudioFiles"
    case "jpg", "jpeg", "png", "gif", "heic":
      directoryName = "ImageFiles"
    case "pdf":
      directoryName = "PDFFiles"
    default:
      directoryName = "OtherFiles"
    }

    let directory = documentsDirectory.appendingPathComponent(directoryName, isDirectory: true)

    // Create directory if it doesn't exist
    if !FileManager.default.fileExists(atPath: directory.path) {
      try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    return directory
  }

  private func getFileExtension(from response: URLResponse?) -> String {
    guard let mimeType = response?.mimeType else {
      return "bin"
    }

    switch mimeType {
    case "audio/mpeg":
      return "mp3"
    case "audio/wav", "audio/x-wav":
      return "wav"
    case "audio/m4a", "audio/x-m4a":
      return "m4a"
    case "audio/aac":
      return "aac"
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/gif":
      return "gif"
    case "image/heic":
      return "heic"
    case "application/pdf":
      return "pdf"
    default:
      return "bin"
    }
  }
}

// MARK: - Additional Properties and Methods

// For URL-based transcription
private var transcriptionTask: URLSessionTask?

// MARK: - AIService Extensions

extension AIService: AVAudioRecorderDelegate {
  func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
    if !flag {
      error = "Recording failed to complete successfully"
      hasRecording = false
    }
  }
}

extension AIService: AVAudioPlayerDelegate {
  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    DispatchQueue.main.async {
      self.isPlaying = false
    }
  }

  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    if let error = error {
      self.error = "Playback error: \(error.localizedDescription)"
    }
    DispatchQueue.main.async {
      self.isPlaying = false
    }
  }
}

extension AIService {
  // MARK: - Helper Methods

  // Add downloadAudio method
  func downloadAudio(from url: URL, completion: @escaping (Result<URL, Error>) -> Void) {
    Log.info("Downloading audio from: \(url)")

    // Use the DownloadManager for all file downloads
    DownloadManager.shared.downloadFile(from: url) { result in
      switch result {
      case .success(let fileURL):
        // Validate the downloaded file before returning
        do {
          try self.validateDownloadedAudioFile(fileURL)
          Log.info("Downloaded audio file validated successfully: \(fileURL.path)")
          completion(.success(fileURL))
        } catch {
          Log.error(
            message: "Downloaded audio file validation failed: \(error.localizedDescription)")
          completion(.failure(error))
        }
      case .failure(let error):
        completion(.failure(error))
      }
    }
  }

  private func validateDownloadedAudioFile(_ fileURL: URL) throws {
    // Check if file exists
    guard FileManager.default.fileExists(atPath: fileURL.path) else {
      throw NSError(
        domain: "AIService", code: 2001,
        userInfo: [NSLocalizedDescriptionKey: "Downloaded audio file does not exist"])
    }

    // Check file size
    let fileAttributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
    let fileSize = fileAttributes[.size] as? Int64 ?? 0

    if fileSize == 0 {
      throw NSError(
        domain: "AIService", code: 2002,
        userInfo: [NSLocalizedDescriptionKey: "Downloaded audio file is empty"])
    }

    if fileSize < 1024 {  // Less than 1KB is suspicious for an audio file
      Log.info("Warning: Downloaded audio file is very small (\(fileSize) bytes)")
    }

    // Try to read the first few bytes to check file header
    do {
      let fileHandle = try FileHandle(forReadingFrom: fileURL)
      defer { fileHandle.closeFile() }

      let headerData = fileHandle.readData(ofLength: 12)
      fileHandle.closeFile()

      if headerData.count >= 4 {
        let headerString = String(data: headerData.prefix(4), encoding: .ascii) ?? ""
        Log.info("Audio file header: '\(headerString)' (first 4 bytes)")

        // Check for common audio file signatures
        let audioSignatures = ["ID3", "RIFF", "fLaC", "OggS"]
        let headerBytes = Array(headerData.prefix(4))

        var isValidAudioFile = false

        // Check string-based signatures
        for signature in audioSignatures {
          if headerString.hasPrefix(signature) {
            isValidAudioFile = true
            break
          }
        }

        // Check MP3 frame headers (bytes starting with 0xFF and specific patterns)
        if headerData.count >= 2 {
          let firstTwoBytes = (UInt16(headerData[0]) << 8) | UInt16(headerData[1])
          // MP3 frame sync: first 11 bits should be 1 (0xFFE0 mask)
          if (firstTwoBytes & 0xFFE0) == 0xFFE0 {
            isValidAudioFile = true
          }
        }

        // Check for MP3 ID3v1 tag at beginning
        if headerBytes.count >= 3 && headerBytes[0] == 0xFF && (headerBytes[1] & 0xE0) == 0xE0 {
          isValidAudioFile = true
        }

        if !isValidAudioFile {
          Log.info("Warning: File header doesn't match known audio formats. Proceeding anyway...")
        }
      }
    } catch {
      Log.info("Could not read file header for validation: \(error.localizedDescription)")
    }

    // Try to create an AVAsset to validate the file can be read
    let asset = AVAsset(url: fileURL)
    let duration = asset.duration

    if duration == CMTime.invalid || duration == CMTime.indefinite {
      throw NSError(
        domain: "AIService", code: 2003,
        userInfo: [NSLocalizedDescriptionKey: "Downloaded audio file has invalid duration"])
    }

    let durationSeconds = CMTimeGetSeconds(duration)
    if durationSeconds.isNaN || durationSeconds <= 0 {
      throw NSError(
        domain: "AIService", code: 2004,
        userInfo: [
          NSLocalizedDescriptionKey:
            "Downloaded audio file has invalid duration: \(durationSeconds)"
        ])
    }

    Log.info("Audio file validation passed: duration = \(durationSeconds) seconds")
  }

  // Add getTasksDirectory method
  private func getTasksDirectory() -> URL {
    let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[
      0]
    let tasksDirectory = documentsDirectory.appendingPathComponent(
      "TranscriptionTasks", isDirectory: true)

    // Create directory if it doesn't exist
    if !FileManager.default.fileExists(atPath: tasksDirectory.path) {
      try? FileManager.default.createDirectory(
        at: tasksDirectory, withIntermediateDirectories: true)
    }

    return tasksDirectory
  }

  // Add saveTranscriptionTask method
  private func saveTranscriptionTask(_ task: TranscriptionTask) {
    do {
      let encoder = JSONEncoder()
      let data = try encoder.encode(task)

      let tasksDirectory = getTasksDirectory()
      let taskPath = tasksDirectory.appendingPathComponent("\(task.id).json")

      try data.write(to: taskPath)
      Log.info("Saved transcription task: \(task.id)")

      // Update app with progress
      if let req = pendingRequest {
        let appStore = AppStore.shared
        appStore.sendMessageToApp(message: [
          "id": req.id,
          "type": IncomingMessage.TRANSCRIBE_AUDIO,
          "data": [
            "progress": task.progress,
            "status": task.status.rawValue,
            "partialTranscription": task.transcription,
          ],
        ])
      }
    } catch {
      Log.error(message: "Failed to save transcription task: \(error.localizedDescription)")
    }
  }

  // Add Audio Processing Helpers
  private func convertAudioToWAV(_ inputURL: URL) throws -> URL {
    let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent(
      UUID().uuidString + ".wav")

    // First, validate the input file exists and has some content
    guard FileManager.default.fileExists(atPath: inputURL.path) else {
      throw NSError(
        domain: "AIService", code: 1001,
        userInfo: [NSLocalizedDescriptionKey: "Input audio file does not exist: \(inputURL.path)"])
    }

    let fileAttributes = try FileManager.default.attributesOfItem(atPath: inputURL.path)
    let fileSize = fileAttributes[.size] as? Int64 ?? 0

    Log.info("Converting audio file: \(inputURL.path) (size: \(fileSize) bytes)")

    if fileSize == 0 {
      throw NSError(
        domain: "AIService", code: 1002,
        userInfo: [NSLocalizedDescriptionKey: "Input audio file is empty"])
    }

    // Try the original method first (faster for valid files)
    do {
      return try convertAudioToWAVWithAVAudioFile(inputURL: inputURL, outputURL: outputURL)
    } catch {
      Log.info(
        "AVAudioFile conversion failed, trying AVAssetExportSession: \(error.localizedDescription)")

      // Fallback to AVAssetExportSession for problematic files
      return try convertAudioToWAVWithAVAsset(inputURL: inputURL, outputURL: outputURL)
    }
  }

  private func convertWAVWithDirectResampling(
    inputURL: URL, outputURL: URL, sourceFormat: AVAudioFormat
  ) throws -> URL {
    Log.info("Attempting direct WAV resampling...")

    // Use exactly the same settings as AudioTranscriptionView
    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatLinearPCM),
      AVSampleRateKey: 16000.0,
      AVNumberOfChannelsKey: 1,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false,
      AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
    ]

    // Create the output file first (like AudioTranscriptionView does with AVAudioRecorder)
    let outputFile = try AVAudioFile(forWriting: outputURL, settings: settings)
    let outputFormat = outputFile.processingFormat

    Log.info("Created output file with format: \(outputFormat.description)")

    // Read the source audio file
    let audioFile = try AVAudioFile(forReading: inputURL)

    guard
      let inputBuffer = AVAudioPCMBuffer(
        pcmFormat: sourceFormat, frameCapacity: AVAudioFrameCount(audioFile.length))
    else {
      throw NSError(
        domain: "AIService", code: 1011,
        userInfo: [NSLocalizedDescriptionKey: "Failed to create input buffer"])
    }

    try audioFile.read(into: inputBuffer)

    // Create converter (source → output file format)
    guard let converter = AVAudioConverter(from: sourceFormat, to: outputFormat) else {
      throw NSError(
        domain: "AIService", code: 1012,
        userInfo: [NSLocalizedDescriptionKey: "Failed to create audio converter"])
    }

    // Create output buffer that matches the output file format exactly
    let ratio = 16000 / sourceFormat.sampleRate
    guard
      let outputBuffer = AVAudioPCMBuffer(
        pcmFormat: outputFormat,
        frameCapacity: AVAudioFrameCount(Double(inputBuffer.frameLength) * ratio)
      )
    else {
      throw NSError(
        domain: "AIService", code: 1013,
        userInfo: [NSLocalizedDescriptionKey: "Failed to create output buffer"])
    }

    // Perform conversion
    var conversionError: NSError?
    let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
      outStatus.pointee = .haveData
      return inputBuffer
    }

    _ = converter.convert(to: outputBuffer, error: &conversionError, withInputFrom: inputBlock)

    if let error = conversionError {
      throw error
    }

    // Write buffer to file (formats are guaranteed to match)
    try outputFile.write(from: outputBuffer)

    Log.info("Direct WAV resampling completed successfully")
    Log.info("Output format: \(outputFormat.sampleRate)Hz, \(outputFormat.channelCount) channels")
    Log.info("Output format description: \(outputFormat.description)")

    return outputURL
  }

  private func convertAudioToWAVWithAVAudioFile(inputURL: URL, outputURL: URL) throws -> URL {
    // Configure audio converter settings - explicitly specify WAV format
    let audioFile = try AVAudioFile(forReading: inputURL)
    let sourceFormat = audioFile.processingFormat
    let fileExtension = inputURL.pathExtension.lowercased()

    Log.info(
      "Source format: \(sourceFormat.sampleRate)Hz, \(sourceFormat.channelCount) channels, file type: \(fileExtension)"
    )

    // Special optimized handling for WAV files
    if fileExtension == "wav" {
      // Check if the WAV is already in the correct format (16kHz, mono)
      if sourceFormat.sampleRate == 16000.0 && sourceFormat.channelCount == 1 {
        Log.info("WAV file is already in correct format, copying directly...")
        try FileManager.default.copyItem(at: inputURL, to: outputURL)
        return outputURL
      }

      // For WAV files that need resampling, try a more direct approach
      Log.info("WAV file needs resampling from \(sourceFormat.sampleRate)Hz to 16kHz...")
      do {
        return try convertWAVWithDirectResampling(
          inputURL: inputURL, outputURL: outputURL, sourceFormat: sourceFormat)
      } catch {
        Log.info(
          "Direct WAV resampling failed: \(error.localizedDescription), falling back to standard method..."
        )
        // Continue to standard method below
      }
    }

    // Use exactly the same settings as AudioTranscriptionView
    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatLinearPCM),
      AVSampleRateKey: 16000.0,
      AVNumberOfChannelsKey: 1,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false,
      AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
    ]

    // Create the output file first (like AudioTranscriptionView)
    let outputFile = try AVAudioFile(forWriting: outputURL, settings: settings)
    let format = outputFile.processingFormat

    // Create converter
    guard let converter = AVAudioConverter(from: sourceFormat, to: format) else {
      throw NSError(
        domain: "AIService", code: 1003,
        userInfo: [NSLocalizedDescriptionKey: "Could not create audio converter"])
    }

    // Read input file
    guard
      let inputBuffer = AVAudioPCMBuffer(
        pcmFormat: sourceFormat, frameCapacity: AVAudioFrameCount(audioFile.length))
    else {
      throw NSError(
        domain: "AIService", code: 1004,
        userInfo: [NSLocalizedDescriptionKey: "Could not create input buffer"])
    }

    try audioFile.read(into: inputBuffer)

    // Create output buffer that matches the output file format exactly
    let ratio = 16000 / sourceFormat.sampleRate
    guard
      let outputBuffer = AVAudioPCMBuffer(
        pcmFormat: format, frameCapacity: AVAudioFrameCount(Double(inputBuffer.frameLength) * ratio)
      )
    else {
      throw NSError(
        domain: "AIService", code: 1005,
        userInfo: [NSLocalizedDescriptionKey: "Could not create output buffer"])
    }

    // Convert
    var conversionError: NSError?
    let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
      outStatus.pointee = .haveData
      return inputBuffer
    }

    _ = converter.convert(to: outputBuffer, error: &conversionError, withInputFrom: inputBlock)

    if let error = conversionError {
      throw error
    }

    // Write buffer to file (formats are guaranteed to match)
    try outputFile.write(from: outputBuffer)

    // Verify the output format matches AudioTranscriptionView
    let outputAudioFile = try AVAudioFile(forReading: outputURL)
    let outputFormat = outputAudioFile.fileFormat
    Log.info("Standard WAV conversion completed successfully")
    Log.info("Output format: \(outputFormat.sampleRate)Hz, \(outputFormat.channelCount) channels")
    Log.info("Output format description: \(outputFormat.description)")
    Log.info("Output bit depth: \(outputFormat.streamDescription.pointee.mBitsPerChannel)")
    Log.info("Output is float: \(outputFormat.isStandard ? "No (Integer)" : "Yes (Float)")")

    // Check if the output is long enough, pad if needed
    let outputDurationMs = Double(outputAudioFile.length) / 16000.0 * 1000

    if outputDurationMs < 100 {
      // Create a padded version
      return try padAudioToMinLength(outputURL)
    }

    return outputURL
  }

  private func convertAudioToWAVWithAVAsset(inputURL: URL, outputURL: URL) throws -> URL {
    Log.info("Using AVAssetExportSession for audio conversion")

    let asset = AVAsset(url: inputURL)

    // Check if the asset can be exported
    guard asset.isExportable else {
      throw NSError(
        domain: "AIService", code: 1003,
        userInfo: [NSLocalizedDescriptionKey: "Audio asset is not exportable"])
    }

    // Get the audio tracks
    let audioTracks = asset.tracks(withMediaType: .audio)
    guard !audioTracks.isEmpty else {
      throw NSError(
        domain: "AIService", code: 1004,
        userInfo: [NSLocalizedDescriptionKey: "No audio tracks found in the file"])
    }

    Log.info("Found \(audioTracks.count) audio track(s) in asset")

    // Try different export presets in order of preference (audio-only presets)
    let exportPresets = [
      AVAssetExportPresetPassthrough,
      AVAssetExportPresetAppleM4A,
    ]

    for (index, preset) in exportPresets.enumerated() {
      Log.info("Trying export preset \(index + 1)/\(exportPresets.count): \(preset)")

      // Check if preset is compatible with the asset
      let compatiblePresets = AVAssetExportSession.exportPresets(compatibleWith: asset)
      guard compatiblePresets.contains(preset) else {
        Log.info("Preset \(preset) not compatible with asset, trying next...")
        continue
      }

      guard let exportSession = AVAssetExportSession(asset: asset, presetName: preset) else {
        Log.info("Could not create export session with preset \(preset), trying next...")
        continue
      }

      // Determine appropriate output format based on preset
      let (outputFileType, fileExtension) = getOutputFormat(for: preset)
      let tempOutputUrl = FileManager.default.temporaryDirectory.appendingPathComponent(
        UUID().uuidString + fileExtension)

      exportSession.outputFileType = outputFileType
      exportSession.outputURL = tempOutputUrl

      // Use a semaphore to wait for the async export to complete
      let semaphore = DispatchSemaphore(value: 0)
      var exportError: Error?

      exportSession.exportAsynchronously {
        if let error = exportSession.error {
          exportError = error
        }
        semaphore.signal()
      }

      semaphore.wait()

      if let error = exportError {
        Log.info("Export failed with preset \(preset): \(error.localizedDescription)")
        // Clean up and try next preset
        try? FileManager.default.removeItem(at: tempOutputUrl)
        continue
      }

      switch exportSession.status {
      case .completed:
        Log.info("Export completed successfully with preset: \(preset)")

        // Now convert the exported file to WAV using AVAudioFile
        do {
          let exportedFile = try AVAudioFile(forReading: tempOutputUrl)

          // Use exactly the same settings as AudioTranscriptionView
          let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
          ]

          // Create the output file first (like AudioTranscriptionView)
          let outputFile = try AVAudioFile(forWriting: outputURL, settings: settings)
          let format = outputFile.processingFormat

          // Create converter
          guard let converter = AVAudioConverter(from: exportedFile.processingFormat, to: format)
          else {
            throw NSError(
              domain: "AIService", code: 1010,
              userInfo: [NSLocalizedDescriptionKey: "Could not create audio converter"])
          }

          // Read input file
          guard
            let inputBuffer = AVAudioPCMBuffer(
              pcmFormat: exportedFile.processingFormat,
              frameCapacity: AVAudioFrameCount(exportedFile.length))
          else {
            throw NSError(
              domain: "AIService", code: 1011,
              userInfo: [NSLocalizedDescriptionKey: "Could not create input buffer"])
          }

          try exportedFile.read(into: inputBuffer)

          // Create output buffer that matches the output file format exactly
          let ratio = 16000 / exportedFile.processingFormat.sampleRate
          guard
            let outputBuffer = AVAudioPCMBuffer(
              pcmFormat: format,
              frameCapacity: AVAudioFrameCount(Double(inputBuffer.frameLength) * ratio))
          else {
            throw NSError(
              domain: "AIService", code: 1012,
              userInfo: [NSLocalizedDescriptionKey: "Could not create output buffer"])
          }

          // Convert
          var conversionError: NSError?
          let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
            outStatus.pointee = .haveData
            return inputBuffer
          }

          _ = converter.convert(
            to: outputBuffer, error: &conversionError, withInputFrom: inputBlock)

          if let error = conversionError {
            throw error
          }

          // Write buffer to file (formats are guaranteed to match)
          try outputFile.write(from: outputBuffer)

          // Clean up temporary exported file
          try? FileManager.default.removeItem(at: tempOutputUrl)

          // Check if the output is long enough, pad if needed
          let outputAudioFile = try AVAudioFile(forReading: outputURL)
          let outputDurationMs =
            Double(outputAudioFile.length) / outputAudioFile.processingFormat.sampleRate * 1000

          if outputDurationMs < 100 {
            Log.info("Output audio too short (\(outputDurationMs)ms), padding...")
            return try padAudioToMinLength(outputURL)
          }

          return outputURL

        } catch {
          // Clean up temporary exported file on error
          try? FileManager.default.removeItem(at: tempOutputUrl)
          Log.info(
            "Post-export conversion failed with preset \(preset): \(error.localizedDescription)")
          // Try next preset
          continue
        }

      case .failed:
        let errorMessage = exportSession.error?.localizedDescription ?? "Unknown export error"
        Log.info("Export failed with preset \(preset): \(errorMessage)")
        try? FileManager.default.removeItem(at: tempOutputUrl)
        continue

      case .cancelled:
        Log.info("Export was cancelled with preset \(preset)")
        try? FileManager.default.removeItem(at: tempOutputUrl)
        continue

      default:
        Log.info(
          "Export finished with unexpected status: \(exportSession.status.rawValue) for preset \(preset)"
        )
        try? FileManager.default.removeItem(at: tempOutputUrl)
        continue
      }
    }

    // If we reach here, all export presets failed
    throw NSError(
      domain: "AIService", code: 1013,
      userInfo: [
        NSLocalizedDescriptionKey:
          "All export presets failed. The audio file format may not be supported."
      ])
  }

  private func getOutputFormat(for preset: String) -> (AVFileType, String) {
    switch preset {
    case AVAssetExportPresetAppleM4A:
      return (.m4a, ".m4a")
    case AVAssetExportPresetPassthrough:
      // For passthrough, we'll assume it keeps the original format but we need a universal container
      return (.m4a, ".m4a")
    default:
      // For other presets, use M4A as a safe default
      return (.m4a, ".m4a")
    }
  }

  private func splitAudioIntoChunks(_ audioURL: URL) throws -> [URL] {
    let audioFile = try AVAudioFile(forReading: audioURL)
    let format = audioFile.processingFormat
    let rate = format.sampleRate

    // For simplicity, we'll use 30-second chunks
    let chunkDuration: Double = 30.0
    let framesPerChunk = AVAudioFrameCount(chunkDuration * rate)
    let totalFrames = AVAudioFrameCount(audioFile.length)

    var chunks: [URL] = []

    // Reset file position
    audioFile.framePosition = 0

    var processedFrames: AVAudioFrameCount = 0

    while processedFrames < totalFrames {
      // Calculate frames to read
      let framesToRead = min(framesPerChunk, totalFrames - processedFrames)

      // Create buffer for reading
      guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: framesToRead) else {
        throw NSError(
          domain: "AIService", code: 1001,
          userInfo: [NSLocalizedDescriptionKey: "Could not create audio buffer"])
      }

      // Read frames
      try audioFile.read(into: buffer)

      // Create a new file for the chunk
      let chunkURL = FileManager.default.temporaryDirectory.appendingPathComponent(
        "\(UUID().uuidString)_chunk.wav")
      let chunkFile = try AVAudioFile(forWriting: chunkURL, settings: format.settings)

      // Write buffer to chunk file
      try chunkFile.write(from: buffer)

      // Add chunk to array
      chunks.append(chunkURL)

      // Update processed frames
      processedFrames += framesToRead
    }

    return chunks
  }

  /// Retrieves a transcription task by its ID
  func getTranscriptionTask(id: String) -> TranscriptionTask? {
    let tasksDirectory = getTasksDirectory()
    let taskPath = tasksDirectory.appendingPathComponent("\(id).json")

    guard FileManager.default.fileExists(atPath: taskPath.path) else {
      return nil
    }

    do {
      let data = try Data(contentsOf: taskPath)
      let decoder = JSONDecoder()
      return try decoder.decode(TranscriptionTask.self, from: data)
    } catch {
      Log.error(message: "Error reading transcription task: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Private Methods

  // Simple transcription method that exactly mimics AudioTranscriptionView (no chunking)
  private func performSimpleTranscription(
    audioPath: URL,
    baseModelPath: URL,
    completion: @escaping (Result<String, Error>) -> Void
  ) {
    Log.info("Starting simple transcription (like AudioTranscriptionView) for: \(audioPath.path)")

    let taskId = UUID().uuidString
    let requestId = pendingRequest?.id ?? UUID().uuidString

    var task = TranscriptionTask(
      id: taskId,
      requestId: requestId,
      audioURL: pendingRequest?.body["url"]?.value as? String ?? "",
      audioFilePath: audioPath.path,
      modelPath: baseModelPath.path,
      progress: 0.0,
      status: .processing,
      chunks: [],
      createdAt: Date(),
      updatedAt: Date(),
      transcription: ""
    )

    saveTranscriptionTask(task)

    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }

      do {
        task.progress = 0.2
        self.saveTranscriptionTask(task)

        let convertedAudioURL = try self.convertAudioToWAV(audioPath)
        Log.info("Audio converted for simple transcription: \(convertedAudioURL.path)")

        task.progress = 0.4
        self.saveTranscriptionTask(task)

        if self.whisperWrapper == nil {
          self.initializeWhisper(modelURL: baseModelPath)
        }

        guard let whisperWrapper = self.whisperWrapper else {
          throw NSError(
            domain: "AIService", code: 4001,
            userInfo: [NSLocalizedDescriptionKey: "Failed to initialize Whisper"])
        }

        task.progress = 0.6
        self.saveTranscriptionTask(task)

        Log.info("Starting Whisper transcription on entire file...")
        // Extract parameters from request
        let language = self.pendingRequest?.body["language"]?.value as? String
        let enableDiarization =
          self.pendingRequest?.body["enableSpeakerDiarization"]?.value as? Bool ?? false
        let enableTimestamps =
          self.pendingRequest?.body["enableTimestamps"]?.value as? Bool ?? false
        let enableImprovedFormat =
          self.pendingRequest?.body["enableImprovedFormatting"]?.value as? Bool ?? false

        let result = try whisperWrapper.transcribeAudio(
          atPath: convertedAudioURL.path,
          language: language,
          enableDiarization: enableDiarization,
          enableTimestamps: enableTimestamps,
          enableImprovedFormat: enableImprovedFormat
        )

        guard !result.isEmpty else {
          throw NSError(
            domain: "AIService", code: 4002,
            userInfo: [NSLocalizedDescriptionKey: "Transcription returned empty result"])
        }

        let transcription = result

        task.status = .completed
        task.progress = 1.0
        task.transcription = transcription
        task.updatedAt = Date()
        self.saveTranscriptionTask(task)

        try? FileManager.default.removeItem(at: convertedAudioURL)

        Log.info("Simple transcription completed successfully: \(transcription.prefix(100))...")

        DispatchQueue.main.async {
          self.isTranscribing = false
          self.transcriptionTimer?.invalidate()
          completion(.success(transcription))
        }

      } catch {
        task.status = .failed
        task.updatedAt = Date()
        self.saveTranscriptionTask(task)

        Log.error(message: "Simple transcription failed: \(error.localizedDescription)")

        DispatchQueue.main.async {
          self.isTranscribing = false
          self.transcriptionTimer?.invalidate()
          completion(.failure(error))
        }
      }
    }
  }

  private func performOptimizedMP3Transcription(
    audioPath: URL,
    baseModelPath: URL,
    completion: @escaping (Result<String, Error>) -> Void
  ) {
    Log.info("Starting optimized MP3 transcription (bypassing WAV conversion): \(audioPath.path)")

    // Create a new transcription task
    let taskId = UUID().uuidString
    let requestId = pendingRequest?.id ?? UUID().uuidString

    var task = TranscriptionTask(
      id: taskId,
      requestId: requestId,
      audioURL: pendingRequest?.body["url"]?.value as? String ?? "",
      audioFilePath: audioPath.path,
      modelPath: baseModelPath.path,
      progress: 0.0,
      status: .processing,
      chunks: [],
      createdAt: Date(),
      updatedAt: Date(),
      transcription: ""
    )

    // Save initial task state
    saveTranscriptionTask(task)

    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }

      do {
        // 1. Extract PCM data directly from MP3 using AVAudioFile (no WAV conversion!)
        task.status = .processing
        task.progress = 0.1
        self.saveTranscriptionTask(task)

        Log.info("Extracting PCM data directly from: \(audioPath.path)")

        // Read the MP3 file directly
        let audioFile = try AVAudioFile(forReading: audioPath)
        let sourceFormat = audioFile.processingFormat

        Log.info(
          "Source audio: \(sourceFormat.sampleRate)Hz, \(sourceFormat.channelCount) channels, format: \(sourceFormat.description)"
        )

        // Create target format (16kHz, mono, float32) for processing
        guard
          let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: 16000.0,
            channels: 1,
            interleaved: false)
        else {
          throw NSError(
            domain: "AIService", code: 3001,
            userInfo: [NSLocalizedDescriptionKey: "Could not create target audio format"])
        }

        // Read the entire audio file
        guard
          let sourceBuffer = AVAudioPCMBuffer(
            pcmFormat: sourceFormat,
            frameCapacity: AVAudioFrameCount(audioFile.length))
        else {
          throw NSError(
            domain: "AIService", code: 3002,
            userInfo: [NSLocalizedDescriptionKey: "Could not create source buffer"])
        }

        try audioFile.read(into: sourceBuffer)
        task.progress = 0.3
        self.saveTranscriptionTask(task)

        // Convert to target format if needed
        let targetFrameCount = AVAudioFrameCount(
          Double(sourceBuffer.frameLength) * (16000.0 / sourceFormat.sampleRate))
        guard
          let targetBuffer = AVAudioPCMBuffer(
            pcmFormat: targetFormat,
            frameCapacity: targetFrameCount)
        else {
          throw NSError(
            domain: "AIService", code: 3003,
            userInfo: [NSLocalizedDescriptionKey: "Could not create target buffer"])
        }

        if sourceFormat.sampleRate != 16000.0 || sourceFormat.channelCount != 1 {
          // Need conversion
          guard let converter = AVAudioConverter(from: sourceFormat, to: targetFormat) else {
            throw NSError(
              domain: "AIService", code: 3004,
              userInfo: [NSLocalizedDescriptionKey: "Could not create audio converter"])
          }

          var conversionError: NSError?
          let inputBlock: AVAudioConverterInputBlock = { _, outStatus in
            outStatus.pointee = .haveData
            return sourceBuffer
          }

          _ = converter.convert(
            to: targetBuffer, error: &conversionError, withInputFrom: inputBlock)

          if let error = conversionError {
            throw error
          }
        } else {
          // Direct copy if already correct format
          targetBuffer.frameLength = sourceBuffer.frameLength
          if let sourceChannelData = sourceBuffer.floatChannelData?[0],
            let targetChannelData = targetBuffer.floatChannelData?[0]
          {
            memcpy(
              targetChannelData, sourceChannelData,
              Int(sourceBuffer.frameLength) * MemoryLayout<Float>.size)
          }
        }

        task.progress = 0.5
        self.saveTranscriptionTask(task)

        // 2. Get PCM float data for Whisper
        guard let pcmData = targetBuffer.floatChannelData?[0] else {
          throw NSError(
            domain: "AIService", code: 3005,
            userInfo: [NSLocalizedDescriptionKey: "Could not access PCM data"])
        }

        let sampleCount = Int(targetBuffer.frameLength)
        let sampleRate = Int(targetFormat.sampleRate)

        Log.info(
          "Extracted PCM: \(sampleCount) samples at \(sampleRate)Hz (\(Double(sampleCount)/Double(sampleRate)*1000)ms)"
        )

        // 3. Initialize Whisper if needed
        task.progress = 0.7
        self.saveTranscriptionTask(task)

        if self.whisperWrapper == nil {
          // Check if model file exists before initializing
          guard FileManager.default.fileExists(atPath: baseModelPath.path) else {
            throw NSError(
              domain: "AIService", code: 3004,
              userInfo: [
                NSLocalizedDescriptionKey: "Whisper model file not found at: \(baseModelPath.path)"
              ])
          }

          self.initializeWhisper(modelURL: baseModelPath)
        }

        guard let whisperWrapper = self.whisperWrapper else {
          throw NSError(
            domain: "AIService", code: 3005,
            userInfo: [NSLocalizedDescriptionKey: "Failed to initialize Whisper"])
        }

        Log.info("Running optimized Whisper transcription on PCM data...")

        // Extract parameters from request
        let language = self.pendingRequest?.body["language"]?.value as? String
        let enableDiarization =
          self.pendingRequest?.body["enableSpeakerDiarization"]?.value as? Bool ?? false
        let enableTimestamps =
          self.pendingRequest?.body["enableTimestamps"]?.value as? Bool ?? false
        let enableImprovedFormat =
          self.pendingRequest?.body["enableImprovedFormatting"]?.value as? Bool ?? false

        let finalTranscription = try whisperWrapper.transcribeAudio(
          fromPCMData: targetBuffer.floatChannelData![0],
          sampleCount: Int32(targetBuffer.frameLength),
          sampleRate: Int32(16000),
          language: language,
          enableDiarization: enableDiarization,
          enableTimestamps: enableTimestamps,
          enableImprovedFormat: enableImprovedFormat
        )

        guard !finalTranscription.isEmpty else {
          throw NSError(
            domain: "AIService", code: 3006,
            userInfo: [NSLocalizedDescriptionKey: "Transcription returned empty result"])
        }

        Log.info("Optimized transcription result: \(finalTranscription.prefix(100))...")

        task.status = .completed
        task.progress = 1.0
        task.transcription = finalTranscription
        task.updatedAt = Date()
        self.saveTranscriptionTask(task)

        // Return the result
        DispatchQueue.main.async {
          self.isTranscribing = false
          self.transcriptionTimer?.invalidate()
          completion(.success(finalTranscription))
        }

      } catch {
        // Provide specific error messages for the optimized flow
        var userFriendlyMessage = ""
        var logMessage = "Optimized transcription failed: \(error.localizedDescription)"

        if let nsError = error as NSError? {
          switch nsError.domain {
          case "AIService":
            switch nsError.code {
            case 3001...3006:
              userFriendlyMessage =
                "Direct audio processing failed. Falling back to standard method..."
              logMessage += " [Direct PCM processing error]"
            default:
              userFriendlyMessage = "Audio processing failed: \(nsError.localizedDescription)"
            }
          case "com.apple.coreaudio.avfaudio":
            userFriendlyMessage =
              "Audio format processing failed. Falling back to standard method..."
            logMessage += " [Core Audio error: \(nsError.code)]"
          default:
            userFriendlyMessage = "Transcription failed: \(error.localizedDescription)"
          }
        } else {
          userFriendlyMessage = "Transcription failed: \(error.localizedDescription)"
        }

        task.status = .failed
        task.updatedAt = Date()
        self.saveTranscriptionTask(task)

        Log.error(message: logMessage)

        DispatchQueue.main.async {
          self.isTranscribing = false
          self.transcriptionTimer?.invalidate()

          // For the optimized method, we can fall back to the standard method
          Log.info("Falling back to standard transcription method...")
          self.performTranscription(
            audioPath: audioPath,
            baseModelPath: baseModelPath,
            coreMLModelPath: nil,
            completion: completion
          )
        }
      }
    }
  }

  private func performTranscription(
    audioPath: URL,
    baseModelPath: URL,
    coreMLModelPath: URL?,
    completion: @escaping (Result<String, Error>) -> Void
  ) {
    Log.info(
      "Starting actual transcription of audio file: \(audioPath.path) using model: \(baseModelPath.path)"
    )
    if let coreMLPath = coreMLModelPath {
      Log.info(
        "CoreML model provided but not supported in current implementation: \(coreMLPath.path)")
    }

    // Create a new transcription task
    let taskId = UUID().uuidString
    let requestId = pendingRequest?.id ?? UUID().uuidString

    var task = TranscriptionTask(
      id: taskId,
      requestId: requestId,
      audioURL: pendingRequest?.body["url"]?.value as? String ?? "",
      audioFilePath: audioPath.path,
      modelPath: baseModelPath.path,
      progress: 0.0,
      status: .downloading,
      chunks: [],
      createdAt: Date(),
      updatedAt: Date(),
      transcription: ""
    )

    // Save initial task state
    saveTranscriptionTask(task)

    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self = self else { return }

      do {
        // 1. Convert the audio to the format needed by Whisper (16kHz WAV)
        task.status = .processing
        task.progress = 0.1
        self.saveTranscriptionTask(task)

        Log.info("Converting audio from: \(audioPath.path)")
        let convertedAudioURL = try self.convertAudioToWAV(audioPath)
        Log.info("Audio conversion successful, output: \(convertedAudioURL.path)")
        task.progress = 0.2
        self.saveTranscriptionTask(task)

        // 2. Break audio into chunks for processing
        // For simplicity, we'll use a fixed chunk size of 30 seconds
        Log.info("Splitting audio into chunks...")
        let audioChunks = try self.splitAudioIntoChunks(convertedAudioURL)
        Log.info("Created \(audioChunks.count) audio chunks")

        // Create empty chunks in the task
        task.chunks = audioChunks.enumerated().map { index, chunkURL in
          TranscriptionChunk(
            index: index,
            startTime: Double(index) * 30.0,
            endTime: Double(index + 1) * 30.0,
            text: "",
            isProcessed: false
          )
        }

        task.progress = 0.3
        self.saveTranscriptionTask(task)

        // 3. Process each chunk with the Whisper model
        var fullTranscription = ""

        // Initialize Whisper wrapper if needed
        if self.whisperWrapper == nil {
          self.initializeWhisper(modelURL: baseModelPath)
        }

        guard let whisperWrapper = self.whisperWrapper else {
          throw NSError(
            domain: "AIService", code: 4001,
            userInfo: [NSLocalizedDescriptionKey: "Failed to initialize Whisper"])
        }

        // Extract parameters from request
        let language = self.pendingRequest?.body["language"]?.value as? String
        let enableDiarization =
          self.pendingRequest?.body["enableSpeakerDiarization"]?.value as? Bool ?? false
        let enableTimestamps =
          self.pendingRequest?.body["enableTimestamps"]?.value as? Bool ?? false
        let enableImprovedFormat =
          self.pendingRequest?.body["enableImprovedFormatting"]?.value as? Bool ?? false

        for (index, chunkURL) in audioChunks.enumerated() {
          Log.info("Processing chunk \(index + 1)/\(audioChunks.count): \(chunkURL.path)")

          let chunkText = try whisperWrapper.transcribeAudio(
            atPath: chunkURL.path,
            language: language,
            enableDiarization: enableDiarization,
            enableTimestamps: enableTimestamps,
            enableImprovedFormat: enableImprovedFormat
          )

          // Update chunk
          if index < task.chunks.count {
            task.chunks[index].text = chunkText
            task.chunks[index].isProcessed = true
          }

          // Append to full transcription
          if !fullTranscription.isEmpty {
            fullTranscription += " "
          }
          fullTranscription += chunkText

          // Update progress (from 30% to 90%)
          let chunkProgress = Double(index + 1) / Double(audioChunks.count) * 0.6
          task.progress = 0.3 + chunkProgress
          task.transcription = fullTranscription
          self.saveTranscriptionTask(task)

          // Clean up chunk file
          try? FileManager.default.removeItem(at: chunkURL)
        }

        // 4. Complete the task
        task.status = .completed
        task.progress = 1.0
        task.transcription = fullTranscription
        task.updatedAt = Date()
        self.saveTranscriptionTask(task)

        // 5. Clean up temporary files
        try? FileManager.default.removeItem(at: convertedAudioURL)

        // Return the result
        DispatchQueue.main.async {
          self.isTranscribing = false
          self.transcriptionTimer?.invalidate()
          completion(.success(fullTranscription))
        }

      } catch {
        // Provide more specific error messages based on the error type
        var userFriendlyMessage = ""
        var logMessage = "Transcription failed: \(error.localizedDescription)"

        if let nsError = error as NSError? {
          switch nsError.domain {
          case "AIService":
            switch nsError.code {
            case 1001...1008:
              userFriendlyMessage =
                "Audio conversion failed. The audio file format may not be supported."
              logMessage += " [Audio conversion error]"
            case 2001...2004:
              userFriendlyMessage = "Downloaded audio file is invalid or corrupted."
              logMessage += " [Audio validation error]"
            default:
              userFriendlyMessage = "Audio processing failed: \(nsError.localizedDescription)"
            }
          case "com.apple.coreaudio.avfaudio":
            userFriendlyMessage = "Audio format not supported. Please try a different audio file."
            logMessage += " [Core Audio error: \(nsError.code)]"
          default:
            userFriendlyMessage = "Transcription failed: \(error.localizedDescription)"
          }
        } else {
          userFriendlyMessage = "Transcription failed: \(error.localizedDescription)"
        }

        task.status = .failed
        task.updatedAt = Date()
        self.saveTranscriptionTask(task)

        Log.error(message: logMessage)

        DispatchQueue.main.async {
          self.isTranscribing = false
          self.transcriptionTimer?.invalidate()

          // Create a more informative error for the completion handler
          let enhancedError = NSError(
            domain: "AIService",
            code: (error as NSError?)?.code ?? 9999,
            userInfo: [
              NSLocalizedDescriptionKey: userFriendlyMessage,
              NSUnderlyingErrorKey: error,
              "audioPath": audioPath.path,
              "modelPath": baseModelPath.path,
            ]
          )

          completion(.failure(enhancedError))
        }
      }
    }
  }

  // Helper method to pad audio to meet minimum length requirements
  private func padAudioToMinLength(_ url: URL) throws -> URL {
    // Create a unique temporary file URL
    let paddedURL = FileManager.default.temporaryDirectory.appendingPathComponent(
      "padded_\(UUID().uuidString).wav")

    // Read the original audio file
    let audioFile = try AVAudioFile(forReading: url)
    let format = audioFile.processingFormat
    let sampleRate = format.sampleRate

    // Calculate current length and required padding
    let currentLength = Double(audioFile.length) / sampleRate * 1000  // in milliseconds
    let paddingNeeded = max(0, 100 - currentLength) + 50  // ensure minimum 150ms (100ms required + 50ms buffer)
    let framesToAdd = AVAudioFrameCount(paddingNeeded * sampleRate / 1000)

    // Create buffer for output - we'll combine the original audio + silence
    let totalFrames = AVAudioFrameCount(audioFile.length) + framesToAdd
    guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: totalFrames) else {
      throw NSError(
        domain: "AIService", code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Couldn't create audio buffer"])
    }

    // Open a fresh file handle to read from the beginning
    let freshAudioFile = try AVAudioFile(forReading: url)

    // Read original audio into our buffer
    try freshAudioFile.read(into: buffer, frameCount: AVAudioFrameCount(audioFile.length))

    // Set current frame length to include the original audio
    buffer.frameLength = AVAudioFrameCount(audioFile.length)

    // Add silence by extending the buffer's frameLength
    buffer.frameLength = totalFrames

    // Create a new file for the padded audio with specific settings - EXACTLY like AudioTranscriptionView
    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatLinearPCM),
      AVSampleRateKey: 16000.0,
      AVNumberOfChannelsKey: 1,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false,
      AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
    ]

    // Write the combined buffer to the output file
    let paddedFile = try AVAudioFile(forWriting: paddedURL, settings: settings)
    try paddedFile.write(from: buffer)

    return paddedURL
  }
}

// MARK: - Result Extension
extension Result {
  var isSuccess: Bool {
    switch self {
    case .success:
      return true
    case .failure:
      return false
    }
  }
}

// MARK: - AIService Extensions

extension AIService {
  // MARK: - Helper Methods

  private func downloadModel(
    from url: URL, to destination: URL, completion: @escaping (Result<Void, Error>) -> Void
  ) {
    Log.info("Downloading model from: \(url)")

    let downloadTask = URLSession.shared.downloadTask(with: url) { (tempURL, response, error) in
      if let error = error {
        Log.error(message: "Failed to download model: \(error.localizedDescription)")
        completion(.failure(error))
        return
      }

      guard let tempURL = tempURL else {
        let error = NSError(
          domain: "AIService", code: 3,
          userInfo: [NSLocalizedDescriptionKey: "No data received when downloading model"])
        Log.error(message: "No data received when downloading model")
        completion(.failure(error))
        return
      }

      do {
        // Remove existing file if it exists
        if FileManager.default.fileExists(atPath: destination.path) {
          try FileManager.default.removeItem(at: destination)
        }

        // Move downloaded file to destination
        try FileManager.default.moveItem(at: tempURL, to: destination)
        Log.info("Model downloaded successfully to: \(destination.path)")
        completion(.success(()))
      } catch {
        Log.error(message: "Failed to save model: \(error.localizedDescription)")
        completion(.failure(error))
      }
    }

    downloadTask.resume()
  }
}
