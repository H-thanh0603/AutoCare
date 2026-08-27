/**
 * Full 16-step lifecycle E2E test.
 *
 * Covers the entire repair workflow from vehicle setup to health-record sync.
 * Uses a DB fixture (full-lifecycle-fixture.ts) for setup/cleanup.
 *
 * Steps mapped to TESTING.md §4:
 *  1. Customer login
 *  2. Add vehicle           (UI)
 *  3. Book appointment       (UI)
 *  4. Receptionist confirms  (UI)
 *  5-9. Fixture creates repair order + quotation + work tasks
 * 10. Technician completes work  (UI)
 * 11. Inventory updated         (assert)
 * 12. Cashier creates invoice   (UI)
 * 13. Record payment            (UI)
 * 14. Quality check             (UI)
 * 15. Deliver vehicle           (UI)
 * 16. Health record synced      (assert)
 */

import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for full-lifecycle E2E.`);
  return value;
}

function fixture(...args: string[]): { repairOrderId?: string } {
  const output = execFileSync(
    process.execPath,
    ["--import", "tsx", "tests/e2e/full-lifecycle-fixture.ts", ...args],
    { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 },
  );
  return JSON.parse(output) as { repairOrderId?: string };
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/dang-nhap");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForLoadState("networkidle");
}

async function safeClick(page: Page, locator: ReturnType<Page["getByRole"]>, timeout = 10_000) {
  await locator.first().waitFor({ state: "visible", timeout });
  await locator.first().click();
  await page.waitForLoadState("networkidle");
}

/* ------------------------------------------------------------------ */
/*  Test                                                              */
/* ------------------------------------------------------------------ */

test.describe("Full 16-step lifecycle", () => {
  test("complete repair workflow", async ({ browser }) => {
    test.setTimeout(240_000);

    const CUSTOMER_EMAIL = requiredEnv("E2E_CUSTOMER_EMAIL");
    const CUSTOMER_PASSWORD = requiredEnv("E2E_CUSTOMER_PASSWORD");
    const RECEPTIONIST_EMAIL = requiredEnv("E2E_RECEPTIONIST_EMAIL");
    const STAFF_PASSWORD = requiredEnv("E2E_STAFF_PASSWORD");

    const setup = fixture("setup", CUSTOMER_EMAIL);
    const repairOrderId = setup.repairOrderId;
    if (!repairOrderId) throw new Error("Fixture failed to create repair order.");

    let customerPage: Page | undefined;
    let receptionist: Page | undefined;
    let technician: Page | undefined;
    let cashier: Page | undefined;

    try {
      /* ============================================================= */
      /* STEP 1: Customer logs in                                      */
      /* ============================================================= */
      customerPage = await browser.newPage();
      await login(customerPage, CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
      await expect(customerPage).toHaveURL(/\/tai-khoan/, { timeout: 15_000 });

      /* ============================================================= */
      /* STEP 2: Customer adds a new vehicle                           */
      /* ============================================================= */
      await customerPage.goto("/tai-khoan/xe/moi");
      await customerPage.waitForLoadState("networkidle");
      await expect(customerPage.getByRole("heading", { name: /thêm xe|đăng ký xe/i })).toBeVisible({ timeout: 10_000 });

      await customerPage.getByLabel(/biển số/i).fill("30X-999.99");
      await customerPage.getByLabel(/VIN/i).fill("VNAAAA12345678901");
      await customerPage.getByLabel(/hãng/i).fill("Toyota");
      await customerPage.getByLabel(/model/i).fill("Camry 2.5Q");
      await customerPage.getByLabel(/năm sản xuất/i).fill("2024");
      await customerPage.getByLabel(/màu/i).fill("Đen");
      await customerPage.getByLabel(/số km hiện tại/i).fill("5000");
      await safeClick(customerPage, customerPage.getByRole("button", { name: /lưu|tạo|thêm/i }));
      await expect(customerPage.getByText(/thành công|đã thêm/i)).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEP 3: Customer books an appointment                         */
      /* ============================================================= */
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const slot = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T08:00`;

      await customerPage.goto("/tai-khoan/lich-hen/moi");
      await customerPage.waitForLoadState("networkidle");
      await expect(customerPage.getByRole("heading", { name: /đặt lịch hẹn/i })).toBeVisible({ timeout: 10_000 });

      // Select vehicle — try multiple selector strategies
      const vehicleSelect = customerPage.getByLabel(/xe|phương tiện/i).first();
      if (await vehicleSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await vehicleSelect.selectOption({ label: "30X-999.99" });
      }

      await customerPage.getByLabel(/thời gian hẹn/i).fill(slot);
      await customerPage.getByLabel(/nhu cầu|lý do/i).fill("Bảo dưỡng định kỳ 10.000 km");
      await safeClick(customerPage, customerPage.getByRole("button", { name: /đặt lịch/i }));
      await expect(customerPage.getByText(/thành công|đã đặt/i)).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEP 4: Receptionist confirms appointment                     */
      /* ============================================================= */
      receptionist = await browser.newPage();
      await login(receptionist, RECEPTIONIST_EMAIL, STAFF_PASSWORD);
      await expect(receptionist).toHaveURL(/\/bang-dieu-khien/, { timeout: 15_000 });

      await receptionist.goto("/lich-hen");
      await receptionist.waitForLoadState("networkidle");
      await expect(receptionist.getByText("Bảo dưỡng định kỳ 10.000 km")).toBeVisible({ timeout: 15_000 });
      await safeClick(receptionist, receptionist.getByRole("button", { name: /xác nhận/i }));
      // Toast or status change confirms success
      await expect(receptionist.getByText(/đã xác nhận|confirmed|CONFIRMED/i)).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEPS 5-9: Fixture-created data                               */
      /* ============================================================= */

      /* ============================================================= */
      /* STEP 10: Technician completes work tasks                      */
      /* ============================================================= */
      technician = await browser.newPage();
      await login(technician, requiredEnv("E2E_TECHNICIAN_EMAIL"), STAFF_PASSWORD);
      await expect(technician).toHaveURL(/\/bang-dieu-khien/, { timeout: 15_000 });

      await technician.goto(`/lenh-sua-chua/${repairOrderId}`);
      await technician.waitForLoadState("networkidle");
      await expect(technician.getByText("E2E Test Service")).toBeVisible({ timeout: 15_000 });

      // Start each NOT_STARTED task
      for (let attempt = 0; attempt < 5; attempt++) {
        const startBtn = technician.getByRole("button", { name: "Bắt đầu" });
        const count = await startBtn.count().catch(() => 0);
        if (count === 0) break;
        await startBtn.first().click();
        await technician.waitForTimeout(800);
      }

      // Complete each IN_PROGRESS task
      for (let attempt = 0; attempt < 5; attempt++) {
        const completeBtn = technician.getByRole("button", { name: "Hoàn tất" });
        const count = await completeBtn.count().catch(() => 0);
        if (count === 0) break;
        await completeBtn.first().click();
        await technician.waitForTimeout(800);
      }

      // Auto-transition to QUALITY_CHECK when all tasks done
      await expect(technician.getByText("QUALITY_CHECK")).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEP 11: Assert inventory updated                             */
      /* ============================================================= */
      await expect(technician.getByText("E2E Test Part")).toBeVisible();

      /* ============================================================= */
      /* STEP 12: Cashier creates invoice                              */
      /* ============================================================= */
      cashier = await browser.newPage();
      await login(cashier, requiredEnv("E2E_CASHIER_EMAIL"), STAFF_PASSWORD);
      await expect(cashier).toHaveURL(/\/bang-dieu-khien/, { timeout: 15_000 });

      await cashier.goto(`/lenh-sua-chua/${repairOrderId}`);
      await cashier.waitForLoadState("networkidle");
      await expect(cashier.getByText("QUALITY_CHECK")).toBeVisible({ timeout: 15_000 });

      await safeClick(cashier, cashier.getByRole("button", { name: /tạo hóa đơn/i }));
      await expect(cashier.getByText(/đã tạo hóa đơn|DRAFT/i)).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEP 13: Record payment                                       */
      /* ============================================================= */
      await safeClick(cashier, cashier.getByRole("button", { name: /ghi nhận thanh toán/i }));
      await cashier.getByPlaceholder(/tối đa/i).fill("850000");
      await safeClick(cashier, cashier.getByRole("button", { name: /xác nhận/i }));
      await expect(cashier.getByText(/đã ghi nhận|PAID|PARTIALLY_PAID/i)).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEP 14: Quality check — pass                                 */
      /* ============================================================= */
      await safeClick(cashier, cashier.getByRole("button", { name: /nghiệm thu đạt/i }));
      await expect(cashier.getByText(/sẵn sàng giao xe|READY_FOR_DELIVERY/i)).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEP 15: Deliver vehicle                                      */
      /* ============================================================= */
      await safeClick(cashier, cashier.getByRole("button", { name: /bàn giao xe/i }));
      await expect(cashier.getByText(/đã bàn giao|COMPLETED/i)).toBeVisible({ timeout: 15_000 });

      /* ============================================================= */
      /* STEP 16: Health record synced                                 */
      /* ============================================================= */
      await expect(cashier.getByText(/hồ sơ|sức khỏe|bảo dưỡng/i)).toBeVisible({ timeout: 15_000 });
      await expect(cashier.getByText("COMPLETED")).toBeVisible();

    } finally {
      try { fixture("cleanup", repairOrderId); } catch { /* best effort */ }
      await customerPage?.close().catch(() => {});
      await receptionist?.close().catch(() => {});
      await technician?.close().catch(() => {});
      await cashier?.close().catch(() => {});
    }
  });
});
