# AGENTS.md

## ルール

- コミュニケーションやドキュメントは日本語です。
- MVP（Minimum Viable Product）開発です。
- 不明点は必ず確認します。選択肢がある場合も必ず確認します。
    - 勝手な思考で判断しないこと。
- ライブラリの使用方法は必ず最新の情報を公式情報から取得し理解します。
- 実装の了承を得てから、合意した内容のみ実装します。
- 実装後は、 `bun run typecheck` と `bun run check` を実行し、エラーも警告も、有るべき姿にすることで解消します。適宜、`bun run fix` を使います。
    - エラーや警告を無視したり握り潰したりしないこと。
- ソースコードにコメントを書かないこと。
- 将来的な拡張性、汎用性など、不確定なものを実装しないこと。
- throw は絶対に使わないこと。try catch は最低限のみとすること。
- package.json や、 tsconfig.json、biome.json など、変更の必要がある場合は、変更前に必ず確認をします。
- ライブラリインストールは、 `bun add xxxxx` や `bun add --dev xxxxx` で行います。
    - package.json の dependencies や devDependencies を直接書き換えないこと。
