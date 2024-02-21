import CustomDatePicker from "./CustomDatePicker.svelte";

export default {
  title: "Tidy/CustomDatePicker",
  component: CustomDatePicker,
  parameters: { layout: "centered" }
};

export const Default = {};

export const withProps = {
  Component: CustomDatePicker,
  args: {
    yearMode: false,
    monthMode: false,
    dayMode: false,
    isOpenCalendar: false
  }
};
export const yearMode = {
  Component: CustomDatePicker,
  args: {
    yearMode: true,
    monthMode: false,
    dayMode: false,
    isOpenCalendar: false
  }
};
export const monthMode = {
  Component: CustomDatePicker,
  args: {
    yearMode: false,
    monthMode: true,
    dayMode: false,
    isOpenCalendar: false
  }
};
export const dayMode = {
  Component: CustomDatePicker,
  args: {
    yearMode: false,
    monthMode: false,
    dayMode: true,
    isOpenCalendar: false
  }
};
