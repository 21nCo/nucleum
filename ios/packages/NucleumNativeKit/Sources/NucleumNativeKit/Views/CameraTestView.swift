//
//  CameraTestView.swift
//  Memotron
//
//  Created by Ar on 2/18/24.
//

import AVFoundation
import Foundation
import SwiftUI

struct CameraView: View {
  @StateObject private var cameraManager = CameraManager()

  var body: some View {
    ZStack {
      if let image = cameraManager.capturedImage {
        ImagePreviewView(image: image, cameraManager: cameraManager)
      } else {
        CameraPreview(cameraManager: cameraManager)
        CaptureButton(cameraManager: cameraManager)
      }
    }
    .onDisappear {
      cameraManager.cleanup()
    }
  }
}

struct ImagePreviewView: View {
  let image: UIImage
  @ObservedObject var cameraManager: CameraManager

  var body: some View {
    VStack {
      Image(uiImage: image)
        .resizable()
        .scaledToFit()

      Button("Retake") {
        cameraManager.restartCapture()
      }
      .padding()
      .frame(height: 50)
      .background(Color.blue)
      .foregroundColor(.white)
      .cornerRadius(10)
      .shadow(radius: 2)
    }
  }
}

struct CaptureButton: View {
  @ObservedObject var cameraManager: CameraManager

  var body: some View {
    VStack {
      Spacer()
      Button(action: {
        cameraManager.capturePhoto()
      }) {
        Circle()
          .foregroundColor(.blue)
          .frame(width: 80, height: 80)
          .overlay(
            Circle()
              .stroke(Color.white, lineWidth: 2)
              .frame(width: 70, height: 70)
          )
      }
      .padding(.bottom)
    }
  }
}

struct CameraPreview: UIViewRepresentable {
  @ObservedObject var cameraManager: CameraManager

  func makeUIView(context: Context) -> UIView {
    let view = UIView()
    view.layer.addSublayer(cameraManager.previewLayer)
    return view
  }

  func updateUIView(_ uiView: UIView, context: Context) {
    cameraManager.previewLayer.frame = uiView.bounds
  }
}

class CameraManager: NSObject, ObservableObject {
  let session = AVCaptureSession()
  let output = AVCapturePhotoOutput()
  let previewLayer = AVCaptureVideoPreviewLayer()
  @Published var capturedImage: UIImage?
  private let sessionQueue = DispatchQueue(label: "com.nucleum.camera.session", qos: .userInitiated)
  private var isConfigured = false

  override init() {
    super.init()
    checkPermission()
  }
  private func checkPermission() {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      setupSession()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        if granted {
          self.setupSession()
        }
      }
    default:
      Log.error(message: "Camera access denied or restricted")
      break
    }
  }
  private func setupSession() {
    sessionQueue.async {
      self.configure()
    }
  }

  func configure() {
    guard !isConfigured else { return }
    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
      let input = try? AVCaptureDeviceInput(device: device)
    else {
      Log.error(message: "Failed to configure camera input")
      return
    }

    guard session.canAddInput(input), session.canAddOutput(output) else {
      Log.error(message: "Failed to configure camera session")
      return
    }

    session.beginConfiguration()
    session.addInput(input)
    session.addOutput(output)
    session.commitConfiguration()
    isConfigured = true

    DispatchQueue.main.async {
      self.previewLayer.session = self.session
    }
    session.startRunning()
  }

  func restartCapture() {
    DispatchQueue.main.async {
      self.capturedImage = nil
    }
    sessionQueue.async {
      if !self.session.isRunning {
        self.session.startRunning()
      }
    }
  }

  func cleanup() {
    sessionQueue.async {
      if self.session.isRunning {
        self.session.stopRunning()
      }
    }
  }

  func capturePhoto() {
    let settings = AVCapturePhotoSettings()
    output.capturePhoto(with: settings, delegate: self)
  }

}

extension CameraManager: AVCapturePhotoCaptureDelegate {
  func photoOutput(
    _ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?
  ) {
    guard let imageData = photo.fileDataRepresentation(),
      let image = UIImage(data: imageData)
    else { return }

    DispatchQueue.main.async {
      self.capturedImage = image
    }
  }
}

#Preview {
  CameraView()
}
