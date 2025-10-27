import type { Page } from "@playwright/test";

export class AppPage {
  constructor(private readonly page: Page) {}

  async gotoHome() {
    return await this.page.goto("/");
  }

  async getTitle() {
    return this.page.title();
  }

  async isNavigationVisible() {
    return this.page.locator("nav").first().isVisible().catch(() => false);
  }
}
