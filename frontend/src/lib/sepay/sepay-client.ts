import { SePayPgClient } from "sepay-pg-node";

const env = (process.env.SEPAY_ENV as "sandbox" | "production") || "production";
const merchantId = process.env.SEPAY_MERCHANT_ID || "SP-LIVE-DH4B8375";
const secretKey = process.env.SEPAY_SECRET_KEY || "spsk_live_z5Nfm7iyo8fkidF6FMEpHqr1BJ9rX7v7";

export const sepayClient = new SePayPgClient({
  env,
  merchant_id: merchantId,
  secret_key: secretKey,
});

export const SEPAY_CONFIG = {
  env,
  merchantId,
  merchantName: "Đại học Quốc gia",
};
