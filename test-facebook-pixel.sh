#!/bin/bash

# Test Facebook Pixel API with proper customer information

echo "Testing Facebook Pixel API..."
echo "Sending PageView event with customer information..."

curl -X POST https://v0-node-js-serverless-api-lake.vercel.app/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "pixelId": "584928510540140",
    "event_name": "PageView",
    "event_time": '$(date +%s)',
    "shop_domain": "test-rikki-new.myshopify.com",
    "user_data": {
      "em": "test@example.com",
      "ph": "1234567890",
      "fn": "Test",
      "ln": "User",
      "ct": "New York",
      "st": "NY",
      "zp": "10001",
      "country": "US",
      "external_id": "test_user_'$(date +%s)'",
      "client_user_agent": "Mozilla/5.0 (Test Script)"
    },
    "custom_data": {
      "event_source_url": "https://test-rikki-new.myshopify.com/",
      "page_title": "Test Page"
    }
  }'
