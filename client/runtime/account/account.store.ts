import { get, writable } from "svelte/store";
import type { UserAccount } from "@nucleum/client/runtime/account/account.type";

const state = writable<UserAccount>();

/** Shared reactive state for the current account session. */
const account = {
  subscribe: state.subscribe,
  set: state.set,
  update: state.update,
  get: () => get(state)
};

export default account;
