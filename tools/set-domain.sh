#!/usr/bin/env bash
# الاستخدام: ./tools/set-domain.sh https://your-domain.com
# يستبدل النطاق التجريبي في index.html و robots.txt و sitemap.xml بنطاقك الحقيقي.
set -euo pipefail
[ $# -eq 1 ] || { echo "usage: $0 https://your-domain.com"; exit 1; }
DOMAIN="${1%/}"
case "$DOMAIN" in https://*) ;; *) echo "النطاق يجب أن يبدأ بـ https://"; exit 1;; esac
cd "$(dirname "$0")/.."
sed -i "s|https://waez-yusufiya.example|$DOMAIN|g" index.html robots.txt sitemap.xml
echo "تم ضبط النطاق: $DOMAIN"
