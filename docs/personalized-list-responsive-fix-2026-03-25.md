# 맞춤 뉴스 리스트 반응형 잘림 수정

## 변경 내용

- 맞춤 뉴스 섹션 헤더를 모바일에서 세로 배치로 전환했다.
- 리스트 카드와 섹션 컨테이너에 `min-width: 0`을 적용해 가로 overflow 전파를 막았다.
- 480px 미만 화면에서는 썸네일 크기와 카드 간격을 줄여 우측 잘림 없이 한 화면에 맞추도록 조정했다.

## 대상 파일

- `my-news-front/app/page.tsx`
- `my-news-front/app/globals.css`
