import { VNPay } from "vnpay";

export const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE ?? "",
  secureSecret: process.env.VNPAY_HASH_SECRET ?? "",
  vnpayHost: process.env.VNPAY_URL ?? "https://sandbox.vnpayment.vn",
  testMode: process.env.NODE_ENV !== "production",
  enableLog: false,
});
