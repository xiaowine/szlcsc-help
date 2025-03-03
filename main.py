from datetime import datetime

import requests
import json
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError

from pytz import timezone

import os
import re
import fnmatch

tmpdir = '/tmp/lcsc-tmp'
os.makedirs(tmpdir, exist_ok=True)

def get_coupons(url: str) -> dict | None:
    def clean_string(input_str):
        cleaned_str = re.sub(r'[^a-zA-Z0-9]', '_', input_str) # 将非字母、非数字字符替换为下划线
        cleaned_str = re.sub(r'_+', '_', cleaned_str) # 将连续多个下划线替换为一个下划线
        return cleaned_str

    cache_file = f"{tmpdir}/{clean_string(url) }"

    if os.path.exists(cache_file) and os.path.getsize(cache_file) > 1024*100 :
        print(f"读缓存文件 {cache_file}")
        json_text = open(cache_file).read()
        return json.loads(json_text)

    print(f"准备连接获取 {url}")
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

            with open(cache_file, 'w') as f:
                f.write(response.text)
                f.flush()

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
    catalog_groups = sorted(catalog_groups)
    result = {
        "coupon_name": coupon['couponName'],
        "brand_name": coupon['brandNames'],
        "brand_id": coupon['brandIds'],
        "activity_name": coupon['couponActivityName'],
        "min_order_amount": coupon['minOrderMoney'],
        "coupon_amount": coupon['couponAmount'],
        "min_order_after_discount": coupon['minOrderMoney'] - coupon['couponAmount'],
        "receive_customer_num": coupon['receiveCustomerNum'],
        "catalog_groups": catalog_groups
    }
    print(result)
    return result


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
    print(f"有效的优惠券：{ [ i['couponName'] for i in valid_coupons ]} ")

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

def parse_more_info():
    catagories_numbers = {}

    brand_files_list = [f for f in os.listdir(tmpdir) if fnmatch.fnmatch(f, "https*brand*")]

    brand_more_info = {}
    for brand_file in brand_files_list:
        brandInfo = json.loads(open(f"{tmpdir}/{brand_file}").read())

        brand_name =    brandInfo["result"]["searchResult"]["currentBrand"]["productGradePlateName"]
        brand_id =      brandInfo["result"]["searchResult"]["currentBrand"]["productGradePlateId"]
        brand_url =     f"https://list.szlcsc.com/brand/{brand_id}.html"
        brand_website = brandInfo["result"]["searchResult"]["currentBrand"]["companyWebsite"]
        brand_desc =    brandInfo["result"]["searchResult"]["currentBrand"]["companyContext"]

        brand_catalogGroup = brandInfo["result"]["searchResult"]["catalogGroup"]
        for group in brand_catalogGroup:
            groupLabel = group['label']
            groupValue = group['value']

            if not groupLabel in catagories_numbers:
                groupCount = group['count']
            else:
                groupCount = group['count'] + catagories_numbers [groupLabel] ['count']

            catagories_numbers [groupLabel] = {
                'id': groupValue,
                'url': f"https://list.szlcsc.com/catalog/{groupValue}.html",
                'count': groupCount,
            }


        def extract_brand_disp_name(brand_name):
            match = re.search(r'\((.*?)\)', brand_name) # 使用正则表达式匹配括号内的内容
            if match:
                return match.group(1) # 如果找到括号，返回括号内的内容
            else:
                return brand_name # 如果没有括号，返回原字符串

        brandResult = {
            'brand_name': brand_name,
            'brand_id':   brand_id,
            'brand_name_disp': extract_brand_disp_name(brand_name),
            'brand_url': brand_url,
            'brand_website': brand_website,
            'brand_desc': brand_desc,
        }
        brand_more_info [brand_name] = brandResult

    print(f"已取得 {len(brand_more_info)} 个品牌的更多资料")
    brand_more_info = {k: brand_more_info[k] for k in sorted(brand_more_info)}

    print(f"已取得 {len(catagories_numbers)} 个分类的更多资料")
    catagories_numbers = {k: catagories_numbers[k] for k in sorted(catagories_numbers)}


    with open("html/brand_more_info.json", 'w') as f:
        f.write(json.dumps(brand_more_info, ensure_ascii=False, indent=2))
        f.flush()
    with open("html/catagories_numbers.json", 'w') as f:
        f.write(json.dumps(catagories_numbers, ensure_ascii=False, indent=2))
        f.flush()


if __name__ == '__main__':
    url = "https://activity.szlcsc.com/phone/activity/coupon"
    coupons = get_coupons(url)
    if coupons:
        classified_coupons = filter_and_classify_coupons(coupons)
        classified_coupons = {k: classified_coupons[k] for k in sorted(classified_coupons)}
        with open("html/coupon_details.json", "w", encoding="utf-8") as f:
            json.dump(classified_coupons, f, ensure_ascii=False, indent=4)
        print("优惠券信息已保存到 html/coupon_details.json 文件中")
        with open("html/run_time.txt", "w") as f:
            china_tz = timezone('Asia/Shanghai')
            current_time = datetime.now(china_tz)
            formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
            f.write(formatted_time)

        parse_more_info()
    else:
        print("没有找到优惠券信息")
