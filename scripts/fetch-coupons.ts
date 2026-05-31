import { writeFileSync, mkdirSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

// 通过 Cloudflare Worker 代理 activity.szlcsc.com
const COUPON_API =
  "https://fragrant-firefly-4720.xiaowine0.workers.dev/phone/activity/coupon?target=activity";
const BRAND_API = (brandId: string) =>
  `https://fragrant-firefly-4720.xiaowine0.workers.dev/phone/p/brand/${brandId}?showOutSockProduct=0&pageSize=1&pageNumber=1`;

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/538.36 Edg/128.0.0.0",
};

interface RawCoupon {
  couponName: string;
  brandNames: string;
  brandIds: string;
  couponActivityName: string;
  minOrderMoney: number;
  couponAmount: number;
  receiveCustomerNum: number;
}

interface CouponDetail {
  coupon_name: string;
  brand_name: string;
  brand_id: string;
  activity_name: string;
  min_order_amount: number;
  coupon_amount: number;
  min_order_after_discount: number;
  receive_customer_num: number;
  catalog_groups: string[];
}

interface SimpleCouponDetail {
  coupon_name: string;
  brand_name: string;
  brand_id: string;
  min_order_amount: number;
  coupon_amount: number;
}

/** 简单并发限制器，等效于 ThreadPoolExecutor(max_workers=N) */
function createLimiter(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  return async function <T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

// ── Cookie 挑战缓存（5 min TTL）──────────────────────────────────────────────
let cookieCache: { value: string; expiresAt: number } | null = null;

function getCachedCookie(): string | null {
  if (cookieCache && Date.now() < cookieCache.expiresAt)
    return cookieCache.value;
  cookieCache = null;
  return null;
}

function setCachedCookie(value: string) {
  cookieCache = { value, expiresAt: Date.now() + 4 * 60 * 1000 };
}

/**
 * 在 Node.js vm 沙箱中执行 SZLCSC 的 JS Cookie 挑战，提取 "name=value"。
 *
 * 挑战流程：服务器返回 203 + 一段 obfuscated JS，该 JS 用 RC4 算出
 * tws2_XXXX=BASE64 并写入 document.cookie，然后调用 window.location.reload()。
 *
 * 反调试障碍及绕过方式：
 *  1. Function('while(true){}') → 替换为 Function('return')，避免死循环
 *  2. Function('debugger')()   → 替换为 Function('return')，避免触发 VSCode 调试器
 *  3. RegExp.test() 反篡改检查 → 沙箱中覆盖 RegExp，让 .test() 始终返回 true，
 *     使反调试走可自行恢复的堆栈溢出分支而非死循环分支
 */
function solveCookieChallenge(html: string): string | null {
  let capturedCookie = "";

  class BenignRegExp extends RegExp {
    test(_str: string): boolean {
      return true;
    }
  }

  const sandbox = createContext({
    window: { location: { reload: () => {} } },
    document: Object.defineProperty({} as Record<string, unknown>, "cookie", {
      get: () => capturedCookie,
      set: (v: string) => {
        capturedCookie = String(v);
      },
      configurable: true,
    }),
    btoa: globalThis.btoa,
    String,
    Date,
    parseInt,
    parseFloat,
    Math,
    RegExp: BenignRegExp,
  });

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
  for (const src of scripts) {
    // 将死循环/断点字符串替换为 return，防止 VSCode 调试器卡住
    const patched = src
      .replace(/'while\\x20\\(true\\)\\x20\\{\\}'/g, "'return'")
      .replace(/'debu'\+'gger'/g, "'return'")
      .replace(/'debu'\+\w+\(\w+\)/g, "'return'");
    try {
      runInContext(patched, sandbox, { timeout: 5_000 });
    } catch {
      // 堆栈溢出由挑战代码自身的 try/catch 捕获，其余异常忽略
    }
  }

  if (!capturedCookie) return null;
  return capturedCookie.split(";")[0].trim();
}

async function fetchJson(
  url: string,
  timeoutMs = 30_000,
  retrying = false,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { ...HEADERS };
  const cached = getCachedCookie();
  if (cached) headers["Cookie"] = cached;

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      if (retrying)
        throw new Error(`Cookie 重试后仍非 JSON 响应 [${res.status}]`);

      const body = await res.text();
      const cookie = solveCookieChallenge(body);
      if (!cookie) throw new Error(`非 JSON 响应且无法解析 Cookie 挑战`);

      setCachedCookie(cookie);
      console.log(`🍪 JS Cookie 挑战已解决: ${cookie.split("=")[0]}=...`);
      return fetchJson(url, timeoutMs, true);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getBrandCategories(brandId: string): Promise<string[]> {
  const maxRetries = 3;
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = (await fetchJson(BRAND_API(brandId))) as {
        result?: { searchResult?: { catalogGroup?: { label: string }[] } };
      };
      const groups = data?.result?.searchResult?.catalogGroup ?? [];
      return groups.map((g) => g.label).sort();
    } catch (e) {
      if (attempt < maxRetries) {
        console.warn(`品牌 ${brandId} 分类获取失败，${attempt}次重试: ${e}`);
        await delay(10000);
      } else {
        console.warn(`品牌 ${brandId} 分类获取失败，已跳过: ${e}`);
        return [];
      }
    }
  }
  return [];
}

function getShanghaITime(): string {
  // 使用 en-US locale 解析上海时间后格式化，避免 zh-CN 格式差异
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

async function main() {
  console.log("开始获取优惠券数据...");

  const couponData = (await fetchJson(COUPON_API)) as {
    result?: { CouponModelVOListMap?: Record<string, RawCoupon[]> };
  };

  const couponMap = couponData?.result?.CouponModelVOListMap ?? {};

  // 过滤有效优惠券（与 Python 逻辑一致）
  const validCoupons: RawCoupon[] = [];
  for (const [category, coupons] of Object.entries(couponMap)) {
    if (category === "plus") continue;
    for (const coupon of coupons) {
      if (
        !coupon.couponName.includes("新人") &&
        coupon.couponName.includes("品牌")
      ) {
        if (coupon.minOrderMoney - coupon.couponAmount <= 15) {
          validCoupons.push(coupon);
        }
      }
    }
  }

  console.log(
    `有效的优惠券：${validCoupons.map((c) => c.couponName).join("、")}`,
  );
  console.log(`总共需要处理 ${validCoupons.length} 个有效优惠券`);

  const classified: Record<string, CouponDetail[]> = {};
  const simple: Record<string, SimpleCouponDetail> = {};

  const limit = createLimiter(10);
  let completed = 0;

  await Promise.all(
    validCoupons.map((coupon) =>
      limit(async () => {
        const categories = await getBrandCategories(coupon.brandIds);

        const detail: CouponDetail = {
          coupon_name: coupon.couponName,
          brand_name: coupon.brandNames,
          brand_id: coupon.brandIds,
          activity_name: coupon.couponActivityName,
          min_order_amount: coupon.minOrderMoney,
          coupon_amount: coupon.couponAmount,
          min_order_after_discount: coupon.minOrderMoney - coupon.couponAmount,
          receive_customer_num: coupon.receiveCustomerNum,
          catalog_groups: categories,
        };

        for (const cat of categories) {
          (classified[cat] ??= []).push(detail);
        }

        simple[coupon.brandIds] = {
          coupon_name: coupon.couponName,
          brand_name: coupon.brandNames,
          brand_id: coupon.brandIds,
          min_order_amount: coupon.minOrderMoney,
          coupon_amount: coupon.couponAmount,
        };

        completed++;
        console.log(
          `已完成 ${completed}/${validCoupons.length} 个优惠券处理任务`,
        );
      }),
    ),
  );

  // 按分类名排序（与 Python sorted() 一致）
  const sortedClassified = Object.fromEntries(
    Object.entries(classified).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );

  mkdirSync("public", { recursive: true });

  writeFileSync(
    "public/coupon_details.json",
    JSON.stringify(sortedClassified),
    "utf-8",
  );
  console.log("优惠券信息已保存到 public/coupon_details.json 文件中");

  writeFileSync(
    "public/simple_coupon_details.json",
    JSON.stringify(simple),
    "utf-8",
  );
  console.log(
    "简洁优惠券信息已保存到 public/simple_coupon_details.json 文件中",
  );

  const formattedTime = getShanghaITime();
  writeFileSync("public/run_time.txt", formattedTime, "utf-8");
  console.log(`运行时间已保存: ${formattedTime}`);
}

main().catch((e) => {
  console.error("脚本执行失败:", e);
  process.exit(1);
});
