from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from functools import lru_cache
from json import dump
from re import search
from bs4 import BeautifulSoup, Tag
from requests import Session, RequestException

headers = {
    'User-Agent': f'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 '
                  f'Safari/537.36 Edg/127.0.0.0'
}
session = Session()
session.headers.update(headers)


@lru_cache
def fetch_and_parse(url: str) -> BeautifulSoup | None:
    try:
        response = session.get(url, headers=headers)
        response.raise_for_status()
    except RequestException as e:
        print(f"提取时出错：{e}")
        return None
    if "aliyunwaf" in response.text:
        print("被阿里云WAF拦截")
        exit()
    return BeautifulSoup(response.text, 'html.parser')


def extract_number_from_string(s: str) -> Decimal:
    match = search(r'\d+(\.\d+)?', s)
    return Decimal(match.group()) if match else None


def extract_coupon_details(coupon_item: Tag) -> (str, str, str):
    coupon_details = coupon_item.find(class_="coupon-item-con")
    tips = coupon_details.find(class_="condition-brought").div.text
    money = coupon_details.find(class_="coupon-item-top-title").div.find(class_="money").text
    name = coupon_details.find(class_="coupon-item-name").h3.text.replace(" ", "").replace("\n", "")
    return name, tips, money


def process_coupon_name(name: str) -> bool:
    return "新人专享" not in name


def get_board_items(url: str) -> list:
    parsed_board_html = fetch_and_parse(url)
    if parsed_board_html:
        return [i.get('title') for i in
                parsed_board_html.find(id="CategoryList").find_all(class_="span-first")]
    return []


def get_board_name(coupon_string):
    match = search(r'元(.+?)品牌优惠', coupon_string)
    return match.group(1) if match else None


def process_coupon_item(item: Tag) -> dict:
    name, tips, money = extract_coupon_details(item)
    if process_coupon_name(name):
        difference = extract_number_from_string(tips) - Decimal(money)
        url = item.div.get('data-url')
        if "品牌" in name:
            board_items = get_board_items(url)
            board_name = get_board_name(name)
            if difference <= 50:
                print(f"{board_name} {name} {tips} 优惠{money} 差价{difference}", board_items)
                return {
                    "board_name": board_name,
                    "details": f"{name} {tips} 优惠{money} 差价{difference}",
                    "board_items": board_items,
                    "board_url": url
                }


if __name__ == '__main__':
    url = "https://www.szlcsc.com/huodong.html"
    parsed_html = fetch_and_parse(url)
    if parsed_html:
        coupon_items = parsed_html.select("div[class=coupon-item]")
        with ThreadPoolExecutor() as executor:
            coupon_details_list = list(executor.map(process_coupon_item, coupon_items))
        coupon_details_list = [item for item in coupon_details_list if item is not None]
        with open('html/coupon_details.json', 'w', encoding='utf-8') as f:
            dump(coupon_details_list, f, ensure_ascii=False, indent=2)
