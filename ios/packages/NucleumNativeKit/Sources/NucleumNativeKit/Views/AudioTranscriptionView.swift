import AVFoundation
import SwiftUI

struct AudioTranscriptionView: View {
  @StateObject private var aiService = AIService()
  @StateObject private var viewModel = AudioTranscriptionViewModel()

  var body: some View {
    VStack(spacing: 20) {
      Text("Whisper.cpp Transcription Test")
        .font(.headline)
        .padding()

      // Status information
      Group {
        if aiService.isRecording {
          Text("Recording in progress...")
            .foregroundColor(.red)
        } else if aiService.isTranscribing {
          Text("Transcribing audio...")
            .foregroundColor(.orange)
          if let startTime = viewModel.transcriptionStartTime {
            Text("Time elapsed: \(String(format: "%.1f", Date().timeIntervalSince(startTime)))s")
              .foregroundColor(.orange)
              .font(.subheadline)
          }
        } else if aiService.isPlaying {
          Text("Playing audio...")
            .foregroundColor(.orange)
        } else if let error = aiService.error, error.contains("Downloading") {
          Text(error)
            .foregroundColor(.blue)
            .font(.subheadline)
          // Add a progress indicator for downloading
          ProgressView()
            .padding(.top, 4)
        } else if aiService.hasRecording {
          Text("Recording available")
            .foregroundColor(.green)
          Text("Duration: \(String(format: "%.1f", viewModel.audioDuration))s")
            .foregroundColor(.green)
            .font(.subheadline)
        } else {
          Text("Ready to record")
            .foregroundColor(.blue)
        }

        if let error = aiService.error, !error.contains("Downloading") {
          Text(error)
            .foregroundColor(.red)
            .font(.footnote)
            .multilineTextAlignment(.center)
            .padding()
        }
      }

      // Transcription result
      if !aiService.transcription.isEmpty {
        VStack(alignment: .leading) {
          Text("Transcription:")
            .font(.headline)
          if viewModel.transcriptionDuration > 0 {
            Text("Processing time: \(String(format: "%.1f", viewModel.transcriptionDuration))s")
              .font(.subheadline)
              .foregroundColor(.gray)
          }

          ScrollView {
            Text(aiService.transcription)
              .padding()
              .frame(maxWidth: .infinity, alignment: .leading)
          }
          .frame(maxHeight: 200)
          .background(Color.gray.opacity(0.1))
          .cornerRadius(8)
        }
        .padding()
      }

      Spacer()

      // Model download button (appears if model is not available)
      if let error = aiService.error, error.contains("not found") {
        Button(action: {
          aiService.downloadModelIfNeeded()
        }) {
          HStack {
            Image(systemName: "arrow.down.circle.fill")
              .font(.system(size: 20))
            Text("Download Whisper Model")
          }
          .padding()
          .background(Color.blue.opacity(0.1))
          .cornerRadius(8)
        }
        .padding(.bottom, 20)
      }

      // Control buttons
      HStack(spacing: 40) {
        // Record button
        Button(action: {
          if aiService.isRecording {
            aiService.stopRecording()
            viewModel.updateAudioDuration(audioFileURL: aiService.audioFileURL)
          } else {
            aiService.startRecording()
          }
        }) {
          VStack {
            Image(systemName: aiService.isRecording ? "stop.circle.fill" : "mic.circle.fill")
              .font(.system(size: 60))
              .foregroundColor(aiService.isRecording ? .red : .blue)

            Text(aiService.isRecording ? "Stop" : "Record")
              .foregroundColor(aiService.isRecording ? .red : .blue)
          }
        }
        .disabled(aiService.isTranscribing)

        // Play button
        Button(action: {
          if aiService.isPlaying {
            aiService.stopPlayback()
          } else {
            aiService.playRecordedAudio()
          }
        }) {
          VStack {
            Image(systemName: aiService.isPlaying ? "stop.fill" : "play.circle.fill")
              .font(.system(size: 60))
              .foregroundColor(.orange)

            Text(aiService.isPlaying ? "Stop" : "Play")
              .foregroundColor(.orange)
          }
        }
        .disabled(!aiService.hasRecording || aiService.isRecording || aiService.isTranscribing)

        // Transcribe button
        Button(action: {
          viewModel.startTranscription()
          aiService.transcribeAudio()
        }) {
          VStack {
            Image(systemName: "waveform.circle.fill")
              .font(.system(size: 60))
              .foregroundColor(.green)

            Text("Transcribe")
              .foregroundColor(.green)
          }
        }
        .disabled(
          !aiService.hasRecording || aiService.isTranscribing || aiService.isRecording
            || aiService.isPlaying)
      }
      .padding(.bottom, 40)
    }
    .padding()
    .onAppear {
      // Request microphone permissions when view appears
      #if os(iOS)
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          // Handle permission result if needed
        }
      #endif
    }
    .onChange(of: aiService.isTranscribing) { isTranscribing in
      if !isTranscribing {
        viewModel.stopTranscription()
      }
    }
  }
}

class AudioTranscriptionViewModel: ObservableObject {
  @Published var audioDuration: TimeInterval = 0
  @Published var transcriptionStartTime: Date?
  @Published var transcriptionDuration: TimeInterval = 0
  private var transcriptionTimer: Timer?

  func updateAudioDuration(audioFileURL: URL?) {
    guard let audioFileURL = audioFileURL else { return }
    do {
      let audioFile = try AVAudioFile(forReading: audioFileURL)
      audioDuration = Double(audioFile.length) / audioFile.processingFormat.sampleRate
    } catch {
      print("Error getting audio duration: \(error)")
    }
  }

  func startTranscription() {
    transcriptionStartTime = Date()
    startTranscriptionTimer()
  }

  func stopTranscription() {
    stopTranscriptionTimer()
    if let startTime = transcriptionStartTime {
      transcriptionDuration = Date().timeIntervalSince(startTime)
      transcriptionStartTime = nil
    }
  }

  private func startTranscriptionTimer() {
    transcriptionTimer?.invalidate()
    transcriptionTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) {
      [weak self] _ in
      self?.objectWillChange.send()
    }
  }

  private func stopTranscriptionTimer() {
    transcriptionTimer?.invalidate()
    transcriptionTimer = nil
  }
}
