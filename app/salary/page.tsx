"use client";
/**
 * /salary — Global Salary Intelligence + Negotiation Coach
 * Multi-currency (USD/EUR/GBP/SGD/AED/INR), global cities, AI negotiation coach.
 */
import React, { useState, useMemo, useEffect } from "react";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { trackAction } from "@/lib/activityTracker";
import { useWindowWidth } from "@/lib/useWindowWidth";
import { useAuth } from "@/lib/useAuth";

/* ── Currency config ─────────────────────────────────────────── */
type Currency = "USD" | "EUR" | "GBP" | "SGD" | "AED" | "INR";
const CURRENCIES: Record<Currency, { symbol: string; name: string; toUSD: number }> = {
  USD: { symbol: "$",   name: "US Dollar",         toUSD: 1      },
  EUR: { symbol: "€",   name: "Euro",               toUSD: 1.08   },
  GBP: { symbol: "£",   name: "British Pound",      toUSD: 1.27   },
  SGD: { symbol: "S$",  name: "Singapore Dollar",   toUSD: 0.74   },
  AED: { symbol: "د.إ", name: "UAE Dirham",          toUSD: 0.272  },
  INR: { symbol: "₹",   name: "Indian Rupee (LPA)", toUSD: 0.012  },
};

function fmtSalary(usd: number, cur: Currency): string {
  const rate = CURRENCIES[cur].toUSD;
  const val  = usd / rate;
  const sym  = CURRENCIES[cur].symbol;
  if (cur === "INR") return `${sym}${Math.round(val / 100000)}L`;
  if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
  return `${sym}${Math.round(val / 1000)}K`;
}

/* ── Data (all salaries stored as USD/year) ──────────────────── */
interface SalaryRow {
  role:      string;
  category:  string;
  region:    string;
  city:      string;
  exp:       "0-2" | "2-5" | "5-10" | "10+";
  median:    number; // USD/yr
  p25:       number;
  p75:       number;
  yoyGrowth: number; // %
  openings:  number;
}

const DATA: SalaryRow[] = [
  // ── North America ────────────────────────────────────────────
  // San Francisco Bay Area
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "North America", city: "San Francisco",  exp: "0-2",  median: 148000, p25: 122000, p75: 178000, yoyGrowth: 5,  openings: 3600 },
  { role: "Software Engineer (L4/SDE-2)",  category: "Engineering", region: "North America", city: "San Francisco",  exp: "2-5",  median: 198000, p25: 168000, p75: 245000, yoyGrowth: 8,  openings: 2800 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "North America", city: "San Francisco",  exp: "5-10", median: 268000, p25: 222000, p75: 335000, yoyGrowth: 7,  openings: 1500 },
  { role: "Staff / Principal Engineer",    category: "Engineering", region: "North America", city: "San Francisco",  exp: "10+",  median: 375000, p25: 305000, p75: 490000, yoyGrowth: 11, openings: 520  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "San Francisco",  exp: "2-5",  median: 218000, p25: 180000, p75: 278000, yoyGrowth: 38, openings: 1100 },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "San Francisco",  exp: "5-10", median: 318000, p25: 260000, p75: 408000, yoyGrowth: 34, openings: 550  },
  { role: "Data Scientist",                category: "Data & AI",   region: "North America", city: "San Francisco",  exp: "2-5",  median: 172000, p25: 140000, p75: 215000, yoyGrowth: 18, openings: 820  },
  { role: "Data Engineer",                 category: "Data & AI",   region: "North America", city: "San Francisco",  exp: "2-5",  median: 162000, p25: 132000, p75: 202000, yoyGrowth: 20, openings: 740  },
  { role: "Frontend Engineer",             category: "Engineering", region: "North America", city: "San Francisco",  exp: "2-5",  median: 178000, p25: 148000, p75: 218000, yoyGrowth: 6,  openings: 1800 },
  { role: "DevOps / SRE",                  category: "Engineering", region: "North America", city: "San Francisco",  exp: "2-5",  median: 168000, p25: 138000, p75: 208000, yoyGrowth: 19, openings: 680  },
  { role: "Product Manager",               category: "Product",     region: "North America", city: "San Francisco",  exp: "2-5",  median: 178000, p25: 142000, p75: 225000, yoyGrowth: 7,  openings: 860  },
  { role: "Product Manager",               category: "Product",     region: "North America", city: "San Francisco",  exp: "5-10", median: 245000, p25: 198000, p75: 315000, yoyGrowth: 9,  openings: 420  },
  // New York
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "North America", city: "New York",       exp: "0-2",  median: 138000, p25: 112000, p75: 168000, yoyGrowth: 5,  openings: 2400 },
  { role: "Software Engineer (L4/SDE-2)",  category: "Engineering", region: "North America", city: "New York",       exp: "2-5",  median: 182000, p25: 152000, p75: 228000, yoyGrowth: 7,  openings: 1800 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "North America", city: "New York",       exp: "5-10", median: 248000, p25: 202000, p75: 308000, yoyGrowth: 7,  openings: 960  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "New York",       exp: "2-5",  median: 198000, p25: 162000, p75: 255000, yoyGrowth: 32, openings: 580  },
  { role: "Data Scientist",                category: "Data & AI",   region: "North America", city: "New York",       exp: "2-5",  median: 155000, p25: 125000, p75: 195000, yoyGrowth: 16, openings: 640  },
  { role: "Product Manager",               category: "Product",     region: "North America", city: "New York",       exp: "2-5",  median: 162000, p25: 132000, p75: 202000, yoyGrowth: 6,  openings: 620  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "North America", city: "New York",       exp: "2-5",  median: 148000, p25: 120000, p75: 185000, yoyGrowth: 17, openings: 480  },
  // Seattle
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "North America", city: "Seattle",        exp: "0-2",  median: 152000, p25: 128000, p75: 182000, yoyGrowth: 6,  openings: 2100 },
  { role: "Software Engineer (L4/SDE-2)",  category: "Engineering", region: "North America", city: "Seattle",        exp: "2-5",  median: 202000, p25: 170000, p75: 252000, yoyGrowth: 9,  openings: 1600 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "North America", city: "Seattle",        exp: "5-10", median: 275000, p25: 228000, p75: 345000, yoyGrowth: 8,  openings: 820  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "Seattle",        exp: "2-5",  median: 218000, p25: 180000, p75: 278000, yoyGrowth: 35, openings: 720  },
  { role: "Data Engineer",                 category: "Data & AI",   region: "North America", city: "Seattle",        exp: "2-5",  median: 155000, p25: 125000, p75: 192000, yoyGrowth: 18, openings: 580  },
  { role: "Product Manager",               category: "Product",     region: "North America", city: "Seattle",        exp: "2-5",  median: 172000, p25: 138000, p75: 215000, yoyGrowth: 8,  openings: 540  },
  // Austin
  { role: "Software Engineer (L4/SDE-2)",  category: "Engineering", region: "North America", city: "Austin",         exp: "2-5",  median: 158000, p25: 128000, p75: 198000, yoyGrowth: 11, openings: 1400 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "North America", city: "Austin",         exp: "5-10", median: 215000, p25: 175000, p75: 268000, yoyGrowth: 10, openings: 620  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "North America", city: "Austin",         exp: "2-5",  median: 178000, p25: 145000, p75: 228000, yoyGrowth: 36, openings: 420  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "North America", city: "Austin",         exp: "2-5",  median: 132000, p25: 108000, p75: 165000, yoyGrowth: 20, openings: 380  },

  // ── Europe ────────────────────────────────────────────────────
  // London
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "Europe", city: "London",        exp: "0-2",  median: 72000,  p25: 58000,  p75: 90000,  yoyGrowth: 7,  openings: 2800 },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "London",        exp: "2-5",  median: 92000,  p25: 74000,  p75: 118000, yoyGrowth: 8,  openings: 3200 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "London",        exp: "5-10", median: 132000, p25: 108000, p75: 168000, yoyGrowth: 9,  openings: 1400 },
  { role: "Staff / Principal Engineer",    category: "Engineering", region: "Europe", city: "London",        exp: "10+",  median: 185000, p25: 148000, p75: 238000, yoyGrowth: 10, openings: 380  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "London",        exp: "2-5",  median: 108000, p25: 88000,  p75: 138000, yoyGrowth: 30, openings: 720  },
  { role: "Data Scientist",                category: "Data & AI",   region: "Europe", city: "London",        exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 14, openings: 560  },
  { role: "Frontend Engineer",             category: "Engineering", region: "Europe", city: "London",        exp: "2-5",  median: 85000,  p25: 68000,  p75: 108000, yoyGrowth: 7,  openings: 1600 },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Europe", city: "London",        exp: "2-5",  median: 90000,  p25: 72000,  p75: 115000, yoyGrowth: 17, openings: 520  },
  { role: "Product Manager",               category: "Product",     region: "Europe", city: "London",        exp: "2-5",  median: 98000,  p25: 78000,  p75: 125000, yoyGrowth: 7,  openings: 720  },
  // Berlin
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "Berlin",        exp: "2-5",  median: 78000,  p25: 62000,  p75: 98000,  yoyGrowth: 9,  openings: 2100 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "Berlin",        exp: "5-10", median: 112000, p25: 90000,  p75: 142000, yoyGrowth: 10, openings: 880  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "Berlin",        exp: "2-5",  median: 92000,  p25: 74000,  p75: 118000, yoyGrowth: 28, openings: 440  },
  { role: "Data Scientist",                category: "Data & AI",   region: "Europe", city: "Berlin",        exp: "2-5",  median: 78000,  p25: 62000,  p75: 98000,  yoyGrowth: 12, openings: 360  },
  { role: "Product Manager",               category: "Product",     region: "Europe", city: "Berlin",        exp: "2-5",  median: 82000,  p25: 65000,  p75: 105000, yoyGrowth: 8,  openings: 520  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Europe", city: "Berlin",        exp: "2-5",  median: 75000,  p25: 60000,  p75: 96000,  yoyGrowth: 18, openings: 340  },
  // Amsterdam
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "Amsterdam",     exp: "2-5",  median: 85000,  p25: 68000,  p75: 108000, yoyGrowth: 10, openings: 1600 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "Amsterdam",     exp: "5-10", median: 122000, p25: 98000,  p75: 155000, yoyGrowth: 11, openings: 620  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "Amsterdam",     exp: "2-5",  median: 98000,  p25: 78000,  p75: 125000, yoyGrowth: 26, openings: 360  },
  { role: "Product Manager",               category: "Product",     region: "Europe", city: "Amsterdam",     exp: "2-5",  median: 92000,  p25: 74000,  p75: 118000, yoyGrowth: 9,  openings: 420  },
  // Paris
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "Paris",         exp: "2-5",  median: 70000,  p25: 56000,  p75: 90000,  yoyGrowth: 7,  openings: 1400 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "Paris",         exp: "5-10", median: 100000, p25: 80000,  p75: 128000, yoyGrowth: 8,  openings: 580  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "Paris",         exp: "2-5",  median: 85000,  p25: 68000,  p75: 108000, yoyGrowth: 27, openings: 400  },
  // Stockholm
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Europe", city: "Stockholm",     exp: "2-5",  median: 80000,  p25: 64000,  p75: 102000, yoyGrowth: 9,  openings: 1100 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Europe", city: "Stockholm",     exp: "5-10", median: 115000, p25: 92000,  p75: 148000, yoyGrowth: 10, openings: 440  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Europe", city: "Stockholm",     exp: "2-5",  median: 95000,  p25: 76000,  p75: 122000, yoyGrowth: 30, openings: 280  },

  // ── Asia Pacific ──────────────────────────────────────────────
  // Singapore
  { role: "Software Engineer (L3/SDE-1)",  category: "Engineering", region: "Asia Pacific", city: "Singapore",  exp: "0-2",  median: 68000,  p25: 54000,  p75: 86000,  yoyGrowth: 9,  openings: 1600 },
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 90000,  p25: 72000,  p75: 115000, yoyGrowth: 11, openings: 1800 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Singapore",  exp: "5-10", median: 132000, p25: 108000, p75: 168000, yoyGrowth: 12, openings: 720  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 100000, p25: 80000,  p75: 130000, yoyGrowth: 32, openings: 440  },
  { role: "Data Scientist",                category: "Data & AI",   region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 82000,  p25: 65000,  p75: 105000, yoyGrowth: 16, openings: 380  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 95000,  p25: 76000,  p75: 122000, yoyGrowth: 9,  openings: 480  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Asia Pacific", city: "Singapore",  exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 20, openings: 360  },
  // Bangalore (India) — all values in USD; display as LPA via fmtSalary(x, "INR")
  // Source: AmbitionBox 2024-25, LinkedIn Salary India, Glassdoor India, Levels.fyi India
  { role: "Software Engineer (SDE-1)",     category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "0-2",  median: 9600,   p25: 7200,   p75: 13200,  yoyGrowth: 8,  openings: 3200 },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 22000,  p25: 16800,  p75: 30000,  yoyGrowth: 12, openings: 2800 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "5-10", median: 38000,  p25: 28800,  p75: 54000,  yoyGrowth: 10, openings: 1200 },
  { role: "Staff / Principal Engineer",    category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "10+",  median: 72000,  p25: 54000,  p75: 108000, yoyGrowth: 13, openings: 320  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Bangalore",  exp: "0-2",  median: 10800,  p25: 8400,   p75: 15600,  yoyGrowth: 35, openings: 840  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 30000,  p25: 22800,  p75: 43200,  yoyGrowth: 38, openings: 580  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Bangalore",  exp: "5-10", median: 60000,  p25: 44400,  p75: 90000,  yoyGrowth: 30, openings: 280  },
  { role: "Data Scientist",                category: "Data & AI",   region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 18000,  p25: 13200,  p75: 26400,  yoyGrowth: 20, openings: 680  },
  { role: "Data Engineer",                 category: "Data & AI",   region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 16800,  p25: 12000,  p75: 24000,  yoyGrowth: 18, openings: 520  },
  { role: "Frontend Engineer",             category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 18000,  p25: 13200,  p75: 26400,  yoyGrowth: 10, openings: 1600 },
  { role: "Backend Engineer",              category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 20400,  p25: 15600,  p75: 30000,  yoyGrowth: 11, openings: 1800 },
  { role: "Full Stack Engineer",           category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 19200,  p25: 14400,  p75: 28800,  yoyGrowth: 12, openings: 2200 },
  { role: "Android / iOS Engineer",        category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 18000,  p25: 13200,  p75: 26400,  yoyGrowth: 9,  openings: 820  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 16800,  p25: 12000,  p75: 24000,  yoyGrowth: 22, openings: 720  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Bangalore",  exp: "0-2",  median: 10800,  p25: 8400,   p75: 15600,  yoyGrowth: 12, openings: 560  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Bangalore",  exp: "2-5",  median: 27600,  p25: 20400,  p75: 40800,  yoyGrowth: 15, openings: 840  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Bangalore",  exp: "5-10", median: 60000,  p25: 44400,  p75: 90000,  yoyGrowth: 14, openings: 360  },
  // Hyderabad (India)
  { role: "Software Engineer (SDE-1)",     category: "Engineering", region: "Asia Pacific", city: "Hyderabad",  exp: "0-2",  median: 8400,   p25: 6000,   p75: 12000,  yoyGrowth: 9,  openings: 2400 },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", region: "Asia Pacific", city: "Hyderabad",  exp: "2-5",  median: 19200,  p25: 14400,  p75: 27600,  yoyGrowth: 11, openings: 2200 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Hyderabad",  exp: "5-10", median: 33600,  p25: 24000,  p75: 48000,  yoyGrowth: 9,  openings: 1000 },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Hyderabad",  exp: "2-5",  median: 26400,  p25: 19200,  p75: 38400,  yoyGrowth: 35, openings: 480  },
  { role: "Data Scientist",                category: "Data & AI",   region: "Asia Pacific", city: "Hyderabad",  exp: "2-5",  median: 15600,  p25: 11400,  p75: 22800,  yoyGrowth: 18, openings: 540  },
  { role: "Full Stack Engineer",           category: "Engineering", region: "Asia Pacific", city: "Hyderabad",  exp: "2-5",  median: 16800,  p25: 12000,  p75: 24000,  yoyGrowth: 10, openings: 1600 },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Asia Pacific", city: "Hyderabad",  exp: "2-5",  median: 14400,  p25: 10800,  p75: 21600,  yoyGrowth: 20, openings: 580  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Hyderabad",  exp: "2-5",  median: 22800,  p25: 16800,  p75: 33600,  yoyGrowth: 12, openings: 480  },
  // Mumbai (India)
  { role: "Software Engineer (SDE-1)",     category: "Engineering", region: "Asia Pacific", city: "Mumbai",     exp: "0-2",  median: 8400,   p25: 6000,   p75: 12000,  yoyGrowth: 8,  openings: 1800 },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", region: "Asia Pacific", city: "Mumbai",     exp: "2-5",  median: 18000,  p25: 13200,  p75: 26400,  yoyGrowth: 10, openings: 1600 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Mumbai",     exp: "5-10", median: 30000,  p25: 22800,  p75: 43200,  yoyGrowth: 9,  openings: 820  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Mumbai",     exp: "2-5",  median: 24000,  p25: 18000,  p75: 36000,  yoyGrowth: 33, openings: 360  },
  { role: "Data Scientist",                category: "Data & AI",   region: "Asia Pacific", city: "Mumbai",     exp: "2-5",  median: 14400,  p25: 10800,  p75: 21600,  yoyGrowth: 16, openings: 420  },
  { role: "Full Stack Engineer",           category: "Engineering", region: "Asia Pacific", city: "Mumbai",     exp: "2-5",  median: 16800,  p25: 12000,  p75: 24000,  yoyGrowth: 9,  openings: 1200 },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Mumbai",     exp: "2-5",  median: 21600,  p25: 16800,  p75: 31200,  yoyGrowth: 11, openings: 520  },
  // Delhi / NCR (India)
  { role: "Software Engineer (SDE-1)",     category: "Engineering", region: "Asia Pacific", city: "Delhi/NCR",  exp: "0-2",  median: 7200,   p25: 5400,   p75: 10800,  yoyGrowth: 7,  openings: 2000 },
  { role: "Software Engineer (SDE-2)",     category: "Engineering", region: "Asia Pacific", city: "Delhi/NCR",  exp: "2-5",  median: 16800,  p25: 12000,  p75: 24000,  yoyGrowth: 9,  openings: 1600 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Delhi/NCR",  exp: "5-10", median: 28800,  p25: 21600,  p75: 40800,  yoyGrowth: 8,  openings: 720  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Delhi/NCR",  exp: "2-5",  median: 22800,  p25: 16800,  p75: 33600,  yoyGrowth: 30, openings: 380  },
  { role: "Full Stack Engineer",           category: "Engineering", region: "Asia Pacific", city: "Delhi/NCR",  exp: "2-5",  median: 15600,  p25: 11400,  p75: 22800,  yoyGrowth: 9,  openings: 1200 },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Delhi/NCR",  exp: "2-5",  median: 20400,  p25: 15600,  p75: 30000,  yoyGrowth: 10, openings: 480  },
  // Pune (India)
  { role: "Software Engineer (SDE-2)",     category: "Engineering", region: "Asia Pacific", city: "Pune",       exp: "2-5",  median: 15600,  p25: 11400,  p75: 22800,  yoyGrowth: 10, openings: 1400 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Pune",       exp: "5-10", median: 27600,  p25: 20400,  p75: 39600,  yoyGrowth: 9,  openings: 620  },
  { role: "Full Stack Engineer",           category: "Engineering", region: "Asia Pacific", city: "Pune",       exp: "2-5",  median: 14400,  p25: 10800,  p75: 21600,  yoyGrowth: 9,  openings: 1000 },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Asia Pacific", city: "Pune",       exp: "2-5",  median: 12000,  p25: 9600,   p75: 18000,  yoyGrowth: 18, openings: 480  },
  // Remote India
  { role: "Full Stack Engineer",           category: "Engineering", region: "Asia Pacific", city: "Remote (India)", exp: "2-5",  median: 22800, p25: 16800, p75: 33600, yoyGrowth: 18, openings: 2400 },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Remote (India)", exp: "2-5",  median: 36000, p25: 26400, p75: 54000, yoyGrowth: 42, openings: 960  },
  { role: "Backend Engineer",              category: "Engineering", region: "Asia Pacific", city: "Remote (India)", exp: "2-5",  median: 21600, p25: 15600, p75: 31200, yoyGrowth: 16, openings: 1800 },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Asia Pacific", city: "Remote (India)", exp: "2-5",  median: 18000, p25: 13200, p75: 26400, yoyGrowth: 24, openings: 720  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Remote (India)", exp: "2-5",  median: 28800, p25: 21600, p75: 42000, yoyGrowth: 20, openings: 480  },
  // Sydney
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Asia Pacific", city: "Sydney",     exp: "2-5",  median: 108000, p25: 88000,  p75: 135000, yoyGrowth: 7,  openings: 1400 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Sydney",     exp: "5-10", median: 152000, p25: 122000, p75: 190000, yoyGrowth: 8,  openings: 580  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Sydney",     exp: "2-5",  median: 122000, p25: 98000,  p75: 156000, yoyGrowth: 28, openings: 340  },
  { role: "Product Manager",               category: "Product",     region: "Asia Pacific", city: "Sydney",     exp: "2-5",  median: 112000, p25: 90000,  p75: 142000, yoyGrowth: 8,  openings: 320  },
  // Tokyo
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Asia Pacific", city: "Tokyo",      exp: "2-5",  median: 74000,  p25: 59000,  p75: 94000,  yoyGrowth: 10, openings: 1200 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Asia Pacific", city: "Tokyo",      exp: "5-10", median: 108000, p25: 86000,  p75: 138000, yoyGrowth: 11, openings: 480  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Asia Pacific", city: "Tokyo",      exp: "2-5",  median: 90000,  p25: 72000,  p75: 116000, yoyGrowth: 26, openings: 380  },

  // ── Middle East ───────────────────────────────────────────────
  // Dubai / UAE
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Middle East", city: "Dubai",      exp: "2-5",  median: 80000,  p25: 64000,  p75: 100000, yoyGrowth: 22, openings: 1800 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Middle East", city: "Dubai",      exp: "5-10", median: 116000, p25: 92000,  p75: 148000, yoyGrowth: 24, openings: 720  },
  { role: "Staff / Principal Engineer",    category: "Engineering", region: "Middle East", city: "Dubai",      exp: "10+",  median: 162000, p25: 128000, p75: 208000, yoyGrowth: 20, openings: 220  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Middle East", city: "Dubai",      exp: "2-5",  median: 95000,  p25: 76000,  p75: 122000, yoyGrowth: 42, openings: 560  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Middle East", city: "Dubai",      exp: "5-10", median: 145000, p25: 116000, p75: 185000, yoyGrowth: 38, openings: 280  },
  { role: "Data Scientist",                category: "Data & AI",   region: "Middle East", city: "Dubai",      exp: "2-5",  median: 78000,  p25: 62000,  p75: 100000, yoyGrowth: 22, openings: 420  },
  { role: "Product Manager",               category: "Product",     region: "Middle East", city: "Dubai",      exp: "2-5",  median: 90000,  p25: 72000,  p75: 115000, yoyGrowth: 18, openings: 480  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Middle East", city: "Dubai",      exp: "2-5",  median: 78000,  p25: 62000,  p75: 100000, yoyGrowth: 21, openings: 420  },
  { role: "Frontend Engineer",             category: "Engineering", region: "Middle East", city: "Dubai",      exp: "2-5",  median: 72000,  p25: 58000,  p75: 92000,  yoyGrowth: 18, openings: 680  },
  // Riyadh / Saudi Arabia
  { role: "Software Engineer (Mid)",       category: "Engineering", region: "Middle East", city: "Riyadh",     exp: "2-5",  median: 74000,  p25: 59000,  p75: 94000,  yoyGrowth: 26, openings: 1400 },
  { role: "Senior Software Engineer",      category: "Engineering", region: "Middle East", city: "Riyadh",     exp: "5-10", median: 106000, p25: 85000,  p75: 136000, yoyGrowth: 28, openings: 580  },
  { role: "ML / AI Engineer",              category: "Data & AI",   region: "Middle East", city: "Riyadh",     exp: "2-5",  median: 88000,  p25: 70000,  p75: 112000, yoyGrowth: 44, openings: 480  },
  { role: "Product Manager",               category: "Product",     region: "Middle East", city: "Riyadh",     exp: "2-5",  median: 82000,  p25: 66000,  p75: 105000, yoyGrowth: 20, openings: 380  },
  { role: "DevOps / SRE",                  category: "Engineering", region: "Middle East", city: "Riyadh",     exp: "2-5",  median: 70000,  p25: 56000,  p75: 90000,  yoyGrowth: 22, openings: 360  },
];

const REGIONS    = ["All regions", "North America", "Europe", "Asia Pacific", "Middle East"];
const CATEGORIES = ["All", "Engineering", "Data & AI", "Product"];
const EXP_LEVELS = [
  { key: "all",  label: "All experience" },
  { key: "0-2",  label: "0–2 yrs"  },
  { key: "2-5",  label: "2–5 yrs"  },
  { key: "5-10", label: "5–10 yrs" },
  { key: "10+",  label: "10+ yrs"  },
] as const;

/* ── Negotiation tactics ─────────────────────────────────────── */
interface NegTactic { title: string; script: string; power: "high"|"medium"; timing: string; }
const TACTICS: NegTactic[] = [
  { title: "Anchor with market data", power: "high", timing: "When they ask your expectation first",
    script: `"Based on my research, the market range for this role in [city] is $X–$Y. Given my background in [specific skill], I'm targeting the upper end of that range."` },
  { title: "Counter with a specific number", power: "high", timing: "After receiving the first offer",
    script: `"Thank you for the offer of $X. Based on market data and what I bring to this role, I'm looking for $Y. Is there flexibility to get closer to that?"` },
  { title: "Competing offer leverage", power: "high", timing: "When you have another offer",
    script: `"I'm genuinely excited about this role. I do have another offer at $X that I need to respond to by [date]. If you can match or beat that, this is my first choice."` },
  { title: "Delay the salary question", power: "medium", timing: "Early-stage recruiter screen",
    script: `"I'd love to learn more about the scope of the role first. Can we come back to compensation after I understand the full picture?"` },
  { title: "Total comp framing", power: "medium", timing: "When base is stuck but equity/bonus is flexible",
    script: `"I understand the base band is fixed. Can we look at the equity grant or sign-on to bridge the gap? Total comp is what matters to me."` },
  { title: "The silent pause", power: "medium", timing: "Right after hearing the offer number",
    script: `Say "Thank you — let me think about that for a moment." Then go completely silent for 5 seconds. Many recruiters will immediately improve the offer or add "...there may be some flexibility."` },
  { title: "Justify the ask with proof", power: "high", timing: "Any negotiation conversation",
    script: `"The reason I'm asking for $X is [specific skill/project/impact]. [Brief proof point: 'I shipped X that generated Y']. That's why I believe the higher number is justified."` },
];

/* ── Underpaid verdict ───────────────────────────────────────── */
function underpaidVerdict(currentUSD: number, row: SalaryRow, cur: Currency) {
  const diff = ((currentUSD - row.median) / row.median) * 100;
  if (diff >= 15)  return { label: "Well paid",               color: "var(--success)", pct: diff, msg: `You're ${Math.abs(Math.round(diff))}% above the market median. Strong position.` };
  if (diff >= -5)  return { label: "At market rate",          color: "var(--warn)",    pct: diff, msg: `You're at market rate. Good baseline for a raise conversation — push for P75: ${fmtSalary(row.p75, cur)}.` };
  if (diff >= -20) return { label: "Underpaid",               color: "var(--danger)",  pct: diff, msg: `You're ${Math.abs(Math.round(diff))}% below the market median. You have strong grounds to negotiate or switch.` };
  return               { label: "Significantly underpaid",   color: "var(--danger)",  pct: diff, msg: `You're ${Math.abs(Math.round(diff))}% below market. A job switch could mean an immediate ${Math.abs(Math.round(diff))+10}%+ jump.` };
}

/* ── Page ────────────────────────────────────────────────────── */
interface AiNegResult {
  recommendedCounter: number;
  rationale:  string;
  scripts:    string[];
  tactics:    string[];
  redFlags:   string[];
}

export default function SalaryPage() {
  const w = useWindowWidth();
  const mobile = w < 640;
  const { user } = useAuth();
  const [region,    setRegion]    = useState("All regions");
  const [category,  setCategory]  = useState("All");
  const [exp,       setExp]       = useState<"all"|"0-2"|"2-5"|"5-10"|"10+">("all");
  const [search,    setSearch]    = useState("");
  const [sortBy,    setSortBy]    = useState<"median"|"growth"|"openings">("median");
  const [currency,  setCurrency]  = useState<Currency>("USD");
  const [activeTab, setActiveTab] = useState<"browse"|"underpaid"|"negotiate">("browse");
  const [showScript, setShowScript] = useState<number|null>(null);

  // Track XP on first visit
  useEffect(() => { trackAction("salary_checked", 120); }, []);

  // Underpaid checker
  const [upRole, setUpRole]     = useState("");
  const [upCity, setUpCity]     = useState("");
  const [upExp,  setUpExp]      = useState<"0-2"|"2-5"|"5-10"|"10+">("2-5");
  const [upVal,  setUpVal]      = useState("");
  const [upCur,  setUpCur]      = useState<Currency>("USD");

  // Negotiation analyser — local fields
  const [negCurrent,  setNegCurrent]  = useState("");
  const [negOffer,    setNegOffer]    = useState("");
  const [negRole,     setNegRole]     = useState("");
  const [negCity,     setNegCity]     = useState("");
  // Additional fields for AI coach
  const [negExp,      setNegExp]      = useState<"0-2"|"2-5"|"5-10"|"10+">("2-5");
  const [negIndustry, setNegIndustry] = useState("");
  const [negContext,  setNegContext]  = useState("");
  // AI result state
  const [negLoading,  setNegLoading]  = useState(false);
  const [negAiResult, setNegAiResult] = useState<AiNegResult | null>(null);
  const [negAiError,  setNegAiError]  = useState("");
  const [showAiScript, setShowAiScript] = useState<number | null>(null);

  const filtered = useMemo(() => DATA
    .filter(d => region   === "All regions" || d.region   === region)
    .filter(d => category === "All"         || d.category === category)
    .filter(d => exp      === "all"         || d.exp      === exp)
    .filter(d => !search  || d.role.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortBy === "median" ? b.median - a.median : sortBy === "growth" ? b.yoyGrowth - a.yoyGrowth : b.openings - a.openings)
  , [region, category, exp, search, sortBy]);

  const topGainers = [...DATA].filter(d => d.exp === "2-5").sort((a,b) => b.yoyGrowth - a.yoyGrowth).slice(0, 4);
  const allCities  = [...new Set(DATA.map(d => d.city))].sort();
  const allRoles   = [...new Set(DATA.map(d => d.role))].sort();

  // Underpaid result
  const upResult = useMemo(() => {
    if (!upRole || !upVal || !upCity) return null;
    const currentUSD = Number(upVal) * CURRENCIES[upCur].toUSD;
    const row = DATA.find(d => d.role === upRole && d.city === upCity && d.exp === upExp);
    if (!row) return null;
    return { verdict: underpaidVerdict(currentUSD, row, upCur), row, currentUSD };
  }, [upRole, upCity, upExp, upVal, upCur]);

  // Negotiation result
  const negResult = useMemo(() => {
    if (!negCurrent || !negOffer || !negRole || !negCity) return null;
    const rate = CURRENCIES[currency].toUSD;
    const curUSD = Number(negCurrent) * rate;
    const offUSD = Number(negOffer)   * rate;
    const market = DATA.find(d => d.role === negRole && d.city === negCity);
    const hikePct = Math.round(((offUSD - curUSD) / curUSD) * 100);
    const vsMed   = market ? Math.round(((offUSD - market.median) / market.median) * 100) : null;
    return { curUSD, offUSD, hikePct, vsMed, market };
  }, [negCurrent, negOffer, negRole, negCity, currency]);

  // AI coaching call
  async function getAiCoaching() {
    if (!negRole.trim() || !negOffer) return;
    setNegLoading(true);
    setNegAiResult(null);
    setNegAiError("");
    try {
      const expYears: Record<string, number> = { "0-2": 1, "2-5": 3, "5-10": 7, "10+": 12 };
      const res = await fetch("/api/salary/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role:          negRole,
          location:      negCity || undefined,
          currentSalary: negCurrent ? Number(negCurrent) * CURRENCIES[currency].toUSD : undefined,
          offerAmount:   Number(negOffer) * CURRENCIES[currency].toUSD,
          yearsExp:      expYears[negExp],
          industry:      negIndustry || undefined,
          context:       negContext  || undefined,
          currency:      "USD",
        }),
      });
      const data = await res.json() as AiNegResult & { error?: string };
      if (!res.ok || data.error) { setNegAiError(data.error ?? "AI coaching failed. Try again."); return; }
      setNegAiResult(data);
      trackAction("salary_checked");
    } catch { setNegAiError("Network error. Please try again."); }
    finally { setNegLoading(false); }
  }

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };
  const chip = (active: boolean, col = "var(--accent)"): React.CSSProperties => ({
    padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", border: `1px solid ${active ? col + "55" : "var(--border)"}`,
    background: active ? col + "18" : "none", color: active ? col : "var(--text2)", transition: "all .15s",
  });
  const powerCol = { high: "var(--success)", medium: "var(--warn)" };

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 99, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
            <i className="ti ti-world"/> Global · 2025–2026
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>Global Salary Intelligence</h1>
          <p style={{ fontSize: 14, color: "var(--text3)", lineHeight: 1.7, maxWidth: 580 }}>
            Real compensation across North America, Europe, Asia Pacific &amp; the Middle East.
            Benchmark your salary, spot if you're underpaid, and negotiate with data.
          </p>
        </div>

        {/* Currency picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)" }}>Display in:</span>
          {(Object.keys(CURRENCIES) as Currency[]).map(c => (
            <button key={c} onClick={() => setCurrency(c)} style={chip(currency === c, "#8b5cf6")}>
              {CURRENCIES[c].symbol} {c}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--surface2)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {([["browse","Browse"],["underpaid","Am I Underpaid?"],["negotiate","Negotiate"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "7px 16px", borderRadius: 9, border: "none", fontSize: 12, fontWeight: 600,
              background: activeTab === key ? "var(--surface)" : "transparent",
              color: activeTab === key ? "var(--text1)" : "var(--text3)",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,.15)" : "none",
            }}>{label}</button>
          ))}
        </div>

        {/* ══ UNDERPAID ══ */}
        {activeTab === "underpaid" && (
          <div style={{ maxWidth: 620 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Am I underpaid?</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24, lineHeight: 1.7 }}>
              Enter your current salary — we benchmark you against real market data instantly.
            </p>
            <div style={{ ...card, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Currency</label>
                  <select value={upCur} onChange={e => setUpCur(e.target.value as Currency)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    {(Object.keys(CURRENCIES) as Currency[]).map(c => <option key={c} value={c}>{CURRENCIES[c].symbol} {c} — {CURRENCIES[c].name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Current salary ({upCur === "INR" ? "LPA" : "/yr"})</label>
                  <input type="number" placeholder={upCur === "INR" ? "e.g. 25" : "e.g. 120000"} value={upVal} onChange={e => setUpVal(e.target.value)}
                    style={{ padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 15, fontWeight: 600, fontFamily: "inherit", width: "100%" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Role</label>
                <select value={upRole} onChange={e => setUpRole(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                  <option value="">Select role…</option>
                  {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>City</label>
                  <select value={upCity} onChange={e => setUpCity(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="">Select city…</option>
                    {allCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Experience</label>
                  <select value={upExp} onChange={e => setUpExp(e.target.value as typeof upExp)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="0-2">0–2 years</option>
                    <option value="2-5">2–5 years</option>
                    <option value="5-10">5–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
              </div>

              {upResult && (() => {
                const { verdict, row, currentUSD } = upResult;
                const maxUSD = row.p75 * 1.2;
                return (
                  <div style={{ background: "var(--surface)", borderRadius: 14, border: `2px solid ${verdict.color}44`, padding: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: verdict.color }}>{verdict.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: verdict.color }}>{verdict.pct > 0 ? "+" : ""}{Math.round(verdict.pct)}%</div>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>{verdict.msg}</p>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginBottom: 5 }}>
                        <span>P25: {fmtSalary(row.p25, upCur)}</span>
                        <span>Median: {fmtSalary(row.median, upCur)}</span>
                        <span>P75: {fmtSalary(row.p75, upCur)}</span>
                      </div>
                      <div style={{ position: "relative", height: 10, background: "var(--surface2)", borderRadius: 5 }}>
                        <div style={{ position: "absolute", left: `${(row.p25/maxUSD)*100}%`, width: `${((row.p75-row.p25)/maxUSD)*100}%`, height: "100%", background: "rgba(99,102,241,.3)", borderRadius: 5 }} />
                        <div style={{ position: "absolute", left: `${(row.median/maxUSD)*100}%`, transform: "translateX(-50%)", width: 3, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                        <div style={{ position: "absolute", left: `${Math.min(95,Math.max(2,(currentUSD/maxUSD)*100))}%`, transform: "translateX(-50%)", width: 4, height: "140%", top: "-20%", background: verdict.color, borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 11, color: verdict.color, marginTop: 4, fontWeight: 600, textAlign: "right" }}><i className="ti ti-arrow-left"/> You are here</div>
                    </div>
                    {verdict.pct < 0 && (
                      <button onClick={() => { setNegRole(upRole); setNegCity(upCity); setActiveTab("negotiate"); }} style={{ padding: "9px 18px", borderRadius: 9, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        Get the negotiation script <i className="ti ti-arrow-right"/>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ══ NEGOTIATE ══ */}
        {activeTab === "negotiate" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Salary Negotiation Coach</h2>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, maxWidth: 580 }}>
                85% of people who negotiate get more. Most don't because they don't know what to say. Here's your playbook — word for word.
              </p>
            </div>

            {/* Offer analyser */}
            <div style={{ ...card, padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}><i className="ti ti-layout-list"/> Analyse this offer</h3>
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[
                  { label: `Current salary (${currency}${currency==="INR"?" LPA":"/yr"})`, val: negCurrent, set: setNegCurrent, ph: currency==="INR"?"e.g. 25":"e.g. 120000" },
                  { label: `Offer amount (${currency}${currency==="INR"?" LPA":"/yr"})`,    val: negOffer,   set: setNegOffer,   ph: currency==="INR"?"e.g. 38":"e.g. 160000" },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{f.label}</label>
                    <input type="number" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)}
                      style={{ padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 14, fontFamily: "inherit", width: "100%" }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Role</label>
                  <select value={negRole} onChange={e => { setNegRole(e.target.value); setNegAiResult(null); }} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="">Select role…</option>
                    {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>City</label>
                  <select value={negCity} onChange={e => { setNegCity(e.target.value); setNegAiResult(null); }} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="">Select city…</option>
                    {allCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Experience</label>
                  <select value={negExp} onChange={e => setNegExp(e.target.value as typeof negExp)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }}>
                    <option value="0-2">0–2 years</option>
                    <option value="2-5">2–5 years</option>
                    <option value="5-10">5–10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Industry (optional)</label>
                  <input placeholder="e.g. Fintech, Healthcare, SaaS…" value={negIndustry} onChange={e => setNegIndustry(e.target.value)}
                    style={{ padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", width: "100%" }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Extra context for AI (optional)</label>
                <textarea placeholder="e.g. I have a competing offer from Google at $175K. The role is remote. They mentioned equity could be flexible…" value={negContext} onChange={e => setNegContext(e.target.value)} rows={2}
                  style={{ padding: "10px 13px", borderRadius: 9, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit", width: "100%", resize: "vertical" }} />
              </div>

              {/* AI coaching button */}
              {user ? (
                <button
                  onClick={getAiCoaching}
                  disabled={negLoading || !negRole.trim() || !negOffer}
                  style={{ padding: "11px 22px", background: "var(--accent)", border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: negLoading || !negRole.trim() || !negOffer ? "not-allowed" : "pointer", opacity: !negRole.trim() || !negOffer ? 0.5 : 1, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                  {negLoading ? <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }}/> Analysing…</> : <><i className="ti ti-brain"/> Get AI coaching</>}
                </button>
              ) : (
                <div style={{ padding: "12px 16px", background: "var(--accdim)", borderRadius: 9, border: "1px solid var(--accborder)", fontSize: 13, color: "var(--text2)" }}>
                  <Link href="/sign-in" style={{ color: "var(--accent)", fontWeight: 700 }}>Sign in</Link> to get personalised AI counter-offer scripts and coaching.
                </div>
              )}
              {negAiError && <div style={{ marginTop: 10, fontSize: 13, color: "var(--danger)" }}>{negAiError}</div>}

              {/* AI result */}
              {negAiResult && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Counter recommendation */}
                  <div style={{ padding: 20, background: "var(--accdim)", borderRadius: 12, border: "1px solid var(--accborder)" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>AI recommended counter</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: "var(--accent)", letterSpacing: "-.03em" }}>
                      {CURRENCIES[currency].symbol}{Math.round(negAiResult.recommendedCounter / CURRENCIES[currency].toUSD).toLocaleString()}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 8, lineHeight: 1.7 }}>{negAiResult.rationale}</p>
                  </div>

                  {/* Red flags */}
                  {negAiResult.redFlags.length > 0 && (
                    <div style={{ padding: "14px 16px", background: "rgba(239,68,68,.08)", borderRadius: 10, border: "1px solid rgba(239,68,68,.2)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--danger)", marginBottom: 8 }}><i className="ti ti-alert-triangle"/> Watch out</div>
                      {negAiResult.redFlags.map((f, i) => (
                        <div key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>• {f}</div>
                      ))}
                    </div>
                  )}

                  {/* Ready-to-send scripts */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text1)" }}><i className="ti ti-message"/> Ready-to-send scripts</div>
                    {negAiResult.scripts.map((script, i) => (
                      <div key={i} style={{ ...card, overflow: "hidden", marginBottom: 6 }}>
                        <button onClick={() => setShowAiScript(showAiScript === i ? null : i)} style={{ width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
                            {i === 0 ? "📧 Formal email" : i === 1 ? "💬 Conversational" : "📞 Verbal / phone"}
                          </span>
                          <span style={{ color: "var(--text3)" }}>{showAiScript === i ? "▲" : "▼"}</span>
                        </button>
                        {showAiScript === i && (
                          <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border2)" }}>
                            <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--surface2)", borderRadius: 9, fontSize: 13, color: "var(--text2)", lineHeight: 1.8, borderLeft: "3px solid var(--accent)", fontStyle: "italic", whiteSpace: "pre-wrap" }}>{script}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Tactics */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text1)" }}><i className="ti ti-target"/> Tactics for your situation</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {negAiResult.tactics.map((t, i) => (
                        <div key={i} style={{ padding: "10px 14px", background: "var(--surface)", borderRadius: 9, border: "1px solid var(--border)", fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{i + 1}. </span>{t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick local analysis (static) */}
              {negResult && (() => {
                const { hikePct, vsMed, market } = negResult;
                const shouldCounter = market ? negResult.offUSD < market.p75 : hikePct < 20;
                const targetLocal   = market ? fmtSalary(market.p75, currency) : null;
                return (
                  <div style={{ background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)", padding: 20 }}>
                    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>Hike</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: hikePct >= 30 ? "var(--success)" : hikePct >= 15 ? "var(--warn)" : "var(--danger)" }}>+{hikePct}%</div>
                      </div>
                      {vsMed !== null && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>vs market median</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: vsMed >= 10 ? "var(--success)" : vsMed >= -10 ? "var(--warn)" : "var(--danger)" }}>{vsMed > 0?"+":""}{vsMed}%</div>
                        </div>
                      )}
                      {targetLocal && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>P75 target</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--accent)" }}>{targetLocal}</div>
                        </div>
                      )}
                    </div>
                    {shouldCounter ? (
                      <div style={{ padding: 16, background: "var(--accdim)", borderRadius: 10, border: "1px solid var(--accborder)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}><i className="ti ti-bulb"/> Counter this offer. Here's what to say:</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, fontStyle: "italic" }}>
                          {`"Thank you for the offer — I'm excited about this role. Based on my research, the market range for this position in ${negCity} is ${market ? fmtSalary(market.p25, currency) : "—"}–${targetLocal ?? "—"}. Given my experience, I'm targeting ${targetLocal ?? "the upper range"}. Is there flexibility to get closer to that?"`}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: 16, background: "rgba(34,197,94,.06)", borderRadius: 10, border: "1px solid rgba(34,197,94,.2)" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 4 }}><i className="ti ti-circle-check"/> Strong offer — at or above P75 market rate.</div>
                        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>Still worth asking for equity or sign-on bonus. Asking once never hurts.</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Tactics library */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}><i className="ti ti-target"/> Proven negotiation tactics</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TACTICS.map((t, i) => (
                <div key={i} style={{ ...card, overflow: "hidden" }}>
                  <button onClick={() => setShowScript(showScript === i ? null : i)} style={{
                    width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontFamily: "inherit",
                  }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text1)" }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>When: {t.timing}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: powerCol[t.power]+"20", color: powerCol[t.power], border: `1px solid ${powerCol[t.power]}44` }}>{t.power} impact</span>
                      <span style={{ color: "var(--text3)" }}>{showScript === i ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {showScript === i && (
                    <div style={{ padding: "0 18px 16px", borderTop: "1px solid var(--border2)" }}>
                      <div style={{ marginTop: 14, padding: "14px 16px", background: "var(--surface2)", borderRadius: 10, fontSize: 13, color: "var(--text2)", lineHeight: 1.7, fontStyle: "italic", borderLeft: "3px solid var(--accent)" }}>
                        {t.script}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "var(--accdim)", border: "1px solid var(--accborder)", fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              <i className="ti ti-bulb"/> <strong style={{ color: "var(--accent)" }}>Always negotiate.</strong> The worst outcome is "no" — you keep the offer. The best outcome adds $5K–$30K with a single 5-minute conversation.
            </div>
          </div>
        )}

        {/* ══ BROWSE ══ */}
        {activeTab === "browse" && (
          <>
            {/* Hot roles */}
            <div style={{ ...card, padding: "18px 20px", marginBottom: 24, background: "linear-gradient(135deg,rgba(99,102,241,.06),rgba(99,102,241,.02))", borderColor: "var(--accborder)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}><i className="ti ti-flame"/> Fastest-growing roles globally (2025–26 YoY)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 10 }}>
                {topGainers.map(r => (
                  <div key={r.role+r.city} style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 9, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text1)", marginBottom: 2, lineHeight: 1.3 }}>{r.role}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>{r.city}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)" }}>+{r.yoyGrowth}%</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>YoY · {fmtSalary(r.median, currency)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {REGIONS.map(r => <button key={r} style={chip(region === r)} onClick={() => setRegion(r)}>{r}</button>)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {CATEGORIES.map(c => <button key={c} style={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {EXP_LEVELS.map(e => <button key={e.key} style={chip(exp === e.key, "#a78bfa")} onClick={() => setExp(e.key as typeof exp)}>{e.label}</button>)}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search role or city…"
                style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text1)", fontSize: 13, fontFamily: "inherit" }} />
              <div style={{ display: "flex", gap: 2, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", padding: 3 }}>
                {[["median","Salary"],["growth","Growth"],["openings","Openings"]].map(([k,l]) => (
                  <button key={k} onClick={() => setSortBy(k as typeof sortBy)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", fontSize: 12, fontWeight: 600, background: sortBy===k?"var(--accent)":"transparent", color: sortBy===k?"#fff":"var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px", color: "var(--text3)", fontSize: 13 }}>No data for this combination. Try different filters.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map((row, i) => (
                  <div key={i} style={{ ...card, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)", marginBottom: 3 }}>{row.role}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)" }}>{row.city} · {row.region} · {row.exp} yrs · {row.openings.toLocaleString()} openings</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 100 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent)", letterSpacing: "-.03em" }}>{fmtSalary(row.median, currency)}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>median/yr</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{fmtSalary(row.p25, currency)} – {fmtSalary(row.p75, currency)}</div>
                      </div>
                      <div style={{ minWidth: 140, display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
                        <div style={{ position: "relative", height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ position: "absolute", left: `${(row.p25/(row.p75*1.2))*100}%`, width: `${((row.p75-row.p25)/(row.p75*1.2))*100}%`, height: "100%", background: "rgba(99,102,241,.3)", borderRadius: 4 }} />
                          <div style={{ position: "absolute", left: `${(row.median/(row.p75*1.2))*100}%`, transform: "translateX(-50%)", width: 3, height: "100%", background: "var(--accent)", borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: 55 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: row.yoyGrowth>=20?"var(--success)":row.yoyGrowth>=10?"var(--warn)":"var(--text2)" }}>+{row.yoyGrowth}%</div>
                        <div style={{ fontSize: 11, color: "var(--text3)" }}>YoY</div>
                      </div>
                      <button onClick={() => { setNegRole(row.role); setNegCity(row.city); setActiveTab("negotiate"); }} style={{ padding: "7px 14px", borderRadius: 8, background: "var(--accdim)", border: "1px solid var(--accborder)", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Negotiate <i className="ti ti-arrow-right"/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 28, padding: "14px 18px", background: "var(--surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.7 }}>
                <strong style={{ color: "var(--text2)" }}>Sources:</strong> 2025–2026 offer letters, levels.fyi, Glassdoor, and community-reported compensation. All figures annual gross pre-tax. INR shown as LPA.{" "}
                <Link href="/builder" style={{ color: "var(--accent)" }}>Build your resume <i className="ti ti-arrow-right"/></Link>
              </p>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
