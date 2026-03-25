# 뉴스 카드 및 하단 내비 크기 조정

## 변경 내용

- 뉴스 탭 카드는 최소 높이만 키우는 대신 내부를 세로 분배형으로 재배치했다.
- 제목은 3줄까지 보이도록 확장하고, 메타 정보는 카드 하단으로 내려 높이 증가가 실제 가독성 향상으로 이어지게 조정했다.
- 모든 뉴스 카드 높이는 고정값으로 맞추고, 썸네일은 카드 내부 세로 중앙에 오도록 정렬했다.
- 제목 가독성 확보를 위해 카드 자체 세로 공간은 유지하되 이미지 비율은 원래 균형으로 복원했다.
- 하단 내비 높이는 현재 기준 `2/3`로 조정해 99px에서 66px로 줄였다.
- 하단 내비 아이콘과 라벨 크기도 높이에 맞게 원래 비율로 복원했다.

## 대상 파일

- `my-news-front/app/globals.css`
- `my-news-front/components/news/news-card.tsx`
- `my-news-front/components/ui/loading.tsx`
- `my-news-front/components/layout/bottom-nav.tsx`
