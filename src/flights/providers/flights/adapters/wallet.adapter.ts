/**
 * Adapter for MakeVoyage Wallet Balance
 */

function parseAmount(value: string) {
  if (!value) return 0;
  // Remove currency and other non-numeric chars except dot
  return Number(value.replace(/[^\d.]/g, ""));
}

function extractCurrency(value: string) {
  if (!value) return "INR";
  const match = value.match(/[A-Z]{3}/);
  return match ? match[0] : "INR";
}

export function mapMakeVoyageWalletResponse(apiRes: any) {
  return {
    balance: parseAmount(apiRes.walletBalance),
    credit: parseAmount(apiRes.creditBalance),
    currency: extractCurrency(apiRes.walletBalance),
    supplier: "makevoyage"
  };
}
