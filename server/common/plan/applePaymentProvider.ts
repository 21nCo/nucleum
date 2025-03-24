import { default as jwt } from "jsonwebtoken";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, parse } from "path";

export interface AppleVerificationResponse {
  status:
    | "active"
    | "expired"
    | "grace_period"
    | "billing_retry"
    | "revoked"
    | "refunded";
  originalTransactionId?: string;
  expiresDate?: string;
  purchaseDate?: string;
  renewalDate?: string;
  environment: "Production" | "Sandbox";
  lastTransactionId?: string;
  transactionData?: any;
  renewalData?: any;
}

/**
 * Verifies an Apple App Store subscription using the App Store Server API
 * @param transactionId The original transaction id or last transaction id
 * @returns Subscription status information
 */
export async function verifyAppleSubscription(
  transactionId: string
): Promise<AppleVerificationResponse | null> {
  try {
    // Create JWT for authentication with Apple
    const token = createJWT();

    // Apple's environment - production or sandbox
    const environment = process.env.ENV === "dev" ? "Sandbox" : "Production";
    const baseUrl =
      environment === "Production"
        ? "https://api.storekit.apple.com/inApps/v1"
        : "https://api.storekit-sandbox.apple.com/inApps/v1";
    const fallbackBaseUrl =
      environment === "Production"
        ? "https://api.storekit-sandbox.apple.com/inApps/v1"
        : "https://api.storekit.apple.com/inApps/v1";

    // App Store Server API endpoint for subscription status
    const url = `${baseUrl}/subscriptions/${transactionId}`;
    console.log({
      at: "verifyAppleSubscription",
      url,
      transactionId
    });
    let response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      console.error(
        "Apple Subscription Verification Error:",
        url,
        process.env.ENV,
        await response.text()
      );
      const fallbackUrl = `${fallbackBaseUrl}/subscriptions/${transactionId}`;
      console.log({
        at: "verifyAppleSubscription - trying sandbox as fallback",
        fallbackUrl,
        transactionId
      });
      const fallbackResponse = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (fallbackResponse.ok) {
        response = fallbackResponse;
      } else {
        return null;
      }
    }

    const data = await response.json();

    // Save response data to a file
    //saveResponseToFile(data, transactionId);

    // Handle response format with data array containing lastTransactions
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const subscriptionData = data.data[0];

      // Extract transaction information
      if (
        subscriptionData.lastTransactions &&
        Array.isArray(subscriptionData.lastTransactions) &&
        subscriptionData.lastTransactions.length > 0
      ) {
        const transaction = subscriptionData.lastTransactions[0];

        // Parse the signed transaction info if available
        let parsedTransaction = null;
        let parsedRenewalInfo = null;
        if (transaction.signedTransactionInfo) {
          try {
            // Extract the payload part of the JWT (middle section between dots)
            const payloadBase64 =
              transaction.signedTransactionInfo.split(".")[1];
            // Decode the base64 payload
            const decodedPayload = Buffer.from(
              payloadBase64,
              "base64"
            ).toString("utf8");
            parsedTransaction = JSON.parse(decodedPayload);
            // console.log("Parsed transaction:", parsedTransaction);
          } catch (error) {
            console.error("Error parsing signed transaction info:", error);
          }
        }
        if (transaction.signedRenewalInfo) {
          try {
            const payloadBase64 = transaction.signedRenewalInfo.split(".")[1];
            const decodedPayload = Buffer.from(
              payloadBase64,
              "base64"
            ).toString("utf8");
            parsedRenewalInfo = JSON.parse(decodedPayload);
          } catch (error) {
            console.error("Error parsing signed renewal info:", error);
          }
        }
        // saveResponseToFile(
        //   {
        //     transaction,
        //     parsedTransaction,
        //     parsedRenewalInfo
        //   },
        //   transaction.originalTransactionId + "-parsed"
        // );

        // Map to our verification response format
        return {
          status: mapStatusCode(transaction.status),
          originalTransactionId: transaction.originalTransactionId || "",
          purchaseDate: parsedTransaction?.purchaseDate
            ? new Date(parsedTransaction.purchaseDate).toISOString()
            : new Date().toISOString(),
          expiresDate: parsedTransaction?.expiresDate
            ? new Date(parsedTransaction.expiresDate).toISOString()
            : new Date().toISOString(),
          renewalDate: parsedRenewalInfo?.renewalDate
            ? new Date(parsedRenewalInfo.renewalDate).toISOString()
            : null,
          environment: data.environment || environment,
          lastTransactionId: parsedTransaction?.transactionId || "",
          transactionData: parsedTransaction,
          renewalData: parsedRenewalInfo
        };
      }
    }
    // Map Apple's response to our format
    return mapAppleResponseToVerificationResponse(data, environment);
  } catch (error) {
    console.error({
      at: "Error verifying Apple subscription",
      error,
      transactionId
    });
    return null;
  }
}

/**
 * Maps Apple's numeric status codes to our status strings
 */
function mapStatusCode(
  statusCode: number
): AppleVerificationResponse["status"] {
  switch (statusCode) {
    case 1:
      return "active";
    case 2:
      return "expired";
    case 3:
      return "billing_retry";
    case 4:
      return "grace_period";
    case 5:
      return "revoked";
    default:
      return "expired";
  }
}

/**
 * Creates a signed JWT token for Apple App Store API authentication
 */
function createJWT(): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: process.env.APPLE_ISSUER_ID, // Your Apple Developer Account Team ID
    iat: now, // Issued at time
    exp: now + 3600, // Expiration time (1 hour)
    aud: "appstoreconnect-v1", // Audience
    bid: process.env.APPLE_BUNDLE_ID // Your app's bundle ID
  };

  // Private key provided by Apple (from App Store Connect)
  // Store this securely in environment variables or secrets manager
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!privateKey) {
    throw new Error("Apple private key not configured");
  }

  // Create and sign the JWT
  return jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    keyid: process.env.APPLE_KEY_ID // Key ID from App Store Connect
  });
}

/**
 * Maps Apple's response format to our internal verification response format
 */
function mapAppleResponseToVerificationResponse(
  appleResponse: any,
  environment: "Production" | "Sandbox"
): AppleVerificationResponse {
  // Status mapping from Apple to our system
  let status: AppleVerificationResponse["status"] = "expired";

  // Default expiration is set to now
  const now = new Date().toISOString();

  if (appleResponse.status === 1) {
    status = "active";
  } else if (appleResponse.status === 2) {
    status = "expired";
  } else if (appleResponse.status === 3) {
    status = "billing_retry";
  } else if (appleResponse.status === 4) {
    status = "grace_period";
  } else if (appleResponse.status === 5) {
    status = "revoked";
  }

  // Sometimes the expiresDate might be in a nested object
  const expiresDate =
    appleResponse.expiresDate || appleResponse.data?.expiresDate || now;

  return {
    status,
    originalTransactionId: appleResponse.originalTransactionId,
    expiresDate,
    environment,
    lastTransactionId: appleResponse.lastTransactionId
  };
}

/**
 * Handles subscription cancellation
 * Note: Apple doesn't provide a direct API to cancel subscriptions programmatically.
 * Customers must cancel through App Store settings.
 * This function is a placeholder for tracking cancellation requests.
 */
export async function trackSubscriptionCancellation(
  subscriptionId: string
): Promise<boolean> {
  try {
    // Log the cancellation request
    console.log(
      `Cancellation request for Apple subscription: ${subscriptionId}`
    );

    // Here you would typically update your internal records
    // to track that this subscription has been requested for cancellation

    // Get the current status to confirm
    const status = await verifyAppleSubscription(subscriptionId);

    return !!status;
  } catch (error) {
    console.error("Error tracking Apple subscription cancellation:", error);
    return false;
  }
}

/**
 * Handles refund requests
 * Note: Apple doesn't provide an API to issue refunds programmatically.
 * Refunds must be processed through App Store Connect or by the customer through Apple support.
 * This function is a placeholder for tracking refund requests.
 */
export async function trackRefundRequest(
  subscriptionId: string,
  reason?: string
): Promise<boolean> {
  try {
    // Log the refund request
    console.log(
      `Refund request for Apple subscription: ${subscriptionId}, reason: ${
        reason || "Not provided"
      }`
    );

    // Here you would typically update your internal records
    // to track that a refund has been requested for this subscription

    return true;
  } catch (error) {
    console.error("Error tracking Apple refund request:", error);
    return false;
  }
}

/**
 * Saves API response data to a file for debugging
 */
function saveResponseToFile(data: any, transactionId: string): void {
  try {
    // Create a logs directory if it doesn't exist
    const logsDir = join(process.cwd(), "logs", "apple");
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // Create a filename with timestamp and transaction ID
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = join(
      logsDir,
      `apple-response-${timestamp}-${transactionId}.json`
    );

    // Write the data to the file
    writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
    console.log(`Apple API response saved to ${filename}`);
  } catch (error) {
    console.error("Error saving Apple API response to file:", error);
  }
}

/**
 * Gets the latest payment transaction for a subscription using the history endpoint
 * @param transactionId The original transaction id
 * @returns Latest transaction information or null if not found
 */
export async function getLatestSubscriptionPayment(transactionId: string) {
  try {
    // Create JWT for authentication with Apple
    const token = createJWT();

    // Apple's environment - production or sandbox
    const environment = process.env.ENV === "dev" ? "Sandbox" : "Production";
    const baseUrl =
      environment === "Production"
        ? "https://api.storekit.apple.com/inApps/v2"
        : "https://api.storekit-sandbox.apple.com/inApps/v2";

    // App Store Server API endpoint for transaction history
    const url = `${baseUrl}/history/${transactionId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error(
        "Apple Transaction History Error:",
        url,
        process.env.ENV,
        await response.text()
      );
      return null;
    }

    const data = await response.json();

    // Save response data for debugging
    // saveResponseToFile(data, `history-${transactionId}`);

    // Handle response format with signedTransactions array
    if (
      data.signedTransactions &&
      Array.isArray(data.signedTransactions) &&
      data.signedTransactions.length > 0
    ) {
      // Sort transactions by purchase date to get the latest one
      const transactions = data.signedTransactions
        .map((signedTx) => {
          try {
            const payloadBase64 = signedTx.split(".")[1];
            const decodedPayload = Buffer.from(
              payloadBase64,
              "base64"
            ).toString("utf8");
            return JSON.parse(decodedPayload);
          } catch (error) {
            console.error("Error parsing signed transaction:", error);
            return null;
          }
        })
        .filter((tx) => tx !== null);

      // Sort by purchaseDate in descending order
      transactions.sort((a, b) => {
        const dateA = new Date(a.purchaseDate).getTime();
        const dateB = new Date(b.purchaseDate).getTime();
        return dateB - dateA;
      });
      // saveResponseToFile(transactions, `history-transactions-${transactionId}`);
      // Return the latest transaction if available
      if (transactions.length > 0) {
        const latestTransaction = transactions[0];
        return {
          transactionId: latestTransaction.transactionId,
          originalTransactionId: latestTransaction.originalTransactionId,
          purchaseDate: new Date(latestTransaction.purchaseDate).toISOString(),
          expiresDate: latestTransaction.expiresDate
            ? new Date(latestTransaction.expiresDate).toISOString()
            : null,
          productId: latestTransaction.productId,
          webOrderLineItemId: latestTransaction.webOrderLineItemId,
          subscriptionGroupIdentifier:
            latestTransaction.subscriptionGroupIdentifier,
          environment: environment
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting latest subscription payment:", error);
    return null;
  }
}

/**
 * Verifies an Apple App Store non-consumable purchase using the App Store Server API
 * @param transactionId The original transaction id or transaction id
 * @returns Purchase status information
 */
export async function verifyAppleNonConsumablePurchase(
  transactionId: string
): Promise<AppleVerificationResponse | null> {
  try {
    // Create JWT for authentication with Apple
    const token = createJWT();

    // Apple's environment - production or sandbox
    const environment = process.env.ENV === "dev" ? "Sandbox" : "Production";
    const baseUrl =
      environment === "Production"
        ? "https://api.storekit.apple.com/inApps/v2"
        : "https://api.storekit-sandbox.apple.com/inApps/v2";

    // App Store Server API endpoint for transaction history - works for all purchase types
    const url = `${baseUrl}/history/${transactionId}`;
    console.log({
      at: "verifyAppleNonConsumablePurchase",
      url,
      transactionId
    });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      console.error(
        "Apple Non-Consumable Purchase Verification Error:",
        url,
        process.env.ENV,
        await response.text()
      );
      return null;
    }

    const data = await response.json();

    // Save response data for debugging
    saveResponseToFile(data, `non-consumable-${transactionId}`);

    // Handle response format with signedTransactions array
    if (
      data.signedTransactions &&
      Array.isArray(data.signedTransactions) &&
      data.signedTransactions.length > 0
    ) {
      // Parse the transactions
      const transactions = data.signedTransactions
        .map((signedTx) => {
          try {
            const payloadBase64 = signedTx.split(".")[1];
            const decodedPayload = Buffer.from(
              payloadBase64,
              "base64"
            ).toString("utf8");
            return JSON.parse(decodedPayload);
          } catch (error) {
            console.error("Error parsing signed transaction:", error);
            return null;
          }
        })
        .filter((tx) => tx !== null);

      // Sort by purchaseDate in descending order to get the latest
      transactions.sort((a, b) => {
        const dateA = new Date(a.purchaseDate).getTime();
        const dateB = new Date(b.purchaseDate).getTime();
        return dateB - dateA;
      });

      // For non-consumable purchases we just need to verify it exists
      // and hasn't been refunded or revoked
      if (transactions.length > 0) {
        const latestTransaction = transactions[0];

        // Check if the transaction type is non-consumable (inAppOwnershipType: "PURCHASED")
        const isNonConsumable =
          latestTransaction.type === "Non-Consumable" ||
          latestTransaction.inAppOwnershipType === "PURCHASED";

        // If it's not a non-consumable purchase, return null
        if (!isNonConsumable) {
          console.log(
            "Transaction is not a non-consumable purchase:",
            latestTransaction
          );
          return null;
        }

        // Check if the purchase has been revoked or refunded
        const isRevoked = latestTransaction.revocationReason !== undefined;

        return {
          status: isRevoked ? "revoked" : "active",
          originalTransactionId: latestTransaction.originalTransactionId,
          purchaseDate: new Date(latestTransaction.purchaseDate).toISOString(),
          expiresDate: null, // Non-consumable purchases don't expire
          environment: environment,
          lastTransactionId: latestTransaction.transactionId,
          transactionData: latestTransaction
        };
      }
    }

    return null;
  } catch (error) {
    console.error({
      at: "Error verifying Apple non-consumable purchase",
      error,
      transactionId
    });
    return null;
  }
}
