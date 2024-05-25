<script lang="ts">
  export let isChecked: boolean = false;
  export let color: string = "fgs1";
</script>

<button on:click>
  {#if isChecked}
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0.5" y="0.5" width="14" height="14" rx="2.5" class="fill-fgs1" />
      <path
        d="M5.90595 10.7484C5.65047 10.7485 5.40546 10.647 5.22497 10.4662L3.16615 8.40814C2.94462 8.18654 2.94462 7.82732 3.16615 7.60572C3.38775 7.38419 3.74696 7.38419 3.96857 7.60572L5.90595 9.5431L11.0314 4.41761C11.253 4.19608 11.6123 4.19608 11.8339 4.41761C12.0554 4.63921 12.0554 4.99843 11.8339 5.22003L6.58692 10.4662C6.40643 10.647 6.16142 10.7485 5.90595 10.7484Z"
        class="fill-bgs1"
      />
      <rect
        x="0.5"
        y="0.5"
        width="14"
        height="14"
        rx="2.5"
        class="stroke-fgs1"
      />
    </svg>
  {:else}
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.5"
        width="14"
        height="14"
        rx="2.5"
        class="stroke-{color}"
      />
    </svg>
  {/if}
</button>
