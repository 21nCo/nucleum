import CoreData
import Foundation

@objc(Job)
public class Job: NSManagedObject {

}

extension Job {
  @nonobjc public class func fetchRequest() -> NSFetchRequest<Job> {
    return NSFetchRequest<Job>(entityName: "Job")
  }

  @NSManaged public var id: String
  @NSManaged public var type: String
  @NSManaged public var status: String
  @NSManaged public var progress: Double
  @NSManaged public var input: Data?
  @NSManaged public var output: Data?
  @NSManaged public var metadata: Data?
  @NSManaged public var createdAt: Date
  @NSManaged public var updatedAt: Date
  @NSManaged public var errorMessage: String?
}

extension Job: Identifiable {

}

public enum JobStatus: String, CaseIterable {
  case pending = "pending"
  case running = "running"
  case completed = "completed"
  case failed = "failed"
  case cancelled = "cancelled"
}

public enum JobType: String, CaseIterable {
  case transcribeAudio = "transcribe_audio"
  case customTask = "custom_task"
}

public struct JobResult {
  public let id: String
  public let status: JobStatus
  public let progress: Double
  public let output: [String: Any]?
  public let errorMessage: String?
  public let createdAt: Date
  public let updatedAt: Date
}

public struct JobMetadata: Codable {
  let jobType: String
  let originalRequestId: String?
  let audioFilePath: String?
  let modelPath: String?
  let retryCount: Int
  let maxRetries: Int

  init(
    jobType: String,
    originalRequestId: String? = nil,
    audioFilePath: String? = nil,
    modelPath: String? = nil,
    retryCount: Int = 0,
    maxRetries: Int = 3
  ) {
    self.jobType = jobType
    self.originalRequestId = originalRequestId
    self.audioFilePath = audioFilePath
    self.modelPath = modelPath
    self.retryCount = retryCount
    self.maxRetries = maxRetries
  }
}
