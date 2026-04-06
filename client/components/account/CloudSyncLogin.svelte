<script lang="ts">
  import { page } from "$app/stores";
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import { postMessageToParent } from "@21n/utils/embed.utils";
  import { isValidEmail } from "@21n/shared-utils/text.utils";
  import { onMount } from "svelte";
  import view from "@21n/stores/view.store";
  import { Orientation } from "@21n/types/direction.enum";
  import OAuthOptions from "./OAuthOptions.svelte";
  import { resolveProductConfig } from "@21n/products/product.config";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { authClient } from "./auth";
  import { Size } from "@21n/types/size.enum";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { AlertType } from "@21n/types/notification.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { clientStorage } from "@21n/persistence/persistence.utils";
  import { ClientStorageKey } from "@21n/persistence/persistence.type";
  import { parse } from "@21n/shared-utils/json.utils";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import { detectUserRegion } from "@21n/utils/network.utils";
  import { peformAccountApiCall } from "../network";
  let {
    isSignup = $bindable(false),
    currentProgress = undefined,
    isExpandOAuthButtons = false
  }: {
    isSignup?: boolean;
    currentProgress?: string | undefined;
    isExpandOAuthButtons?: boolean;
  } = $props();
  let passwordMode = $state<"password" | "otp" | "unselected">("unselected");
  let email = $state("");
  let pass = $state("");
  let otp = $state("");
  let error = $state<string | null>(null);
  let info = $state<string | null>(null);
  let isTrusted = $state(true);
  let actionInProgress = $state(false);
  let showPassword = $state(false);
  let userRegionMap = $state<Record<string, string>>({});
  let region = $state("useast");
  const dev_isShowTrustOption = false;
  const oAuthProviders = resolveProductConfig().oAuthProviders;

  export function reset() {
    pass = "";
    otp = "";
    error = null;
    info = null;
    passwordMode = "unselected";
    actionInProgress = false;
  }

  onMount(async () => {
    postMessageToParent(EmbedMessage.MOUNT);
    const isSignupQueryParam = $page.url.searchParams.get("signup");
    if (isSignupQueryParam && isSignupQueryParam === "true") isSignup = true;
    userRegionMap = await resolveUserRegionMap();
    region = await resolveDefaultRegion();
  });

  async function resolveUserRegionMap() {
    return parse(
      (await clientStorage.get(ClientStorageKey.USER_REGION_MAP)) ?? "{}"
    );
  }

  async function resolveDefaultRegion() {
    const cachedRegion = await clientStorage.get(ClientStorageKey.REGION);
    if (cachedRegion) {
      return cachedRegion;
    }

    const detectedRegion = await detectUserRegion();
    await clientStorage.set(ClientStorageKey.REGION, detectedRegion);
    return detectedRegion;
  }

  function resolveMode(
    isLoginFromExtensionParam: boolean,
    isSelfHostedParam: boolean
  ) {
    if (isLoginFromExtensionParam) {
      return "cloud-only";
    } else if (isSelfHostedParam) {
      return "offline-only";
    }
    return "all";
  }

  async function handleClick() {
    if (passwordMode === "unselected") {
      error = "Please select password or OTP.";
      return;
    }
    if (passwordMode === "password" && !isValidFormData()) return;
    if (passwordMode === "otp" && !isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return;
    }
    if (passwordMode === "otp" && !otp) {
      showError("Please enter the OTP code.");
      return;
    }
    actionInProgress = true;
    let response;
    let errorMessage = null;
    const resolvedRegion = userRegionMap[email] ?? region;
    if (isSignup && passwordMode === "password") {
      response = await (
        await authClient({ region: resolvedRegion })
      ).signUp.email(
        {
          email,
          password: pass,
          name: ""
        },
        {
          onError: (error) => {
            errorMessage = error?.error?.message;
          }
        }
      );
    } else if (passwordMode === "password") {
      response = await (
        await authClient({ region: resolvedRegion })
      ).signIn.email(
        {
          email,
          password: pass,
          fetchOptions: {
            // headers: {
            //   // "x-captcha-response": turnstileToken,
            // }
          }
        },
        {
          onError: (error) => {
            errorMessage = error?.error?.message;
          }
        }
      );
    } else if (passwordMode === "otp") {
      response = await (
        await authClient({ region: resolvedRegion })
      ).signIn.emailOtp({
        email,
        otp
      });
    }
    if (!response || response.error) {
      if (response?.error?.details) {
        const errorName = response.error.details.name;
        if (errorName === "RegionMismatchError") {
          const detectedRegion = response.error.details.region;
          if (isSignup) {
            await handleAlreadyExistsCase(detectedRegion);
            return;
          } else {
            errorMessage = null;
            const client = await authClient({ region: detectedRegion });
            if (passwordMode === "password")
              response = await client.signIn.email({
                email,
                password: pass
              });
            else if (passwordMode === "otp")
              response = await client.signIn.emailOtp({
                email,
                otp
              });
          }
        }
      }
      if (!response || response.error || errorMessage) {
        showError(errorMessage);
        actionInProgress = false;
        return;
      }
    }
    const json = response.data;
    //TODO - different error cases - user messages
    if (!json) {
      // if (json > 0) {
      //   showError("User already exists. Please signin instead");
      // } else if (json === 0) {
      //   showError("User not found. Please signup instead.");
      // } else if (json === -1) {
      //   showError("Invalid password.");
      // } else {
      //   showError();
      // }
      showError();
      actionInProgress = false;
      return;
    } else {
      appStore.gotoPath("/");
    }
    //TODO - login from extension case
    // if (isLoginFromExtension) {
    //   postTokenToExtension(json);
    //   appStore.runAction(Action.EXTENSTION_LOGIN);
    // } else await account.signIn(json, { isNewUser: isSignup });
    actionInProgress = false;
  }

  async function handleAlreadyExistsCase(region?: string) {
    const errorMessage = "Account already exists. Please sign in instead";
    if (email && region) await updateUserRegionMap(email, region);
    showError(errorMessage);
    actionInProgress = false;
  }

  async function updateUserRegionMap(email: string, region: string) {
    const map: Record<string, string> = { ...(userRegionMap ?? {}) };
    map[email] = region;
    userRegionMap = { ...map };
    await clientStorage.set(ClientStorageKey.USER_REGION_MAP, map);
  }

  function isValidFormData() {
    if (!email || !pass) {
      showError("Please fill all the fields.");
      return false;
    }
    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return false;
    }
    if (isSignup && !isValidPasswordChoice()) return false;
    return true;
  }
  function isValidPasswordChoice() {
    if (pass.length < 8) {
      showError("Password must be at least 8 characters long.");
      return false;
    }
    if (pass.length > 16) {
      showError("Password must be at most 16 characters long.");
      return false;
    }
    if (!pass.match(/[a-z]/)) {
      showError("Password must contain at least one lowercase letter.");
      return false;
    }
    if (!pass.match(/[A-Z]/)) {
      showError("Password must contain at least one uppercase letter.");
      return false;
    }
    if (!pass.match(/[0-9]/)) {
      showError("Password must contain at least one number.");
      return false;
    }
    if (!pass.match(/[^a-zA-Z0-9]/)) {
      showError("Password must contain at least one special character.");
      return false;
    }
    return true;
  }

  function showError(message: string | null = null) {
    actionInProgress = false;
    info = null;
    error = message ?? "Something went wrong. Please try again later.";
  }

  function showInfo(message: string) {
    actionInProgress = false;
    error = null;
    info = message;
  }

  async function sendOTP() {
    const resolvedRegion = userRegionMap[email] ?? region;
    const { data, error } = await (
      await authClient({ region: resolvedRegion })
    ).emailOtp.sendVerificationOtp({
      email,
      type: "sign-in"
    });
    if (error) {
      showError(error.message);
      return false;
    }
    if (data) {
      showInfo("OTP sent to your email address. Please check your inbox.");
      return true;
    }
    return false;
  }

  async function emailProceedOptionSelection(mode: "password" | "otp") {
    if (!isValidEmail(email)) {
      showError("Please enter a valid email address.");
      return false;
    }

    try {
      const response = await peformAccountApiCall("lookup", { email });
      if (response && response.ok) {
        const json = await response.json();
        if (json.region) {
          updateUserRegionMap(email, json.region);
        }
      }
    } catch (err) {
      console.warn("Region lookup failed, using default region:", err);
    }

    passwordMode = mode;
    if (mode === "otp") await sendOTP();
  }
</script>

<div class="flex flex-col w-80 {$view.scale > 0.6 ? 'gap-10' : 'gap-6'}">
  <div class="flex flex-col gap-2 justify-center items-center">
    <div class="flex flex-col w-full gap-4">
      <div>
        <DropDown
          isDisableSearch={true}
          label={{
            label: "Base region",
            tooltip: {
              body: "We will use this preference to host your data closest to you. This will help us to provide you with the best experience possible."
            }
          }}
          items={[
            {
              value: "useast",
              label: "US region"
            },
            {
              value: "euwest",
              label: "EU region"
            },
            {
              value: "insouth",
              label: "Asia Pacific"
            }
          ]}
          bind:value={region}
        />
      </div>
      <TextInput
        bind:value={email}
        label={{
          label: "Email",
          orientation: Orientation.Vertical
        }}
        placeholder="username@email.com"
      />
      {#if passwordMode === "unselected"}
        <div class="grid grid-cols-2 gap-2 w-full">
          <Button
            size={Size.sm}
            style={ButtonStyle.OUTLINED}
            isExpandToFullWidth={true}
            label={isSignup ? "Create password" : "Enter password"}
            onclick={() => emailProceedOptionSelection("password")}
          />
          <Button
            size={Size.sm}
            style={ButtonStyle.OUTLINED}
            isExpandToFullWidth={true}
            label="Send OTP"
            onclick={() => emailProceedOptionSelection("otp")}
          />
        </div>
      {:else if passwordMode === "password"}
        <TextInput
          bind:value={pass}
          id="password"
          label={{
            label: isSignup ? "Create password" : "Password",
            orientation: Orientation.Vertical,
            tooltip: isSignup
              ? {
                  body: "Password must be 8-16 characters long and contain at least one lowercase letter, one uppercase letter, one number and one special character."
                }
              : undefined
          }}
          type={showPassword ? "text" : "password"}
          placeholder="********"
        >
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            class="flex items-center justify-center"
          >
            <Icon
              icon={showPassword ? "hide" : "show"}
              size={Size.sm}
              class="stroke-fgs3 hover:stroke-fgs2"
            />
          </button>
        </TextInput>
      {:else if passwordMode === "otp"}
        <TextInput
          bind:value={otp}
          id="otp"
          label={{
            label: "OTP",
            orientation: Orientation.Vertical,
            tooltip: isSignup
              ? {
                  body: "OTP will be sent to your email address."
                }
              : undefined
          }}
          placeholder="123456"
        />
      {/if}
      {#if dev_isShowTrustOption}
        <button
          class="flex items-center gap-2 w-full"
          onclick={() => {
            isTrusted = !isTrusted;
          }}
        >
          <input type="checkbox" class="h-4 w-4" bind:checked={isTrusted} />
          <div class="text-fgs3">Trust this device for 30 days</div>
        </button>
      {/if}
      {#if !isSignup}
        <div class="ml-auto text-b3">
          <Button
            style={ButtonStyle.PLAIN}
            size={Size.xs}
            label="Forgot password?"
            onclick={() => {
              appStore.gotoPath("/account/forgot-password");
            }}
          />
        </div>
      {/if}
    </div>
    <div class="py-1">
      <InlineFeedbackText
        isRenderEmptyHeight={true}
        feedback={info ??
          (error ? { type: AlertType.ERROR, message: error } : undefined)}
      />
    </div>
    <Button
      isExpandToFullWidth={true}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.OUTLINED}
      label={isSignup
        ? actionInProgress
          ? "Signing up..."
          : "Sign up with email"
        : actionInProgress
          ? "Signing in..."
          : "Log in"}
      isLoading={actionInProgress}
      onclick={handleClick}
    />
  </div>
  {#if oAuthProviders && oAuthProviders.length > 0}
    <div class="w-full flex justify-center items-center text-fgs3 text-b3 px-4">
      <hr class="grow border-t border-bgs4" />
      <div class="px-2">or</div>
      <hr class="grow border-t border-bgs4" />
    </div>
    <OAuthOptions
      {region}
      providers={oAuthProviders}
      isExpanded={isExpandOAuthButtons}
    />
  {/if}
</div>
