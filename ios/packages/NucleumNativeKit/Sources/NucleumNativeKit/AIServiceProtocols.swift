//
//  AIServiceProtocols.swift
//  Pointron
//
//  Created by Claude on 8/6/25.
//

import Foundation

protocol AudioTranscriptionService {
    func transcribeAudio(request: DataRequest, completion: @escaping (Result<String, Error>) -> Void)
}

protocol ModelDownloadService {
    func isModelDownloaded(modelType: String) -> Bool
    func downloadModel(
        modelType: String,
        progressCallback: @escaping (Double) -> Void,
        completion: @escaping (Result<Void, Error>) -> Void
    )
}

protocol AIServiceProvider: AudioTranscriptionService, ModelDownloadService {
}
