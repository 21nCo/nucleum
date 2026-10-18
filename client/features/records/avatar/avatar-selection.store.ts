import { writable } from "svelte/store";
import { shuffleEmojis } from "@21n/ui/elements/avatarPicker/avatars";

/** Emoji ordering retained across record avatar pickers. */
export const appStoreShuffleEmojis = writable(shuffleEmojis);
