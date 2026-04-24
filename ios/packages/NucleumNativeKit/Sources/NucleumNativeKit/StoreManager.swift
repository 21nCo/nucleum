import Foundation
import StoreKit

// Structure to hold subscription information
struct SubscriptionInfo {
  let productId: String
  let purchaseDate: Date?
  let expiryDate: Date?
  let isAutoRenewable: Bool
  let transactionId: String
  let originalTransactionId: String?
}

class StoreManager: NSObject {
  static let shared = StoreManager()

  private var products: [SKProduct] = []
  private var productRequest: SKProductsRequest?
  private var purchaseCompletion: ((Bool, Error?, [SubscriptionInfo]?) -> Void)?
  private var restoreCompletion: ((Bool, Error?, [SubscriptionInfo]?) -> Void)?
  private var restoredSubscriptions: [SubscriptionInfo] = []
  private var productRequestCompletion: (([SKProduct]?, Error?) -> Void)?

  private var availableProductIds: Set<String> = []

  private override init() {
    super.init()
    SKPaymentQueue.default().add(self)
  }

  deinit {
    SKPaymentQueue.default().remove(self)
  }

  func fetchProducts(productIds: [String], completion: @escaping ([SKProduct]?, Error?) -> Void) {
    availableProductIds = Set(productIds)
    Log.info("Fetching products: \(productIds)")

    // Store the completion handler
    productRequestCompletion = completion

    let request = SKProductsRequest(productIdentifiers: Set(productIds))
    request.delegate = self

    productRequest = request
    request.start()
  }

  func purchaseProduct(
    productId: String, offerToken: String? = nil,
    completion: @escaping (Bool, Error?, [SubscriptionInfo]?) -> Void
  ) {
    purchaseCompletion = completion
    Log.info("Purchasing product: \(productId)")

    // First check if we already have the product loaded
    if let product = products.first(where: { $0.productIdentifier == productId }) {
      processPurchase(product: product, offerToken: offerToken)
      return
    }

    // If not, fetch it
    fetchProducts(productIds: [productId]) { [weak self] products, error in
      if let error = error {
        completion(false, error, nil)
        return
      }

      guard let products = products, !products.isEmpty else {
        completion(
          false,
          NSError(
            domain: "StoreManager", code: 0,
            userInfo: [NSLocalizedDescriptionKey: "Product not found"]),
          nil)
        return
      }

      self?.processPurchase(product: products[0], offerToken: offerToken)
    }
  }

  // Method to check current subscription status without requiring a restore
  func checkSubscriptionStatus(completion: @escaping ([SubscriptionInfo]?, Error?) -> Void) {
    // This method validates the receipt and returns current subscription information
    // without requiring the user to restore purchases
    validateReceipt(completion: completion)
  }

  func restorePurchases(completion: @escaping (Bool, Error?, [SubscriptionInfo]?) -> Void) {
    restoredSubscriptions = []
    restoreCompletion = completion
    SKPaymentQueue.default().restoreCompletedTransactions()
  }

  private func processPurchase(product: SKProduct, offerToken: String? = nil) {
    if !SKPaymentQueue.canMakePayments() {
      purchaseCompletion?(
        false,
        NSError(
          domain: "StoreManager", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "In-app purchases are disabled"]),
        nil)
      return
    }

    let payment = SKPayment(product: product)

    SKPaymentQueue.default().add(payment)
  }

  // Function to validate receipt and extract subscription details
  func validateReceipt(completion: @escaping ([SubscriptionInfo]?, Error?) -> Void) {
    // Get the receipt URL
    guard let receiptURL = Bundle.main.appStoreReceiptURL else {
      completion(
        nil,
        NSError(
          domain: "StoreManager",
          code: 2,
          userInfo: [NSLocalizedDescriptionKey: "Receipt not found"]
        ))
      return
    }

    // Check if receipt exists
    guard FileManager.default.fileExists(atPath: receiptURL.path) else {
      completion(
        nil,
        NSError(
          domain: "StoreManager",
          code: 3,
          userInfo: [NSLocalizedDescriptionKey: "Receipt file does not exist"]
        ))
      return
    }

    // Read receipt data
    guard let receiptData = try? Data(contentsOf: receiptURL) else {
      completion(
        nil,
        NSError(
          domain: "StoreManager",
          code: 4,
          userInfo: [NSLocalizedDescriptionKey: "Could not read receipt data"]
        ))
      return
    }

    // Base64 encode the receipt data
    let receiptString = receiptData.base64EncodedString()

    // App Store Shared Secret - in a real app, get this from a secure place
    // like keychain or environment variables, not hardcoded
    let sharedSecret = ""  // Your shared secret goes here

    // Create request body
    let requestBody: [String: Any] = [
      "receipt-data": receiptString,
      "password": sharedSecret,
      "exclude-old-transactions": false,
    ]

    // Convert request body to JSON data
    guard let requestData = try? JSONSerialization.data(withJSONObject: requestBody) else {
      completion(
        nil,
        NSError(
          domain: "StoreManager",
          code: 5,
          userInfo: [NSLocalizedDescriptionKey: "Failed to create request data"]
        ))
      return
    }

    // Determine which URL to use based on environment
    // In a production app, you might want to try production first, then fallback to sandbox if needed
    #if DEBUG
      let verifyReceiptURL = URL(string: "https://sandbox.itunes.apple.com/verifyReceipt")!
    #else
      let verifyReceiptURL = URL(string: "https://buy.itunes.apple.com/verifyReceipt")!
    #endif

    // Create the request
    var request = URLRequest(url: verifyReceiptURL)
    request.httpMethod = "POST"
    request.httpBody = requestData
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")

    // Send the request
    let task = URLSession.shared.dataTask(with: request) { (data, response, error) in
      // Check for network errors
      if let error = error {
        DispatchQueue.main.async {
          completion(
            nil,
            NSError(
              domain: "StoreManager",
              code: 6,
              userInfo: [NSLocalizedDescriptionKey: "Network error: \(error.localizedDescription)"]
            ))
        }
        return
      }

      // Check we have data
      guard let data = data else {
        DispatchQueue.main.async {
          completion(
            nil,
            NSError(
              domain: "StoreManager",
              code: 7,
              userInfo: [NSLocalizedDescriptionKey: "No data received from App Store"]
            ))
        }
        return
      }

      // Parse the JSON response
      guard let jsonResponse = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      else {
        DispatchQueue.main.async {
          completion(
            nil,
            NSError(
              domain: "StoreManager",
              code: 8,
              userInfo: [NSLocalizedDescriptionKey: "Failed to parse receipt validation response"]
            ))
        }
        return
      }

      // Check status code
      guard let status = jsonResponse["status"] as? Int else {
        DispatchQueue.main.async {
          completion(
            nil,
            NSError(
              domain: "StoreManager",
              code: 9,
              userInfo: [NSLocalizedDescriptionKey: "Invalid receipt validation response"]
            ))
        }
        return
      }

      // Handle status
      if status != 0 {
        let message: String
        switch status {
        case 21000:
          message = "The App Store could not read the JSON object you provided."
        case 21002:
          message = "The data in the receipt-data property was malformed."
        case 21003:
          message = "The receipt could not be authenticated."
        case 21004:
          message =
            "The shared secret you provided does not match the shared secret on file for your account."
        case 21005:
          message = "The receipt server is not currently available."
        case 21006:
          message = "This receipt is valid but the subscription has expired."
        case 21007:
          message = "This receipt is from the test environment, but sent to production."
        case 21008:
          message = "This receipt is from the production environment, but sent to test."
        default:
          message = "An unknown error occurred."
        }

        // Special case for sandbox receipt sent to production - retry with sandbox URL
        if status == 21007 {
          // Retry with sandbox URL
          let sandboxURL = URL(string: "https://sandbox.itunes.apple.com/verifyReceipt")!
          var sandboxRequest = URLRequest(url: sandboxURL)
          sandboxRequest.httpMethod = "POST"
          sandboxRequest.httpBody = requestData
          sandboxRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")

          let sandboxTask = URLSession.shared.dataTask(with: sandboxRequest) {
            (sandboxData, sandboxResponse, sandboxError) in
            // Process sandbox response
            self.handleReceiptValidationResponse(sandboxData, sandboxError, completion)
          }

          sandboxTask.resume()
          return
        }

        DispatchQueue.main.async {
          completion(
            nil,
            NSError(
              domain: "StoreManager",
              code: status,
              userInfo: [NSLocalizedDescriptionKey: message]
            ))
        }
        return
      }

      self.parseReceiptResponse(jsonResponse, completion: completion)
    }

    task.resume()
  }

  // Helper method to handle receipt validation response
  private func handleReceiptValidationResponse(
    _ data: Data?, _ error: Error?, _ completion: @escaping ([SubscriptionInfo]?, Error?) -> Void
  ) {
    // Check for network errors
    if let error = error {
      DispatchQueue.main.async {
        completion(
          nil,
          NSError(
            domain: "StoreManager",
            code: 6,
            userInfo: [NSLocalizedDescriptionKey: "Network error: \(error.localizedDescription)"]
          ))
      }
      return
    }

    // Check we have data
    guard let data = data else {
      DispatchQueue.main.async {
        completion(
          nil,
          NSError(
            domain: "StoreManager",
            code: 7,
            userInfo: [NSLocalizedDescriptionKey: "No data received from App Store"]
          ))
      }
      return
    }

    // Parse the JSON response
    guard let jsonResponse = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      DispatchQueue.main.async {
        completion(
          nil,
          NSError(
            domain: "StoreManager",
            code: 8,
            userInfo: [NSLocalizedDescriptionKey: "Failed to parse receipt validation response"]
          ))
      }
      return
    }

    self.parseReceiptResponse(jsonResponse, completion: completion)
  }

  // Helper method to parse the receipt response
  private func parseReceiptResponse(
    _ jsonResponse: [String: Any], completion: @escaping ([SubscriptionInfo]?, Error?) -> Void
  ) {
    // Extract receipt info
    guard let receiptInfo = jsonResponse["receipt"] as? [String: Any] else {
      DispatchQueue.main.async {
        completion(
          nil,
          NSError(
            domain: "StoreManager",
            code: 10,
            userInfo: [NSLocalizedDescriptionKey: "No receipt information in response"]
          ))
      }
      return
    }

    // Extract in-app purchases
    guard let inAppPurchases = receiptInfo["in_app"] as? [[String: Any]] else {
      DispatchQueue.main.async {
        completion([], nil)  // No purchases found, but not an error
      }
      return
    }

    // Extract latest receipt info (for subscriptions)
    var latestReceiptInfo: [[String: Any]] = []
    if let lri = jsonResponse["latest_receipt_info"] as? [[String: Any]] {
      latestReceiptInfo = lri
    }

    // Combine in-app purchases with latest receipt info (for a complete picture)
    let allPurchases = inAppPurchases + latestReceiptInfo

    // Process subscriptions - group by product ID and original transaction ID
    var subscriptionsByOriginalID: [String: [SubscriptionInfo]] = [:]

    for purchase in allPurchases {
      guard let productId = purchase["product_id"] as? String,
        let transactionId = purchase["transaction_id"] as? String
      else {
        continue
      }

      let originalTransactionId = purchase["original_transaction_id"] as? String

      // Parse dates
      var purchaseDate: Date? = nil
      if let purchaseDateMs = purchase["purchase_date_ms"] as? String,
        let purchaseDateTimeInterval = Double(purchaseDateMs)  // Convert String to Double directly
      {
        purchaseDate = Date(timeIntervalSince1970: purchaseDateTimeInterval / 1000.0)
      }

      var expiryDate: Date? = nil
      if let expiresDateMs = purchase["expires_date_ms"] as? String,
        let expiryDateTimeInterval = Double(expiresDateMs)  // Convert String to Double directly
      {
        expiryDate = Date(timeIntervalSince1970: expiryDateTimeInterval / 1000.0)
      }

      // Check if auto-renewable
      let isAutoRenewable =
        purchase["is_trial_period"] as? String == "true"
        || (purchase["auto_renew_status"] as? String == "1")

      // Create subscription info
      let subscriptionInfo = SubscriptionInfo(
        productId: productId,
        purchaseDate: purchaseDate,
        expiryDate: expiryDate,
        isAutoRenewable: isAutoRenewable,
        transactionId: transactionId,
        originalTransactionId: originalTransactionId
      )

      // Group by original transaction ID (or use transaction ID if original not available)
      let key = originalTransactionId ?? transactionId
      var existingSubscriptions = subscriptionsByOriginalID[key] ?? []
      existingSubscriptions.append(subscriptionInfo)
      subscriptionsByOriginalID[key] = existingSubscriptions
    }

    // Get the most recent subscription for each original transaction
    var activeSubscriptions: [SubscriptionInfo] = []

    for (_, subscriptions) in subscriptionsByOriginalID {
      // Sort by expiry date, most recent first
      let sortedSubscriptions = subscriptions.sorted { (sub1, sub2) -> Bool in
        guard let expiry1 = sub1.expiryDate else { return false }
        guard let expiry2 = sub2.expiryDate else { return true }
        return expiry1 > expiry2
      }

      // Add the most recent subscription
      if let mostRecent = sortedSubscriptions.first {
        // Only include if it's not expired or if there's no expiry date
        if let expiryDate = mostRecent.expiryDate {
          if expiryDate > Date() {
            activeSubscriptions.append(mostRecent)
          }
        } else {
          // No expiry date means it's a non-consumable purchase
          activeSubscriptions.append(mostRecent)
        }
      }
    }

    // Return active subscriptions
    DispatchQueue.main.async {
      completion(activeSubscriptions, nil)
    }
  }
}

extension StoreManager: SKProductsRequestDelegate {
  func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
    products = response.products  // Replace instead of append to avoid duplicates

    if !response.invalidProductIdentifiers.isEmpty {
      Log.error(message: "Invalid product identifiers: \(response.invalidProductIdentifiers)")
    }

    if request == productRequest {
      productRequest = nil
      productRequestCompletion?(response.products, nil)
      productRequestCompletion = nil
    }
  }

  func request(_ request: SKRequest, didFailWithError error: Error) {
    Log.error(message: "Product request failed: \(error.localizedDescription)")

    if request == productRequest {
      productRequest = nil
      productRequestCompletion?(nil, error)
      productRequestCompletion = nil
    }
  }
}

extension StoreManager: SKPaymentTransactionObserver {
  func paymentQueue(
    _ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]
  ) {
    for transaction in transactions {
      switch transaction.transactionState {
      case .purchased:
        handlePurchasedTransaction(transaction)

      case .failed:
        handleFailedTransaction(transaction)

      case .restored:
        handleRestoredTransaction(transaction)

      case .deferred:
        Log.info("Payment deferred for product: \(transaction.payment.productIdentifier)")

      case .purchasing:
        Log.info("Payment in progress for product: \(transaction.payment.productIdentifier)")

      @unknown default:
        Log.error(message: "Unknown transaction state: \(transaction.transactionState.rawValue)")
      }
    }
  }

  func paymentQueueRestoreCompletedTransactionsFinished(_ queue: SKPaymentQueue) {
    Log.info("Restore completed successfully")
    self.restoreCompletion?(true, nil, restoredSubscriptions)
    self.restoreCompletion = nil
  }

  func paymentQueue(
    _ queue: SKPaymentQueue, restoreCompletedTransactionsFailedWithError error: Error
  ) {
    Log.error(message: "Restore failed: \(error.localizedDescription)")
    restoreCompletion?(false, error, nil)
    restoreCompletion = nil
  }

  private func handlePurchasedTransaction(_ transaction: SKPaymentTransaction) {
    SKPaymentQueue.default().finishTransaction(transaction)

    // Create subscription info from the transaction
    let subscriptionInfo = SubscriptionInfo(
      productId: transaction.payment.productIdentifier,
      purchaseDate: transaction.transactionDate,
      expiryDate: nil,  // Would need receipt validation to get this
      isAutoRenewable: true,  // Assuming subscription is auto-renewable
      transactionId: transaction.transactionIdentifier ?? "",
      originalTransactionId: transaction.original?.transactionIdentifier
    )

    purchaseCompletion?(true, nil, [subscriptionInfo])
    purchaseCompletion = nil

    Log.info("Purchase successful for product: \(transaction.payment.productIdentifier)")
  }

  private func handleFailedTransaction(_ transaction: SKPaymentTransaction) {
    SKPaymentQueue.default().finishTransaction(transaction)

    purchaseCompletion?(false, transaction.error, nil)
    purchaseCompletion = nil

    if let error = transaction.error {
      Log.error(
        message:
          "Purchase failed for product: \(transaction.payment.productIdentifier), error: \(error.localizedDescription)"
      )
    } else {
      Log.error(message: "Purchase failed for product: \(transaction.payment.productIdentifier)")
    }
  }

  private func handleRestoredTransaction(_ transaction: SKPaymentTransaction) {
    SKPaymentQueue.default().finishTransaction(transaction)

    // Collect subscription info from the transaction
    let subscriptionInfo = SubscriptionInfo(
      productId: transaction.payment.productIdentifier,
      purchaseDate: transaction.transactionDate,
      expiryDate: nil,  // Would need receipt validation to get this
      isAutoRenewable: true,  // Assuming subscription is auto-renewable
      transactionId: transaction.transactionIdentifier ?? "",
      originalTransactionId: transaction.original?.transactionIdentifier
    )

    // Store this information to be returned when all restorations are complete
    restoredSubscriptions.append(subscriptionInfo)

    Log.info(
      "Restored purchase for product: \(transaction.payment.productIdentifier), transaction ID: \(transaction.transactionIdentifier ?? "unknown")"
    )
  }
}
