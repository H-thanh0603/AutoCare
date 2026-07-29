import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for M4 E2E.`);
  return value;
}

function fixture(...args: string[]): { repairOrderId?: string } {
  const output = execFileSync(process.execPath, ["--import", "tsx", "tests/e2e/milestone-4-fixture.ts", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return JSON.parse(output) as { repairOrderId?: string };
}

async function login(page: Page, emailEnv: string, passwordEnv: string, path: string): Promise<void> {
  await page.goto("/dang-nhap");
  await page.locator('input[name="email"]').fill(requiredEnv(emailEnv));
  await page.locator('input[name="password"]').fill(requiredEnv(passwordEnv));
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

test("staff sends a quotation and customer approves one item", async ({ browser }) => {
  test.setTimeout(90_000);
  const setup = fixture("setup", requiredEnv("E2E_CUSTOMER_EMAIL"));
  const repairOrderId = setup.repairOrderId;
  if (!repairOrderId) throw new Error("M4 fixture did not create a repair order.");

  try {
    const staff = await browser.newPage();
    await login(staff, "E2E_RECEPTIONIST_EMAIL", "E2E_STAFF_PASSWORD", "/bang-dieu-khien");
    await staff.goto(`/lenh-sua-chua/${repairOrderId}`);
    await staff.locator('form:has(input[name="repairOrderId"]) button[type="submit"]').click();

    const inspectionForm = staff.locator('form:has(input[name="category"])');
    await expect(inspectionForm).toBeVisible();
    await inspectionForm.locator('textarea[name="summary"]').fill("E2E inspection summary");
    await inspectionForm.locator('input[name="category"]').fill("Brakes");
    await inspectionForm.locator('input[name="name"]').fill("Front pads");
    await inspectionForm.locator('input[name="finding"]').fill("Worn");
    await inspectionForm.locator('input[name="recommendation"]').fill("Replace pads");
    await inspectionForm.locator('button[type="submit"]').click();

    const quotationForm = staff.locator('form:has(input[name="description"])');
    await expect(quotationForm).toBeVisible();
    await quotationForm.locator('input[name="description"]').fill("Replace front pads");
    await quotationForm.locator('input[name="quantity"]').fill("1");
    await quotationForm.locator('input[name="unitPrice"]').fill("450000");
    await quotationForm.locator('input[name="discountAmount"]').fill("0");
    await quotationForm.locator('button[type="submit"]').click();

    const sendForm = staff.locator('form:has(input[name="quotationId"])');
    await expect(sendForm).toBeVisible();
    const quotationId = await sendForm.locator('input[name="quotationId"]').inputValue();
    await sendForm.locator('button[type="submit"]').click();
    await expect(staff.getByText("SENT", { exact: true })).toBeVisible();

    const portal = await browser.newPage();
    await login(portal, "E2E_CUSTOMER_EMAIL", "E2E_CUSTOMER_PASSWORD", "/tai-khoan");
    await portal.goto(`/tai-khoan/bao-gia/${quotationId}`);
    await portal.locator('form:has(input[value="APPROVED"]) button[type="submit"]').click();
    await expect(portal.locator("p").filter({ hasText: "APPROVED" })).toBeVisible();
  } finally {
    fixture("cleanup", repairOrderId);
  }
});
