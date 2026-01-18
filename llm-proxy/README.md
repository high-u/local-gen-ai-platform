To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000


```bash
curl -s http://127.0.0.1:1234/v1/models
```

```bash
curl -s http://127.0.0.1:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "lfm2.5-1.2b-instruct@q4_k_m",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "こんにちは！自己紹介して"
      }
    ],
    "stream": true
  }'
```


```bash
curl -s  http://192.168.1.111:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "lfm2.5-1.2b-instruct@q4_k_m",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "こんにちは！自己紹介して"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "brave_web_search",
          "description": "Brave Search APIを使用してWeb検索を実行します 。最新のニュース、記事、ウェブページを検索するのに使用します。",
          "parameters": {
            "type": "object",
            "properties": {
              "query": {
                "type": "string",
                "description": "検索したいキーワードや質問（例: \"LLM news January 7 2026\"）"
              },
              "count": {
                "type": "integer",
                "description": "取得する検索結果の数（デフォルトは10）"
              }
            },
            "required": ["query"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }' | jq
```
