import CoreData
import Foundation

class CoreDataStack {
  static let shared = CoreDataStack()

  private init() {}

  lazy var persistentContainer: NSPersistentContainer = {
    let container = NSPersistentContainer(
      name: "JobDataModel", managedObjectModel: createJobDataModel())
    container.loadPersistentStores { _, error in
      if let error = error {
        Log.error(message: "Core Data error: \(error)")
      }
    }
    return container
  }()

  private func createJobDataModel() -> NSManagedObjectModel {
    let model = NSManagedObjectModel()

    let jobEntity = NSEntityDescription()
    jobEntity.name = "Job"
    jobEntity.managedObjectClassName = NSStringFromClass(Job.self)

    let idAttribute = NSAttributeDescription()
    idAttribute.name = "id"
    idAttribute.attributeType = .stringAttributeType
    idAttribute.isOptional = false

    let typeAttribute = NSAttributeDescription()
    typeAttribute.name = "type"
    typeAttribute.attributeType = .stringAttributeType
    typeAttribute.isOptional = false

    let statusAttribute = NSAttributeDescription()
    statusAttribute.name = "status"
    statusAttribute.attributeType = .stringAttributeType
    statusAttribute.isOptional = false

    let progressAttribute = NSAttributeDescription()
    progressAttribute.name = "progress"
    progressAttribute.attributeType = .doubleAttributeType
    progressAttribute.isOptional = false
    progressAttribute.defaultValue = 0.0

    let inputAttribute = NSAttributeDescription()
    inputAttribute.name = "input"
    inputAttribute.attributeType = .binaryDataAttributeType
    inputAttribute.isOptional = true

    let outputAttribute = NSAttributeDescription()
    outputAttribute.name = "output"
    outputAttribute.attributeType = .binaryDataAttributeType
    outputAttribute.isOptional = true

    let metadataAttribute = NSAttributeDescription()
    metadataAttribute.name = "metadata"
    metadataAttribute.attributeType = .binaryDataAttributeType
    metadataAttribute.isOptional = true

    let createdAtAttribute = NSAttributeDescription()
    createdAtAttribute.name = "createdAt"
    createdAtAttribute.attributeType = .dateAttributeType
    createdAtAttribute.isOptional = false

    let updatedAtAttribute = NSAttributeDescription()
    updatedAtAttribute.name = "updatedAt"
    updatedAtAttribute.attributeType = .dateAttributeType
    updatedAtAttribute.isOptional = false

    let errorMessageAttribute = NSAttributeDescription()
    errorMessageAttribute.name = "errorMessage"
    errorMessageAttribute.attributeType = .stringAttributeType
    errorMessageAttribute.isOptional = true

    jobEntity.properties = [
      idAttribute,
      typeAttribute,
      statusAttribute,
      progressAttribute,
      inputAttribute,
      outputAttribute,
      metadataAttribute,
      createdAtAttribute,
      updatedAtAttribute,
      errorMessageAttribute,
    ]

    model.entities = [jobEntity]

    return model
  }

  var context: NSManagedObjectContext {
    return persistentContainer.viewContext
  }

  func save() {
    let context = persistentContainer.viewContext

    if context.hasChanges {
      do {
        try context.save()
      } catch {
        Log.error(message: "Save error: \(error)")
      }
    }
  }
}
