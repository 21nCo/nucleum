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
  @StateObject var cameraManager = CameraManager()

  var body: some View {
    ZStack {
      if let image = cameraManager.capturedImage {
        ImagePreviewView(image: image, cameraManager: cameraManager)
      } else {
        CameraPreview(cameraManager: cameraManager)
          .onAppear {
            cameraManager.configure()
          }
        CaptureButton(cameraManager: cameraManager)
      }
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
        cameraManager.capturedImage = nil
        cameraManager.session.startRunning()
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
    let view = UIView(frame: UIScreen.main.bounds)
    cameraManager.previewLayer.frame = view.frame
    view.layer.addSublayer(cameraManager.previewLayer)
    return view
  }

  func updateUIView(_ uiView: UIView, context: Context) {}
}

class CameraManager: NSObject, ObservableObject {
  let session = AVCaptureSession()
  let output = AVCapturePhotoOutput()
  let previewLayer = AVCaptureVideoPreviewLayer()
  @Published var capturedImage: UIImage?

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
      // Handle denied access
      break
    }
  }
  private func setupSession() {
    DispatchQueue.global(qos: .userInitiated).async {
      self.configure()
    }
  }

  func configure() {
    guard
      let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
      let input = try? AVCaptureDeviceInput(device: device)
    else { return }

    if session.canAddInput(input) && session.canAddOutput(output) {
      session.addInput(input)
      session.addOutput(output)
      DispatchQueue.main.async {
        self.previewLayer.session = self.session
      }
      session.startRunning()
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

    self.capturedImage = image
  }
}

#Preview {
  CameraView()
}
