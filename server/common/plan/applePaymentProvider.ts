import { default as jwt } from "jsonwebtoken";

interface VerificationResponse {
  status:
    | "active"
    | "expired"
    | "grace_period"
    | "billing_retry"
    | "revoked"
    | "refunded";
  originalTransactionId?: string;
  expiresDate?: string;
  environment: "Production" | "Sandbox";
  lastTransactionId?: string;
}

/**
 * Verifies an Apple App Store subscription using the App Store Server API
 * @param subscriptionId The original transaction id or last transaction id
 * @returns Subscription status information
 */
export async function verifyAppleSubscription(
  transactionId: string
): Promise<VerificationResponse | null> {
  try {
    // Create JWT for authentication with Apple
    const token = createJWT();

    // Apple's environment - production or sandbox
    const environment =
      process.env.NODE_ENV === "dev" ? "Sandbox" : "Production";
    const baseUrl =
      environment === "Production"
        ? "https://api.storekit.apple.com/inApps/v1"
        : "https://api.storekit-sandbox.apple.com/inApps/v1";

    // App Store Server API endpoint for subscription status
    const url = `${baseUrl}/subscriptions/${transactionId}`;

    const response = await fetch(url, {
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
        process.env.NODE_ENV,
        process.env,
        await response.text()
      );
      return null;
    }

    const data = await response.json();
    console.log({
      responseData: JSON.stringify(data, null, 2)
    });

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

        // Map to our verification response format
        return {
          status: mapStatusCode(transaction.status),
          originalTransactionId: transaction.originalTransactionId || "",
          expiresDate: parsedTransaction?.expiresDate
            ? new Date(parsedTransaction.expiresDate).toISOString()
            : new Date().toISOString(),
          environment: data.environment || environment,
          lastTransactionId: parsedTransaction?.transactionId || ""
        };
      }
    }
    // Map Apple's response to our format
    return mapAppleResponseToVerificationResponse(data, environment);
  } catch (error) {
    console.error("Error verifying Apple subscription:", error);
    return null;
  }
}

/**
 * Maps Apple's numeric status codes to our status strings
 */
function mapStatusCode(statusCode: number): VerificationResponse["status"] {
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
): VerificationResponse {
  // Status mapping from Apple to our system
  let status: VerificationResponse["status"] = "expired";

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
