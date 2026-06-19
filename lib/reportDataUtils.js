export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatCount(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

export function safePercent(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value || 0))));
}
