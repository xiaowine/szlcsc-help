from datetime import datetime

import requests
import json
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from pytz import timezone


def fetch_api_data(url: str) -> dict | None:
    print(f"开始获取API数据: {url}")
    browser_headers = {
        'User-Agent': ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/127.0.0.0 Safari/538.36 Edg/128.0.0.0')
    }
    try:
        with requests.Session() as session:
            session.headers.update(browser_headers)
            api_response = session.get(url)
            api_response.raise_for_status()
            return api_response.json()
    except requests.RequestException as error:
        print(f"API请求失败: {error}")
        return None
    except KeyboardInterrupt:
        print("用户手动中断操作")
        return None


def get_brand_categories(brand_id: str) -> list[str]:
    brand_api_url = f"https://fragrant-firefly-4720.xiaowine0.workers.dev/phone/p/brand/{brand_id}?showOutSockProduct=0&pageSize=1&pageNumber=1"
    try:
        brand_data = fetch_api_data(brand_api_url)
        if brand_data:
            return [category["label"] for category in
                    brand_data.get("result", {}).get("searchResult", {}).get("catalogGroup", [])]
    except Exception as error:
        print(f"获取品牌类别失败: {error}")
    return []


def parse_coupon_details(coupon_data: dict) -> dict:
    product_categories = get_brand_categories(coupon_data['brandIds'])
    product_categories = sorted(product_categories)
    parsed_details = {
        "coupon_name": coupon_data['couponName'],
        "brand_name": coupon_data['brandNames'],
        "brand_id": coupon_data['brandIds'],
        "activity_name": coupon_data['couponActivityName'],
        "min_order_amount": coupon_data['minOrderMoney'],
        "coupon_amount": coupon_data['couponAmount'],
        "min_order_after_discount": coupon_data['minOrderMoney'] - coupon_data['couponAmount'],
        "receive_customer_num": coupon_data['receiveCustomerNum'],
        "catalog_groups": product_categories
    }
    return parsed_details


def parse_simple_coupon_details(coupon_data: dict) -> dict:
    parsed_details = {
        "coupon_name": coupon_data['couponName'],
        "brand_name": coupon_data['brandNames'],
        "brand_id": coupon_data['brandIds'],
        "min_order_amount": coupon_data['minOrderMoney'],
        "coupon_amount": coupon_data['couponAmount']
    }
    return parsed_details


def filter_and_classify_coupons(coupons: dict) -> [dict, dict]:
    coupon_map = coupons.get("result", {}).get("CouponModelVOListMap", {})
    classified_coupons = defaultdict(list)
    simple_classified_coupons = {}

    valid_coupons = []
    for category, coupons_list in coupon_map.items():
        if category != "plus":
            for coupon in coupons_list:
                if "<新人专享>" not in coupon["couponName"] and "品牌" in coupon["couponName"]:
                    discount_diff = coupon['minOrderMoney'] - coupon['couponAmount']
                    if discount_diff <= 15:
                        valid_coupons.append(coupon)
    print(f"有效的优惠券：{[i['couponName'] for i in valid_coupons]} ")

    valid_coupons_count = len(valid_coupons)
    print(f"总共需要处理 {valid_coupons_count} 个有效优惠券")

    with ThreadPoolExecutor(max_workers=10) as executor:
        # 提交详细优惠券信息处理任务
        detail_futures = {executor.submit(parse_coupon_details, coupon): coupon for coupon in valid_coupons}
        # 提交简单优惠券信息处理任务
        simple_futures = {executor.submit(parse_simple_coupon_details, coupon): coupon for coupon in valid_coupons}
        completed = 0

        # 处理详细信息结果
        for future in as_completed(detail_futures, timeout=600):  # 设置超时时间
            try:
                details = future.result()
                for group in details["catalog_groups"]:
                    classified_coupons[group].append(details)
                completed += 1
                print(f"已完成 {completed}/{valid_coupons_count} 个详细优惠券处理任务")
            except TimeoutError:
                print(f"处理详细信息超时: {detail_futures[future]}")
            except Exception as e:
                print(f"处理详细信息错误: {e}")

        # 处理简单信息结果
        completed = 0
        for future in as_completed(simple_futures, timeout=300):  # 简单处理设置较短超时时间
            try:
                details = future.result()
                brand_id = details["brand_id"]
                simple_classified_coupons[brand_id] = details
                completed += 1
                print(f"已完成 {completed}/{valid_coupons_count} 个简单优惠券处理任务")
            except TimeoutError:
                print(f"处理简单信息超时: {simple_futures[future]}")
            except Exception as e:
                print(f"处理简单信息错误: {e}")

    return [classified_coupons, simple_classified_coupons]


if __name__ == '__main__':
    url = "https://activity.szlcsc.com/phone/activity/coupon"
    coupons = fetch_api_data(url)
    if coupons:
        all_classified_coupons = filter_and_classify_coupons(coupons)
        classified_coupons = all_classified_coupons[0]
        simple_classified_coupons = all_classified_coupons[1]
        classified_coupons = {k: classified_coupons[k] for k in sorted(classified_coupons)}
        with open("html/coupon_details.json", "w", encoding="utf-8") as f:
            json.dump(classified_coupons, f, ensure_ascii=False)
            print("优惠券信息已保存到 html/coupon_details.json 文件中")
        with open("html/simple_coupon_details.json", "w", encoding="utf-8") as f:
            json.dump(simple_classified_coupons, f, ensure_ascii=False)
            print("简洁优惠券信息已保存到 html/simple_coupon_details.json 文件中")
        with open("html/run_time.txt", "w") as f:
            china_tz = timezone('Asia/Shanghai')
            current_time = datetime.now(china_tz)
            formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
            f.write(formatted_time)
    else:
        print("没有找到优惠券信息")
