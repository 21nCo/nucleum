<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Orientation } from "@21n/types/direction.enum";
  import { AlertType } from "@21n/types/notification.type";
  import { Size } from "@21n/types/size.enum";
  import { isValidEmail } from "@21n/shared-utils/text.utils";
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import { authClient } from "./auth";
  import Icon from "@21n/elements/Icon.svelte";

  let email = "";
  let otp = "";
  let newPassword = "";
  let confirmPassword = "";
  let error: string | null = null;
  let info: string | null = null;
  let actionInProgress = false;
  let step: "email" | "otp" | "password" = "email";
  let showNewPassword = false;
  let showConfirmPassword = false;

  $: inlineFeedback = info
    ? { type: AlertType.SUCCESS, message: info }
    : error
      ? { type: AlertType.ERROR, message: error }
      : undefined;

  $: trimmedEmail = email.trim();

  function clearFeedback() {
    error = null;
    info = null;
  }

  async function handleSendOTP(event?: Event) {
    event?.preventDefault();
    if (actionInProgress) return;

    clearFeedback();

    if (!trimmedEmail) {
      error = "Please enter your email address.";
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      error = "Please enter a valid email address.";
      return;
    }

    actionInProgress = true;
    try {
      const { data, error: otpError } = await (
        await authClient()
      ).forgetPassword.emailOtp({
        email: trimmedEmail
      });

      if (otpError) {
        error = otpError.message ?? "Failed to send OTP. Please try again.";
        return;
      }

      if (data) {
        info = "OTP sent to your email address. Please check your inbox.";
        step = "otp";
      }
    } catch (err) {
      console.error("Error sending OTP:", err);
      error = "Something went wrong. Please try again.";
    } finally {
      actionInProgress = false;
    }
  }

  async function handleVerifyOTP(event?: Event) {
    event?.preventDefault();
    if (actionInProgress) return;

    clearFeedback();

    if (!otp) {
      error = "Please enter the OTP.";
      return;
    }

    actionInProgress = true;
    try {
      const { data, error: verifyError } = await (
        await authClient()
      ).emailOtp.checkVerificationOtp({
        email: trimmedEmail,
        type: "forget-password",
        otp
      });

      if (verifyError) {
        error = verifyError.message ?? "Invalid OTP. Please try again.";
        return;
      }

      if (data) {
        info = "OTP verified. Please set your new password.";
        step = "password";
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      error = "Failed to verify OTP. Please try again.";
    } finally {
      actionInProgress = false;
    }
  }

  async function handleResetPassword(event?: Event) {
    event?.preventDefault();
    if (actionInProgress) return;

    clearFeedback();

    if (!newPassword || !confirmPassword) {
      error = "Please fill all the fields.";
      return;
    }

    if (newPassword !== confirmPassword) {
      error = "Passwords do not match.";
      return;
    }

    if (!isValidPassword(newPassword)) {
      return;
    }

    actionInProgress = true;
    try {
      const { data, error: resetError } = await (
        await authClient()
      ).emailOtp.resetPassword({
        email: trimmedEmail,
        otp,
        password: newPassword
      });

      if (resetError) {
        error =
          resetError.message ?? "Failed to reset password. Please try again.";
        return;
      }

      if (data) {
        info = "Password reset successful. Redirecting to login...";
        setTimeout(() => {
          appStore.gotoPath("/account/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      error = "Failed to reset password. Please try again.";
    } finally {
      actionInProgress = false;
    }
  }

  function isValidPassword(password: string): boolean {
    if (password.length < 8) {
      error = "Password must be at least 8 characters long.";
      return false;
    }
    if (password.length > 16) {
      error = "Password must be at most 16 characters long.";
      return false;
    }
    if (!password.match(/[a-z]/)) {
      error = "Password must contain at least one lowercase letter.";
      return false;
    }
    if (!password.match(/[A-Z]/)) {
      error = "Password must contain at least one uppercase letter.";
      return false;
    }
    if (!password.match(/[0-9]/)) {
      error = "Password must contain at least one number.";
      return false;
    }
    if (!password.match(/[^a-zA-Z0-9]/)) {
      error = "Password must contain at least one special character.";
      return false;
    }
    return true;
  }

  function handleBackToLogin() {
    appStore.gotoPath("/account/login");
  }

  function handleResendOTP() {
    clearFeedback();
    otp = "";
    step = "email";
  }
</script>

<div class="flex w-full h-full items-center justify-center px-6">
  <div class="flex flex-col w-80 {$view.scale > 0.6 ? 'gap-10' : 'gap-6'}">
    <div class="flex flex-col gap-2 text-center">
      <h2 class="text-h4 font-medium">Forgot password?</h2>
      <p class="text-fgs3 text-b2">
        {#if step === "email"}
          Enter the email linked to your account and we'll send you an OTP to
          reset your password.
        {:else if step === "otp"}
          Enter the OTP sent to your email address.
        {:else}
          Create a new password for your account.
        {/if}
      </p>
    </div>

    <form
      class="flex flex-col gap-4"
      on:submit|preventDefault={step === "email"
        ? handleSendOTP
        : step === "otp"
          ? handleVerifyOTP
          : handleResetPassword}
    >
      {#if step === "email"}
        <TextInput
          bind:value={email}
          type="email"
          label={{
            label: "Email",
            orientation: Orientation.Vertical
          }}
          placeholder="name@email.com"
          on:input={clearFeedback}
          on:enter={handleSendOTP}
        />
      {:else if step === "otp"}
        <TextInput
          bind:value={email}
          type="email"
          label={{
            label: "Email",
            orientation: Orientation.Vertical
          }}
          placeholder="name@email.com"
          isDisabled={true}
        />
        <TextInput
          bind:value={otp}
          type="text"
          label={{
            label: "OTP",
            orientation: Orientation.Vertical
          }}
          placeholder="123456"
          on:input={clearFeedback}
          on:enter={handleVerifyOTP}
        />
      {:else}
        <TextInput
          bind:value={newPassword}
          type={showNewPassword ? "text" : "password"}
          label={{
            label: "New Password",
            orientation: Orientation.Vertical,
            tooltip: {
              body: "Password must be 8-16 characters long and contain at least one lowercase letter, one uppercase letter, one number and one special character."
            }
          }}
          placeholder="********"
          on:input={clearFeedback}
        >
          <button
            type="button"
            on:click={() => (showNewPassword = !showNewPassword)}
            class="flex items-center justify-center"
          >
            <Icon
              icon={showNewPassword ? "hide" : "show"}
              size={Size.sm}
              class="stroke-fgs3 hover:stroke-fgs2"
            />
          </button>
        </TextInput>
        <TextInput
          bind:value={confirmPassword}
          type={showConfirmPassword ? "text" : "password"}
          label={{
            label: "Confirm Password",
            orientation: Orientation.Vertical
          }}
          placeholder="********"
          on:input={clearFeedback}
          on:enter={handleResetPassword}
        >
          <button
            type="button"
            on:click={() => (showConfirmPassword = !showConfirmPassword)}
            class="flex items-center justify-center"
          >
            <Icon
              icon={showConfirmPassword ? "hide" : "show"}
              size={Size.sm}
              class="stroke-fgs3 hover:stroke-fgs2"
            />
          </button>
        </TextInput>
      {/if}

      <InlineFeedbackText
        isRenderEmptyHeight={true}
        feedback={inlineFeedback}
        isAutoDissappear={false}
        size={Size.sm}
      />

      <Button
        label={step === "email"
          ? actionInProgress
            ? "Sending OTP..."
            : "Send OTP"
          : step === "otp"
            ? actionInProgress
              ? "Verifying..."
              : "Verify OTP"
            : actionInProgress
              ? "Resetting password..."
              : "Reset password"}
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        isLoading={actionInProgress}
        isDisabled={actionInProgress}
        on:click={step === "email"
          ? handleSendOTP
          : step === "otp"
            ? handleVerifyOTP
            : handleResetPassword}
      />

      {#if step === "otp"}
        <Button
          label="Resend OTP"
          style={ButtonStyle.PLAIN}
          size={Size.sm}
          on:click={handleResendOTP}
        />
      {/if}
    </form>

    <div class="flex justify-center">
      <Button
        label="Back to log in"
        style={ButtonStyle.PLAIN}
        size={Size.sm}
        on:click={handleBackToLogin}
        isUnderlined={true}
      />
    </div>
  </div>
</div>
