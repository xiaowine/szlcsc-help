from datetime import datetime

import requests
import json
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError

from pytz import timezone


def get_coupons(url: str) -> dict | None:
    headers = {
        'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/127.0.0.0 Safari/538.36 Edg/128.0.0.0')
    }
    try:
        with requests.Session() as session:
            session.headers.update(headers)
            response = session.get(url)
            response.raise_for_status()
            return response.json()
    except requests.RequestException as e:
        print(f"请求错误: {e}")
        return None
    except KeyboardInterrupt:
        print("用户中断")
        return None


def fetch_brand_info(brand_id: str) -> list[str]:
    brand_url = f"https://list.szlcsc.com/phone/p/brand/{brand_id}?showOutSockProduct=0&pageSize=1&pageNumber=1"
    try:
        brand_info = get_coupons(brand_url)
        if brand_info:
            return [i["label"] for i in brand_info.get("result", {}).get("searchResult", {}).get("catalogGroup", [])]
    except Exception as e:
        print(f"获取品牌信息失败: {e}")
    return []


def get_coupon_details(coupon: dict) -> dict:
    catalog_groups = fetch_brand_info(coupon['brandIds'])
    return {
        "coupon_name": coupon['couponName'],
        "brand_name": coupon['brandNames'],
        "brand_id": coupon['brandIds'],
        "activity_name": coupon['couponActivityName'],
        "min_order_amount": coupon['minOrderMoney'],
        "coupon_amount": coupon['couponAmount'],
        "min_order_after_discount": coupon['minOrderMoney'] - coupon['couponAmount'],
        "catalog_groups": catalog_groups
    }


def filter_and_classify_coupons(coupons: dict) -> dict:
    coupon_map = coupons.get("result", {}).get("CouponModelVOListMap", {})
    classified_coupons = defaultdict(list)

    valid_coupons = []
    for category, coupons_list in coupon_map.items():
        if category != "plus":
            for coupon in coupons_list:
                if "<新人专享>" not in coupon["couponName"] and "品牌" in coupon["couponName"]:
                    discount_diff = coupon['minOrderMoney'] - coupon['couponAmount']
                    if discount_diff <= 15:
                        valid_coupons.append(coupon)

    valid_coupons_count = len(valid_coupons)
    print(f"总共需要处理 {valid_coupons_count} 个有效优惠券")

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(get_coupon_details, coupon): coupon for coupon in valid_coupons}
        completed = 0

        for future in as_completed(futures, timeout=600):  # 设置超时时间
            try:
                details = future.result()
                for group in details["catalog_groups"]:
                    classified_coupons[group].append(details)
                completed += 1
                print(f"已完成 {completed}/{valid_coupons_count} 个优惠券处理任务")
            except TimeoutError:
                print(f"处理超时: {futures[future]}")
            except Exception as e:
                print(f"处理错误: {e}")

    return classified_coupons


if __name__ == '__main__':
    url = "https://activity.szlcsc.com/phone/activity/coupon"
    coupons = get_coupons(url)
    if coupons:
        classified_coupons = filter_and_classify_coupons(coupons)
        with open("html/coupon_details.json", "w", encoding="utf-8") as f:
            json.dump(classified_coupons, f, ensure_ascii=False, indent=4)
        print("优惠券信息已保存到 html/coupon_details.json 文件中")
        with open("html/run_time.txt", "w") as f:
            china_tz = timezone('Asia/Shanghai')
            current_time = datetime.now(china_tz)
            formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
            f.write(formatted_time)
    else:
        print("没有找到优惠券信息")
