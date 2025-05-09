import type { IFaq } from "./landing.type";

export const faqs: { [key: string]: IFaq } = {
  paymentInformationNotRequired: {
    title: "Do I need to enter my payment information to use free trial?",
    body: "No, you can use the free trial without entering your payment information or subscribing to any plan. Your free trial auto starts once your signup on the app."
  },
  offlineVersionLimitations: {
    title: "Are there any limits on offline version of the app?",
    body: "All features are available on offline version of the app without any limitations or restrictions whatsoever."
  },
  priceIncreaseInFuture: {
    title: "Is there any chance of price increase in the future?",
    body: "No, there won't be any. In fact, we will be reducing the price of the plans in the future if more users start using the app. This is because of our preference for cost-based pricing over [value-based](https://www.madx.digital/glossary/value-based-pricing) (profit maximization) pricing to keep the costs low for you."
  },
  pyodPaymentRequirement: {
    title: "What do I need to pay for PYOD?",
    body: "We still need to run mediator sync server to sync your data to your plugged database."
  },
  cancelSubscription: {
    title: "Can I cancel once I subscribe?",
    body: "Yes, you can cancel within grace period for yearly and lifetime plans. The grace period is 14 days for yearly plans and 1 month for lifetime plans. We do not have any hidden fees or contracts. Kindly email us at hello@21n.org if you have any questions."
  },
  whoOwnsThisProduct: {
    title: "Who owns this product?",
    body: "This product is owned and built by 21n - 21st century native organization. Go to [21n.org](https://21n.org) to learn more about us."
  },
  whatHappensToMyData: {
    title: "What happens to my data if the app is shutdown for some reason?",
    body: "We immensely value your data as much as you do. Therefore we prioritized building interoperability features on our roadmap. Even if our product doesn't exist in 2 years down the line, you will still have access to all the your data safely exported or backed up on to your personal cloud."
  }
};
