# API Testing Guide

## Prerequisites
- Server running on http://localhost:3000
- PostgreSQL database running
- Migrations applied
- Seed data loaded

## 1. Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T04:04:20.084Z",
  "service": "my-news-back"
}
```

## 2. Get Categories
```bash
curl http://localhost:3000/news/categories
```

Expected: Array of 7 categories (General, Business, Technology, etc.)

## 3. User Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

Expected: User object with accessToken

## 4. User Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Expected: User object with accessToken (refresh token in cookie)

## 5. Get News List (Empty initially)
```bash
curl http://localhost:3000/news
```

Expected:
```json
{
  "items": [],
  "nextCursor": null,
  "hasMore": false
}
```

## 6. Fetch News from API (Authenticated)
First, save the access token from login/register:

```bash
export TOKEN="your-access-token-here"

curl -X POST "http://localhost:3000/news/fetch?category=technology" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: Message showing number of articles fetched

## 7. Get News with Pagination
```bash
curl "http://localhost:3000/news?limit=10"
```

## 8. Search News
```bash
curl "http://localhost:3000/news/search?search=technology&limit=10"
```

## 9. Get News by Category
```bash
curl "http://localhost:3000/news/category/technology?limit=10"
```

## 10. Add Bookmark (Authenticated)
```bash
export NEWS_ID="news-uuid-from-previous-request"

curl -X POST http://localhost:3000/bookmarks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"newsId\": \"$NEWS_ID\"
  }"
```

## 11. Get My Bookmarks (Authenticated)
```bash
curl http://localhost:3000/bookmarks \
  -H "Authorization: Bearer $TOKEN"
```

## 12. Delete Bookmark (Authenticated)
```bash
export BOOKMARK_ID="bookmark-uuid-from-previous-request"

curl -X DELETE "http://localhost:3000/bookmarks/$BOOKMARK_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## 13. Get Weather (requires OpenWeather API key in .env)
```bash
curl "http://localhost:3000/weather?lat=37.5665&lon=126.9780"
```

Expected: Weather data for Seoul

## 14. Refresh Token (Uses cookie)
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

Expected: New accessToken

## 15. Logout (Authenticated)
```bash
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

Expected: Success message

## Notes

- NewsAPI key is required for the `/news/fetch` endpoint
- OpenWeather API key is required for the `/weather` endpoint
- JWT tokens expire after 15 minutes (access) and 7 days (refresh)
- Refresh tokens are stored in HttpOnly cookies
- Rate limit: 100 requests per 60 seconds
