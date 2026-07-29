import { expect, test, type Page } from "@playwright/test";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for E2E tests.`);
  return value;
}

async function login(page: Page, emailEnv: string): Promise<void> {
  await page.goto("/dang-nhap");
  await page.getByLabel("Email").fill(requiredEnv(emailEnv));
  await page.getByLabel("Mật khẩu").fill(requiredEnv("E2E_STAFF_PASSWORD"));
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL("/bang-dieu-khien");
  await expect(page.getByRole("heading", { name: "Tổng quan" })).toBeVisible();
}

test("manager logs in to dashboard", async ({ page }) => {
  await login(page, "E2E_MANAGER_EMAIL");
  await expect(page.getByText("Quản lý gara", { exact: true })).toBeVisible();
});

test("receptionist logs in to dashboard", async ({ page }) => {
  await login(page, "E2E_RECEPTIONIST_EMAIL");
  await expect(page.getByText("Lễ tân", { exact: true })).toBeVisible();
});

test("receptionist finds seeded customer and vehicle", async ({ page }) => {
  await login(page, "E2E_RECEPTIONIST_EMAIL");
  await page.getByRole("link", { name: "Khách hàng", exact: true }).click();
  await page.getByLabel("Tìm khách hàng").fill("Nguyễn Văn Hoàng");
  await page.getByRole("button", { name: "Tìm" }).click();
  await page.getByRole("link", { name: "Nguyễn Văn Hoàng", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Nguyễn Văn Hoàng" })).toBeVisible();
  await expect(page.getByText("0903111222", { exact: true })).toBeVisible();
  await expect(page.getByText("Xe đang sở hữu", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "30G-123.45", exact: true })).toBeVisible();
});

test("receptionist finds seeded vehicle history", async ({ page }) => {
  await login(page, "E2E_RECEPTIONIST_EMAIL");
  await page.getByRole("link", { name: "Xe", exact: true }).click();
  await page.getByLabel("Tìm xe").fill("30G-123.45");
  await page.getByRole("button", { name: "Tìm" }).click();
  await page.getByRole("link", { name: "30G-123.45", exact: true }).click();

  await expect(page.getByRole("heading", { name: "30G-123.45" })).toBeVisible();
  await expect(page.getByText("Toyota Vios 1.5G · 2020", { exact: true })).toBeVisible();
  await expect(
    page.locator('[data-slot="card-content"]').filter({ hasText: /^64\.500 km$/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Nguyễn Văn Hoàng", exact: true })).toBeVisible();
  await expect(page.getByText("Lịch sử số km", { exact: true })).toBeVisible();
  await expect(page.getByText("Lịch sử chủ sở hữu", { exact: true })).toBeVisible();
  await expect(page.getByText("Timeline xe", { exact: true })).toBeVisible();
  await expect(page.getByText("Bảo dưỡng định kỳ 10.000 km", { exact: true })).toBeVisible();
});
