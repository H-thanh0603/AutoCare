import { expect, test, type Page } from "@playwright/test";

const E2E_SERVICE_REQUEST = "E2E M3 booking binding";

function todaySlot(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T08:00`;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for M3 E2E.`);
  return value;
}

async function login(
  page: Page,
  emailEnv: string,
  passwordEnv: string,
  expectedPath: "/tai-khoan" | "/bang-dieu-khien",
): Promise<void> {
  await page.goto("/dang-nhap");
  await page.getByLabel("Email").fill(requiredEnv(emailEnv));
  await page.getByLabel("Mật khẩu").fill(requiredEnv(passwordEnv));
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath}$`));
}

test("customer books an appointment and receptionist sees it", async ({ browser }) => {
  const customer = await browser.newPage();
  await login(customer, "E2E_CUSTOMER_EMAIL", "E2E_CUSTOMER_PASSWORD", "/tai-khoan");
  await customer.goto("/tai-khoan/lich-hen/moi");
  await expect(customer.getByRole("heading", { name: "Đặt lịch hẹn" })).toBeVisible();
  await customer.getByLabel("Thời gian hẹn").fill(todaySlot());
  await customer.getByLabel("Nhu cầu sửa chữa").fill(E2E_SERVICE_REQUEST);
  await customer.getByRole("button", { name: "Đặt lịch" }).click();

  const receptionist = await browser.newPage();
  await login(receptionist, "E2E_RECEPTIONIST_EMAIL", "E2E_STAFF_PASSWORD", "/bang-dieu-khien");
  await receptionist.goto("/lich-hen");
  await expect(receptionist.getByText(E2E_SERVICE_REQUEST, { exact: true })).toBeVisible();
});
