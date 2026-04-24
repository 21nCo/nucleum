import BackgroundTasks
import CoreData
import Foundation

#if os(iOS)
  import UIKit
#elseif os(macOS)
  import AppKit
#endif

public protocol JobManagerDelegate: AnyObject {
  func jobDidUpdateProgress(_ jobId: String, progress: Double)
  func jobDidComplete(_ jobId: String, result: JobResult)
  func jobDidFail(_ jobId: String, error: Error)
}

public class JobManager: NSObject, ObservableObject {
  static let shared = JobManager()

  weak var delegate: JobManagerDelegate?
  private let coreDataStack = CoreDataStack.shared
  private var backgroundTasks: [String: URLSessionTask] = [:]
  private let backgroundQueue = DispatchQueue(label: "com.memotron.jobmanager", qos: .background)

  private var aiServiceProvider: AIServiceProvider?

  private override init() {
    super.init()
    setupNotifications()
    resumeIncompleteJobs()
  }

  func setAIServiceProvider(_ provider: AIServiceProvider) {
    self.aiServiceProvider = provider
  }

  private func setupNotifications() {
    #if os(iOS)
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(appWillTerminate),
        name: UIApplication.willTerminateNotification,
        object: nil
      )
    #elseif os(macOS)
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(appWillTerminate),
        name: NSApplication.willTerminateNotification,
        object: nil
      )
    #endif
  }

  @objc private func appWillTerminate() {
    pauseAllRunningJobs()
  }

  public func createJob(
    type: JobType,
    input: [String: Any],
    metadata: JobMetadata? = nil
  ) -> String {
    let jobId = UUID().uuidString
    let now = Date()

    let context = coreDataStack.context
    let job = Job(context: context)
    job.id = jobId
    job.type = type.rawValue
    job.status = JobStatus.pending.rawValue
    job.progress = 0.0
    job.createdAt = now
    job.updatedAt = now

    if let inputData = try? JSONSerialization.data(withJSONObject: input) {
      job.input = inputData
    }

    if let metadata = metadata,
      let metadataData = try? JSONEncoder().encode(metadata)
    {
      job.metadata = metadataData
    }

    coreDataStack.save()

    Log.info("Created job with ID: \(jobId) of type: \(type.rawValue)")
    return jobId
  }

  public func startJob(_ jobId: String) {
    guard let job = fetchJob(jobId) else {
      Log.error(message: "Job not found: \(jobId)")
      return
    }

    updateJobStatus(jobId, status: .running)

    backgroundQueue.async { [weak self] in
      self?.executeJob(job)
    }
  }

  public func getJobResult(_ jobId: String) -> JobResult? {
    guard let job = fetchJob(jobId) else {
      return nil
    }

    let output: [String: Any]?
    if let outputData = job.output {
      output = try? JSONSerialization.jsonObject(with: outputData) as? [String: Any]
    } else {
      output = nil
    }

    return JobResult(
      id: job.id,
      status: JobStatus(rawValue: job.status) ?? .pending,
      progress: job.progress,
      output: output,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    )
  }

  public func cancelJob(_ jobId: String) {
    if let task = backgroundTasks[jobId] {
      task.cancel()
      backgroundTasks.removeValue(forKey: jobId)
    }

    updateJobStatus(jobId, status: .cancelled)
    Log.info("Cancelled job: \(jobId)")
  }

  private func fetchJob(_ jobId: String) -> Job? {
    let context = coreDataStack.context
    let request: NSFetchRequest<Job> = Job.fetchRequest()
    request.predicate = NSPredicate(format: "id == %@", jobId)

    do {
      let jobs = try context.fetch(request)
      return jobs.first
    } catch {
      Log.error(message: "Failed to fetch job: \(error)")
      return nil
    }
  }

  private func updateJobStatus(_ jobId: String, status: JobStatus) {
    guard let job = fetchJob(jobId) else { return }

    job.status = status.rawValue
    job.updatedAt = Date()
    coreDataStack.save()

    DispatchQueue.main.async { [weak self] in
      if let result = self?.getJobResult(jobId) {
        if status == .completed {
          self?.delegate?.jobDidComplete(jobId, result: result)
        } else if status == .failed {
          let error = NSError(
            domain: "JobManager",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: job.errorMessage ?? "Job failed"]
          )
          self?.delegate?.jobDidFail(jobId, error: error)
        }
      }
    }
  }

  private func updateJobProgress(_ jobId: String, progress: Double) {
    guard let job = fetchJob(jobId) else { return }

    job.progress = progress
    job.updatedAt = Date()
    coreDataStack.save()

    DispatchQueue.main.async { [weak self] in
      self?.delegate?.jobDidUpdateProgress(jobId, progress: progress)
    }
  }

  private func setJobOutput(_ jobId: String, output: [String: Any]) {
    guard let job = fetchJob(jobId) else { return }

    if let outputData = try? JSONSerialization.data(withJSONObject: output) {
      job.output = outputData
      job.updatedAt = Date()
      coreDataStack.save()
    }
  }

  private func setJobError(_ jobId: String, error: String) {
    guard let job = fetchJob(jobId) else { return }

    job.errorMessage = error
    job.updatedAt = Date()
    coreDataStack.save()
  }

  private func executeJob(_ job: Job) {
    guard let jobType = JobType(rawValue: job.type) else {
      setJobError(job.id, error: "Unknown job type: \(job.type)")
      updateJobStatus(job.id, status: .failed)
      return
    }

    switch jobType {
    case .transcribeAudio:
      executeTranscriptionJob(job)
    case .customTask:
      executeCustomTask(job)
    }
  }

  private func executeTranscriptionJob(_ job: Job) {
    guard let aiServiceProvider = self.aiServiceProvider else {
      setJobError(job.id, error: "AIService not available")
      updateJobStatus(job.id, status: .failed)
      return
    }

    guard let inputData = job.input,
      let input = try? JSONSerialization.jsonObject(with: inputData) as? [String: Any]
    else {
      setJobError(job.id, error: "Invalid input data")
      updateJobStatus(job.id, status: .failed)
      return
    }

    let dataRequest = DataRequest(
      id: job.id,
      type: IncomingMessage.TRANSCRIBE_AUDIO,
      body: input.mapValues { AnyCodable($0) }
    )

    updateJobProgress(job.id, progress: 0.1)

    aiServiceProvider.transcribeAudio(request: dataRequest) { [weak self] result in
      switch result {
      case .success(let transcription):
        self?.setJobOutput(job.id, output: ["transcription": transcription])
        self?.updateJobProgress(job.id, progress: 1.0)
        self?.updateJobStatus(job.id, status: .completed)

      case .failure(let error):
        self?.setJobError(job.id, error: error.localizedDescription)
        self?.updateJobStatus(job.id, status: .failed)
      }
    }
  }

  private func executeCustomTask(_ job: Job) {
    updateJobProgress(job.id, progress: 0.5)

    DispatchQueue.global().asyncAfter(deadline: .now() + 2.0) { [weak self] in
      self?.setJobOutput(job.id, output: ["result": "Custom task completed"])
      self?.updateJobProgress(job.id, progress: 1.0)
      self?.updateJobStatus(job.id, status: .completed)
    }
  }

  private func resumeIncompleteJobs() {
    let context = coreDataStack.context
    let request: NSFetchRequest<Job> = Job.fetchRequest()
    request.predicate = NSPredicate(
      format: "status IN %@", [JobStatus.pending.rawValue, JobStatus.running.rawValue])

    do {
      let incompleteJobs = try context.fetch(request)
      Log.info("Found \(incompleteJobs.count) incomplete jobs to resume")

      for job in incompleteJobs {
        if let metadata = job.metadata,
          let jobMetadata = try? JSONDecoder().decode(JobMetadata.self, from: metadata)
        {

          if jobMetadata.retryCount < jobMetadata.maxRetries {
            Log.info("Resuming job: \(job.id)")
            job.status = JobStatus.pending.rawValue

            let updatedMetadata = JobMetadata(
              jobType: jobMetadata.jobType,
              originalRequestId: jobMetadata.originalRequestId,
              audioFilePath: jobMetadata.audioFilePath,
              modelPath: jobMetadata.modelPath,
              retryCount: jobMetadata.retryCount + 1,
              maxRetries: jobMetadata.maxRetries
            )

            if let metadataData = try? JSONEncoder().encode(updatedMetadata) {
              job.metadata = metadataData
            }

            startJob(job.id)
          } else {
            Log.info("Max retries exceeded for job: \(job.id)")
            job.status = JobStatus.failed.rawValue
            job.errorMessage = "Max retries exceeded"
          }
        } else {
          job.status = JobStatus.failed.rawValue
          job.errorMessage = "Invalid metadata"
        }
      }

      coreDataStack.save()
    } catch {
      Log.error(message: "Failed to fetch incomplete jobs: \(error)")
    }
  }

  private func pauseAllRunningJobs() {
    let context = coreDataStack.context
    let request: NSFetchRequest<Job> = Job.fetchRequest()
    request.predicate = NSPredicate(format: "status == %@", JobStatus.running.rawValue)

    do {
      let runningJobs = try context.fetch(request)
      for job in runningJobs {
        job.status = JobStatus.pending.rawValue
        Log.info("Paused job for restart: \(job.id)")
      }
      coreDataStack.save()
    } catch {
      Log.error(message: "Failed to pause running jobs: \(error)")
    }

    for (_, task) in backgroundTasks {
      task.cancel()
    }
    backgroundTasks.removeAll()
  }

  public func cleanupOldJobs(olderThan days: Int = 30) {
    let context = coreDataStack.context
    let cutoffDate = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()

    let request: NSFetchRequest<Job> = Job.fetchRequest()
    request.predicate = NSPredicate(
      format: "createdAt < %@ AND status IN %@",
      cutoffDate as NSDate,
      [JobStatus.completed.rawValue, JobStatus.failed.rawValue, JobStatus.cancelled.rawValue])

    do {
      let oldJobs = try context.fetch(request)
      for job in oldJobs {
        context.delete(job)
      }
      coreDataStack.save()
      Log.info("Cleaned up \(oldJobs.count) old jobs")
    } catch {
      Log.error(message: "Failed to cleanup old jobs: \(error)")
    }
  }
}
