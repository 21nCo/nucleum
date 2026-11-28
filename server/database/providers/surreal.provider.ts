import {
  IDatabaseProvider,
  UserCreateData,
  GuestCreateData,
  UserPlanCreateData,
  SubscriptionCreateData,
  IProductConfig,
  ICreateUserIfNotExistsResponse
} from "./types";
import {
  Agent,
  CONTEXT,
  IActivity
} from "$lib/server/common/account/account.type";
import { DatabaseError } from "$lib/server/common/errors";
import { isValidString } from "$lib/shared/utils/text.utils";
import {
  assertIdentifier,
  decodeLegacyStringLiteral,
  performQueryOnMasterDb,
  performQueryOnRegionalDb,
  userRecord
} from "$lib/server/surrealHelpers";
import { performQueryOnBehalfOfUser } from "$lib/server/common/user/user";
import { resolvePlanQuery } from "$lib/server/common/plan/plan.utils";
import { SyncProvider } from "$lib/server/common/sync/providers";

export class SurrealDatabaseProvider implements IDatabaseProvider {
  private isSurrealSyncProvider: boolean;
  constructor() {
    this.isSurrealSyncProvider =
      process.env.SYNC_PROVIDER?.toLowerCase() === SyncProvider.SURREAL;
  }
  /**
   * Logs user activity with timestamp and context
   * @param userId - The ID of the user performing the activity
   * @param context - The context object containing activity details
   * @returns Promise resolving to the query result
   */
  async log(userId: string, context: IActivity): Promise<any> {
    const timestamp = new Date().toISOString();
    const query = `select id from type::record($user); create activity set userId = type::record($user), timestamp = $timestamp, context = $context, activity = $activity;`;
    return performQueryOnMasterDb(query, {
      user: userRecord(userId),
      timestamp,
      context,
      activity: context.activity ?? "unknown"
    });
  }

  /**
   * Creates a new user with the provided user data
   * @param userData - The user creation data including email, password, and profile information
   * @returns Promise resolving to the created user or existing user information
   */
  async createUserIfNotExists(
    userData: UserCreateData
  ): Promise<ICreateUserIfNotExistsResponse> {
    let query: string;
    const {
      email,
      password,
      nickName,
      profilePictureUrl,
      guestId,
      context,
      emailParts,
      joinDate,
      oAuthId,
      isOAuth
    } = userData;
    const vars = {
      email,
      password,
      guestId,
      emailParts,
      nickName,
      oAuthId,
      profilePictureUrl,
      joinDate,
      context
    };
    if (isOAuth) {
      query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5($email); IF count($user) == 0 THEN (CREATE type::thing("user", $guestId) SET emailhash = crypto::md5($email), emailParts = $emailParts, nickName = $nickName, oAuthId = $oAuthId, isOAuth = true, profilePictureUrl = $profilePictureUrl, joinDate = $joinDate, context = $context) ELSE (RETURN {userCount: count($user), user: $user}) END`;
    } else {
      query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5($email); IF count($user) == 0 THEN (CREATE type::thing("user", $guestId) SET emailhash = crypto::md5($email), pass = crypto::argon2::generate($password), passhash = crypto::md5($password), passVersion = 2, emailParts = $emailParts, nickName = $nickName, profilePictureUrl = $profilePictureUrl, joinDate = $joinDate, context = $context) ELSE (RETURN {userCount: count($user), user: $user}) END`;
    }
    const response = await performQueryOnMasterDb(query, vars);
    if (response?.[1]?.result && response[1].result.userCount === undefined) {
      return {
        user: response[1].result[0]
      };
    } else if (response?.[1].result.userCount === 1) {
      return {
        user: response[1].result.user[0],
        existingUserCount: 1
      };
    } else {
      return {
        user: null,
        existingUserCount: response[1].result.userCount
      };
    }
  }

  async initializeUserDb(
    id: string,
    params: { scope: CONTEXT; host: string; region?: string }
  ): Promise<any> {
    const userDbInitializeResponse = await this.initializeDatabase(id, {
      scope: CONTEXT.USER,
      host: params.host,
      region: params.region
    });
    console.log("user db initialize response", {
      userDbInitializeResponse
    });
    return userDbInitializeResponse;
  }

  /**
   * Initializes the database and definitions for a user account
   * @param id id of the resource that needs to be initialized - can be a user database or space database requested by the user
   * @param host
   * @returns
   */
  async initializeDatabase(
    id: string,
    params: { scope: CONTEXT; host: string; region?: string }
  ) {
    if (!this.isSurrealSyncProvider) {
      return;
    }
    const ns =
      params.scope === CONTEXT.USER
        ? process.env.USER_NS ?? "user"
        : process.env.SPACE_NS ?? "space";
    // let query = `USE NAMESPACE ${ns}; DEFINE DATABASE ${id}; USE DATABASE ${id}; DEFINE TOKEN ${process.env.TOKEN_NAME} ON DB TYPE RS384 VALUE "${process.env.TOKEN_PUBLIC_KEY}";`;
    let query = `USE NAMESPACE ${assertIdentifier(ns, "namespace")}; DEFINE DATABASE ${assertIdentifier(id, "database")};`;
    const dbCreationResponse = await performQueryOnRegionalDb(query, {
      region: params.region,
      db: id,
      context: params.scope
    });
    return dbCreationResponse;
  }

  /**
   * Retrieves a user by their email address
   * @param email - The email address to search for
   * @returns Promise resolving to the user data if found
   */
  async getUserByEmail(email: string): Promise<any> {
    const query = `SELECT * FROM user WHERE emailhash = crypto::md5($email)`;
    return performQueryOnMasterDb(query, { email });
  }

  /**
   * Retrieves a user by their unique ID
   * @param userId - The unique identifier of the user
   * @returns Promise resolving to the user data if found
   */
  async getUserById(userId: string): Promise<any> {
    const query = `LET $user = SELECT * FROM user WHERE meta::id(id) is $userId; IF count($user) == 1 THEN (SELECT * FROM $user) ELSE (RETURN count($user)) END`;
    const result = await performQueryOnMasterDb(query, { userId });
    if (result?.[1]?.result?.[0]) {
      return result[1].result[0];
    } else {
      return result?.[1]?.result;
    }
  }

  /**
   * Updates user information with the provided updates
   * @param userId - The ID of the user to update
   * @param updates - Object containing the fields to update
   * @returns Promise resolving to the updated user data
   */
  async bootstrapUser(userId: string, updates: any): Promise<any> {
    const query = `update type::record($user) set region = $region, userPlan = type::thing("userPlan", $userPlanId), isBootstrapped = true; select context.guest.* as guest from type::record($user);`;
    const response = await performQueryOnMasterDb(query, {
      user: userRecord(userId),
      region: updates.region,
      userPlanId: updates.userPlanId
    });
    console.log("bootstrap response", { response: JSON.stringify(response) });
    if (!response) throw new DatabaseError("Bootstrapping failed");
    const userInfo = response[0].result[0];
    const tzInfo = response[1]?.result?.[0]?.guest?.context?.timezone;
    console.log("tzInfo", tzInfo);
    if (tzInfo) {
      try {
        const tzQuery = `create tz set date = $date, offset = $offset, label = $label;`;
        const tzResponse = await performQueryOnBehalfOfUser(
          tzQuery,
          {
            db: userId,
            context: CONTEXT.USER,
            id: userId,
            region: updates.region
          },
          {
            date: new Date(Date.UTC(1970, 0, 1)).toISOString(),
            offset: tzInfo.offset,
            label: tzInfo.label
          }
        );
        console.log("tzResponse", tzResponse);
      } catch (e) {
        console.error("Error setting timezone", e);
      }
    }
    return userInfo;
  }

  /**
   * Deletes a user from the database
   * @param userId - The ID of the user to delete
   * @returns Promise resolving to the deletion result
   */
  async deleteUser(agent: Agent): Promise<any> {
    const query = `DELETE user WHERE meta::id(id) = $userId;`;
    if (this.isSurrealSyncProvider) {
      const dbRemovalQuery = `USE NAMESPACE ${assertIdentifier(process.env.USER_NS ?? "user", "namespace")}; REMOVE DATABASE ${assertIdentifier(agent.id, "database")};`;
      await performQueryOnRegionalDb(dbRemovalQuery, {
        region: agent.region,
        db: agent.id
      });
    }
    return performQueryOnMasterDb(query, { userId: agent.id });
  }

  /**
   * Authenticates a user with email and password
   * @param email - The user's email address
   * @param password - The user's password
   * @returns Promise resolving to the user data if authentication succeeds, or error code if it fails
   */
  async authenticateUser(email: string, password: string): Promise<any> {
    const query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5($email); IF count($user) == 1 AND crypto::argon2::compare($user[0].pass, $password) THEN (SELECT * FROM $user) ELSE IF count($user) == 1 THEN (RETURN -1) ELSE (RETURN count($user)) END`;
    const result = await performQueryOnMasterDb(query, { email, password });
    const outcome = result?.[1]?.result?.[0] ?? result[1].result;
    if (outcome?.id && outcome.passVersion === undefined) {
      await performQueryOnMasterDb(
        `UPDATE type::record($id) SET passVersion = 2 WHERE passVersion IS NONE`,
        { id: outcome.id }
      );
    }
    if (outcome !== -1) return outcome;
    return this.authenticateLegacyPassword(email, password, outcome);
  }

  /**
   * Passwords used to be pasted into a SurrealQL string literal, so a hash
   * stored before `passVersion` 2 may be of the escape-decoded password. For
   * those accounts only, accept the decoded form once and, in the same
   * statement, store a hash of the password as typed and mark it version 2.
   */
  private async authenticateLegacyPassword(
    email: string,
    password: string,
    outcome: unknown
  ) {
    const legacy = decodeLegacyStringLiteral(password);
    if (legacy === undefined || legacy === password) return outcome;
    const query = `LET $user = SELECT * FROM user WHERE emailhash = crypto::md5($email) AND passVersion IS NONE; IF count($user) == 1 AND crypto::argon2::compare($user[0].pass, $legacy) THEN (UPDATE $user[0].id SET pass = crypto::argon2::generate($password), passhash = crypto::md5($password), passVersion = 2 WHERE passVersion IS NONE RETURN AFTER) ELSE (RETURN -1) END`;
    const result = await performQueryOnMasterDb(query, {
      email,
      legacy,
      password
    });
    return result?.[1]?.result?.[0] ?? outcome;
  }

  /**
   * Checks if an email is on the beta list for a specific app
   * @param email - The email address to check
   * @param app - The app/product name to check against
   * @returns Promise resolving to beta list entry if found
   */
  async checkBetaList(email: string, app: string): Promise<any> {
    const query = `SELECT * from betaList where email is $email and product is $app`;
    const result = await performQueryOnMasterDb(query, { email, app });
    return result?.[0]?.result;
  }

  /**
   * Creates a new guest record with visit tracking
   * @param guestData - The guest creation data including ID, timestamp, and context
   * @returns Promise resolving to the created guest record
   */
  async createGuest(guestData: GuestCreateData): Promise<any> {
    const query = `create type::thing("guest", $id) set timestamp = $timestamp, context = $context; create activity set userId = $guestUserId, timestamp = $timestamp, context = $activityContext, activity = "guest-visit";`;
    const id = guestData.id;
    return performQueryOnMasterDb(query, {
      id,
      guestUserId: `guest:${id}`,
      timestamp: guestData.timestamp,
      context: guestData.context,
      activityContext: { ...guestData.context, activity: "guest-visit" }
    });
  }

  /**
   * Creates a new user plan subscription
   * @param planData - The plan data including user ID, plan type, trial info, and discounts
   * @returns Promise resolving to the created user plan
   */
  async createUserPlan(planData: UserPlanCreateData): Promise<any> {
    const query = `create userPlan content { id: type::thing("userPlan", $id), userId: type::record($user), plan: $plan, trialPlan: $trialPlan, discount: $discount }`;
    return performQueryOnMasterDb(query, {
      id: planData.id,
      user: userRecord(planData.userId),
      plan: planData.plan,
      trialPlan: planData.trialPlan,
      discount: planData.discount
    });
  }

  /**
   * Retrieves the user plan for a specific user
   * @param userId - The ID of the user whose plan to retrieve
   * @returns Promise resolving to the user's plan information
   */
  async getUserAndPlan(userId: string): Promise<any> {
    const result = await performQueryOnMasterDb(...resolvePlanQuery(userId));
    if (result?.[0]?.result?.[0]) {
      return result[0].result;
    } else {
      return result?.[0]?.result;
    }
  }

  /**
   * Retrieves configuration for a specific product
   * @param productId - The ID of the product to get configuration for
   * @returns Promise resolving to the product configuration
   */
  async getProductConfig(
    productId: string
  ): Promise<IProductConfig | undefined> {
    const query = `select * from type::thing("product", $productId)`;
    const result = await performQueryOnMasterDb(query, { productId });
    return result?.[0]?.result?.[0];
  }

  /**
   * Creates a new subscription for a user to a product
   * @param subscriptionData - The subscription data including email, product ID, and context
   * @returns Promise resolving to the created subscription or error if product not found
   */
  async createSubscription(
    subscriptionData: SubscriptionCreateData
  ): Promise<any> {
    const userResponseQuery = `select value meta::id(id) from user where email = $email or emailhash = crypto::md5($email); select value meta::id(id) from product where urls.landing = $app;`;
    const userResponse = await performQueryOnMasterDb(userResponseQuery, {
      email: subscriptionData.email,
      app: subscriptionData.app
    });

    if (userResponse[1].result.length < 1) {
      return { error: "Product not found" };
    }

    let createQuery = "";
    if (userResponse[0].result.length > 0) {
      let userId = userResponse[0].result[0];
      createQuery = `let $product = type::thing("product", $productId); let $existing = type::thing("user", $userId); relate $product->subscribedBy->$existing set context = $context, subscribedAt = time::now();`;
    } else {
      createQuery = `let $product = type::thing("product", $productId); let $user = create user set createdAt = time::now(), email = $email; relate $product->subscribedBy->$user set context = $context, subscribedAt = time::now();`;
    }

    const response = await performQueryOnMasterDb(createQuery, {
      productId: subscriptionData.productId,
      userId: userResponse[0].result[0],
      email: subscriptionData.email,
      context: subscriptionData.context
    });
    return Array.isArray(response) ? response.slice(-1) : response;
  }

  /**
   * Creates a new space for a user
   * @param name - The name of the space to create
   * @param userId - The ID of the user who owns the space
   * @returns Promise resolving to the created space
   */
  async createSpace(name: string, userId: string): Promise<any> {
    const query = `return fn::admin::space::create($name, $user)`;
    return performQueryOnMasterDb(query, { name, user: `user:${userId}` });
  }

  /**
   * Retrieves a specific user's information within a space
   * @param spaceId - The ID of the space
   * @param userId - The ID of the user to fetch
   * @returns Promise resolving to the user's space information
   */
  async getSpaceUser(spaceId: string, userId: string): Promise<any> {
    const query = `return fn::admin::space::fetchUser($space, $user)`;
    return performQueryOnMasterDb(query, {
      space: `space:${spaceId}`,
      user: `user:${userId}`
    });
  }

  /**
   * Retrieves all spaces associated with a user
   * @param userId - The ID of the user whose spaces to retrieve
   * @returns Promise resolving to the user's spaces
   */
  async getUserSpaces(userId: string): Promise<any> {
    const query = `return fn::admin::user::fetchSpaces($user)`;
    return performQueryOnMasterDb(query, { user: `user:${userId}` });
  }

  /**
   * Retrieves database definitions for an app with changes since a specific ID
   * @param app - The application name
   * @param lastChangeId - The last change ID to fetch updates from
   * @returns Promise resolving to the database definitions
   */
  async getDbDefinitions(app: string, lastChangeId: number): Promise<any> {
    const query = `return fn::admin::dbo::fetchAll($app, $lastChangeId)`;
    return performQueryOnMasterDb(query, {
      app: app.toLowerCase(),
      lastChangeId
    });
  }
}
