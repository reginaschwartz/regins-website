export const config = {
  port: Number(process.env.PORT || 3000),
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || "",
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  appSecret: process.env.WHATSAPP_APP_SECRET || "",
  graphVersion: process.env.GRAPH_API_VERSION || "v25.0",
  dryRun: process.env.DRY_RUN === "true" || !process.env.WHATSAPP_ACCESS_TOKEN,
  sessionTtlMs: Number(process.env.SESSION_TTL_MS || 24 * 60 * 60 * 1000),
};

export function dryRunReason() {
  if (process.env.DRY_RUN === "true") {
    return "DRY_RUN=true";
  }
  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    return "WHATSAPP_ACCESS_TOKEN is empty";
  }
  return null;
}
