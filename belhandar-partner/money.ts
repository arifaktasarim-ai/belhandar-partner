// Tum tutarlar veritabaninda KURUS (integer) olarak tutulur.
// Floating point (Number ile TL bazli toplama/carpma) KESINLIKLE kullanilmaz.

export function tlToCents(tl: number): number {
  return Math.round(tl * 100);
}

export function centsToTl(cents: number): number {
  return cents / 100;
}

export function formatTl(cents: number): string {
  return centsToTl(cents).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  });
}

// Yuzde bazli komisyon: value = 2000 => %20.00 (2 hane hassasiyet, integer olarak saklanir)
export function calcPercentageProfitCents(unitPriceCents: number, percentageValue: number): number {
  // percentageValue orn: 2000 => %20.00
  return Math.round((unitPriceCents * percentageValue) / 10000);
}
