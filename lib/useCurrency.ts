"use client";
import { useState, useEffect } from "react";

export interface CurrencyInfo {
  code:   string;
  symbol: string;
  rate:   number; // multiplier from USD base
}

/** Country-code → currency. Add more entries freely. */
export const COUNTRY_TO_CURRENCY: Record<string, CurrencyInfo> = {
  // South / Southeast Asia
  IN:  { code: "INR", symbol: "₹",    rate: 83.5  },
  SG:  { code: "SGD", symbol: "S$",   rate: 1.34  },
  MY:  { code: "MYR", symbol: "RM ",  rate: 4.47  },
  PH:  { code: "PHP", symbol: "₱",    rate: 56.5  },
  TH:  { code: "THB", symbol: "฿",    rate: 35.1  },
  ID:  { code: "IDR", symbol: "Rp",   rate: 15600 },
  VN:  { code: "VND", symbol: "₫",    rate: 24800 },
  BD:  { code: "BDT", symbol: "৳",    rate: 110   },
  PK:  { code: "PKR", symbol: "₨",    rate: 278   },
  LK:  { code: "LKR", symbol: "Rs",   rate: 303   },
  // East Asia
  JP:  { code: "JPY", symbol: "¥",    rate: 149.5 },
  KR:  { code: "KRW", symbol: "₩",    rate: 1320  },
  CN:  { code: "CNY", symbol: "¥",    rate: 7.24  },
  HK:  { code: "HKD", symbol: "HK$",  rate: 7.82  },
  TW:  { code: "TWD", symbol: "NT$",  rate: 31.8  },
  // Middle East
  AE:  { code: "AED", symbol: "AED ", rate: 3.67  },
  SA:  { code: "SAR", symbol: "SAR ", rate: 3.75  },
  QA:  { code: "QAR", symbol: "QR ",  rate: 3.64  },
  KW:  { code: "KWD", symbol: "KD ",  rate: 0.307 },
  BH:  { code: "BHD", symbol: "BD ",  rate: 0.376 },
  OM:  { code: "OMR", symbol: "OMR ", rate: 0.385 },
  // Europe
  GB:  { code: "GBP", symbol: "£",    rate: 0.79  },
  DE:  { code: "EUR", symbol: "€",    rate: 0.92  },
  FR:  { code: "EUR", symbol: "€",    rate: 0.92  },
  NL:  { code: "EUR", symbol: "€",    rate: 0.92  },
  ES:  { code: "EUR", symbol: "€",    rate: 0.92  },
  IT:  { code: "EUR", symbol: "€",    rate: 0.92  },
  BE:  { code: "EUR", symbol: "€",    rate: 0.92  },
  AT:  { code: "EUR", symbol: "€",    rate: 0.92  },
  PT:  { code: "EUR", symbol: "€",    rate: 0.92  },
  IE:  { code: "EUR", symbol: "€",    rate: 0.92  },
  FI:  { code: "EUR", symbol: "€",    rate: 0.92  },
  SE:  { code: "SEK", symbol: "kr",   rate: 10.4  },
  NO:  { code: "NOK", symbol: "kr",   rate: 10.6  },
  DK:  { code: "DKK", symbol: "kr",   rate: 6.89  },
  CH:  { code: "CHF", symbol: "CHF ", rate: 0.9   },
  PL:  { code: "PLN", symbol: "zł",   rate: 3.97  },
  CZ:  { code: "CZK", symbol: "Kč",   rate: 23.1  },
  RO:  { code: "RON", symbol: "lei",  rate: 4.59  },
  HU:  { code: "HUF", symbol: "Ft",   rate: 358   },
  // Oceania
  AU:  { code: "AUD", symbol: "A$",   rate: 1.53  },
  NZ:  { code: "NZD", symbol: "NZ$",  rate: 1.63  },
  // Americas
  CA:  { code: "CAD", symbol: "C$",   rate: 1.36  },
  BR:  { code: "BRL", symbol: "R$",   rate: 4.97  },
  MX:  { code: "MXN", symbol: "MX$",  rate: 17.2  },
  AR:  { code: "ARS", symbol: "ARS ", rate: 890   },
  CL:  { code: "CLP", symbol: "CLP$", rate: 913   },
  CO:  { code: "COP", symbol: "COP$", rate: 3930  },
  // Africa
  NG:  { code: "NGN", symbol: "₦",    rate: 1580  },
  ZA:  { code: "ZAR", symbol: "R",    rate: 18.6  },
  KE:  { code: "KES", symbol: "KSh",  rate: 129   },
  GH:  { code: "GHS", symbol: "GH₵",  rate: 15.4  },
  EG:  { code: "EGP", symbol: "E£",   rate: 47.9  },
};

/** Timezone → country code (fallback when IP geo fails — e.g. localhost) */
const TZ_TO_COUNTRY: Record<string, string> = {
  "Asia/Calcutta": "IN", "Asia/Kolkata": "IN",
  "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR",
  "Europe/Amsterdam": "NL", "Europe/Madrid": "ES", "Europe/Rome": "IT",
  "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
  "Europe/Zurich": "CH", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
  "Europe/Bucharest": "RO", "Europe/Budapest": "HU",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Perth": "AU",
  "America/Toronto": "CA", "America/Vancouver": "CA",
  "Asia/Singapore": "SG", "Asia/Dubai": "AE", "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA", "Asia/Kuwait": "KW",
  "Pacific/Auckland": "NZ", "Asia/Tokyo": "JP", "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW",
  "Asia/Kuala_Lumpur": "MY", "Asia/Manila": "PH", "Asia/Bangkok": "TH",
  "Asia/Jakarta": "ID", "Asia/Ho_Chi_Minh": "VN", "Asia/Dhaka": "BD",
  "Asia/Karachi": "PK", "Asia/Colombo": "LK",
  "Africa/Lagos": "NG", "Africa/Johannesburg": "ZA",
  "Africa/Nairobi": "KE", "Africa/Accra": "GH", "Africa/Cairo": "EG",
  "America/Sao_Paulo": "BR", "America/Mexico_City": "MX",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Santiago": "CL", "America/Bogota": "CO",
};

const USD: CurrencyInfo = { code: "USD", symbol: "$", rate: 1 };

function tzCountry(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_TO_COUNTRY[tz] ?? null;
  } catch { return null; }
}

/**
 * Detects visitor's currency via:
 *   1. /api/geo  — server-side IP lookup (Cloudflare header → Vercel header → ip-api.com)
 *   2. Intl timezone  — client-side fallback for localhost / blocked requests
 *   3. USD            — last resort
 */
export function useCurrency(): CurrencyInfo {
  const [currency, setCurrency] = useState<CurrencyInfo>(USD);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // 1. IP-based geo (most accurate)
      try {
        const res = await fetch("/api/geo", { cache: "no-store" });
        if (res.ok) {
          const { country } = await res.json() as { country: string | null };
          if (!cancelled && country && COUNTRY_TO_CURRENCY[country]) {
            setCurrency(COUNTRY_TO_CURRENCY[country]);
            return;
          }
        }
      } catch { /* fall through */ }

      // 2. Timezone fallback (works on localhost / offline)
      if (!cancelled) {
        const country = tzCountry();
        if (country && COUNTRY_TO_CURRENCY[country]) {
          setCurrency(COUNTRY_TO_CURRENCY[country]);
        }
      }
    }

    detect();
    return () => { cancelled = true; };
  }, []);

  return currency;
}

/** Format a USD base price into the detected local currency. */
export function formatPrice(usd: number, currency: CurrencyInfo): string {
  const amount = Math.round(usd * currency.rate);
  return `${currency.symbol}${amount.toLocaleString()}`;
}
