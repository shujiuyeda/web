# Gladia メール要約（2025/3 〜 2026/6、全13通）

対象アカウント: shuji.uyeda@gmail.com
期間: 2025-03-24 〜 2026-06-05（約1年3ヶ月）
集計: 製品アップデート9通、イベント告知1通、ケーススタディ1通、Welcome系2通

---

## 1. 2026-06-05 / Product updates - June 2026
**差出人**: Gladia <contact@gladia.io>

### 要約
今月号の目玉は、SOC 2 Type II と HIPAA の更新、オープンASRリーダーボードの状況報告、Audio-to-LLM 機能のユースケース紹介、そして社内エンジニア発の OSS リアルタイム多言語ASRリサーチの公開。Gladia は ASR 公開ベンチマークで ELO 1605 で **1位を維持**、コンプライアンスとリサーチの両面で信頼性をアピールする内容。

### キーポイント
- **SOC 2 Type II と HIPAA 認証を更新**（GDPR・ISO 27001 と合わせてエンタープライズ向けセキュリティ強化）
- オープンASR盲検テストツール（音声を投稿→2つの書き起こしを匿名比較→投票）公開、**624件の投票で Gladia が ELO 1605、勝率50%、常にトップ3以内**
- Audio-to-LLM 機能：1リクエストで400+のLLMを切替可能、ノートテイカー向けに要約・アクションアイテム生成のチュートリアル提供（OpenAI, Mistral, Gladia使用）
- Lead ML Speech Engineer の Bruno が **リアルタイム多言語ASR + コードスイッチング** をOSS公開
- アーキテクチャ：Zipformer（小型単言語ストリーミングモデル）+ Silero VAD + SpeechBrain言語識別
- WER精度で Mistral、ElevenLabs、Deepgram、AssemblyAI を上回ったと主張
- 「会議アシスタントの初の市場マップ」公開（Granola、Fathom、Fireflies.ai、Gong など 65+ ツール、2000人以上のグローバル調査、Northzone/Sequoia の投資家インタビュー含む）

---

## 2. 2026-06-04 / Important updates to our Terms of Use and Terms & Conditions
**差出人**: Gladia <contact@gladia.io>

### 要約
2026年5月29日付で利用規約を更新。最大の変更は **EU Data Act（規則 (EU) 2023/2854 Chapter VI）への準拠**。データポータビリティ、切替・解約権、地理的制限の3点が改定。有料顧客のみ対象の項目と全ユーザー対象の項目がある。

### キーポイント
- EU Data Act 準拠（有料顧客対象）
- 解約通知期間：最大60日の書面通知でデータ処理サービスの切替が可能
- 移行期間：解約後30日間サービス継続、さらに30日間データアクセス保持
- データポータビリティ：JSON, SRT, VTT, TXT 形式でいつでもAPIエクスポート可能
- OpenAPI ドキュメント付き標準REST/HTTPで他社移行をサポート
- 切替手数料：EU Data Act 第29条に基づき段階的に削減、**2027年1月12日までに完全撤廃**
- 地理的制限拡大（全ユーザー対象）：**ロシア・キューバ・ベラルーシ** を地理ブロック対象に追加

---

## 3. 2026-05-07 / Product updates - May 2026
**差出人**: Gladia <contact@gladia.io>

### 要約
最大の発表は **Audio-to-LLM**。音声書き起こしとLLM解析を1つのAPIコールに統合する新機能。さらに Summarization が GA に、JS/Python SDK 公開、オープンソースの正規化ライブラリに5言語追加。

### キーポイント
- **Audio-to-LLM**：transcription + diarization + LLM分析を1つのwebhookで返却、`prompts` 配列で複数プロンプトを並列実行可能
- 書き起こし品質：**WER 1〜3%**、100+言語、pyannoteAI diarization
- `model` フィールドは **700+ モデル対応、デフォルトは GPT-5.4 Nano**
- **Summarization が GA**（pre-recorded と live 両対応）、スタイルは `general` / `concise` / `bullet_points` の3種
- **Gladia SDK** リリース（JS / Python）、`transcribe()` 1行でアップロード→ポーリング→パース一括
- SDKは diarization、100+言語翻訳、PII redaction、sentiment analysis を内包
- オープンソース正規化ライブラリに **フランス語・ドイツ語・スペイン語・イタリア語・オランダ語** 追加（英語に続き）
- 数字展開、複合数（独・蘭）、性別形（西・伊）、フランス語 quatre-vingts などの特殊構文を処理

---

## 4. 2025-10-02 / Product updates - September 2025
**差出人**: Nancy at Gladia <support@gladia.io>

### 要約
リアルタイム partials（部分書き起こし）が GA に、Playground 2.0 を全面リニューアル、JavaScript SDK ベータ公開。CEO Jean-Louis Quéguinerによる Office Hours のフィールドノートも掲載。

### キーポイント
- **リアルタイム partials の GA**：単語ごとのストリーミング、**業界トップクラスの 100ms** レイテンシ
- 利用方法：real-time API で `receive_partial_transcripts` を有効化
- バージイン（割り込み発話）対応、レイテンシ重視のユースケース向け
- **Playground 2.0** をゼロから再構築：ダークモード、Logs ビュー、Usage トラッキング、リアルタイム audio intelligence テスト、ワンクリックコードエクスポート、ヘルプセンター連携チャットボット
- **JavaScript / TypeScript SDK ベータ** リリース、**Python SDK は数週間以内に追従予定**
- CEOのフィールドノート4点：ノイズ抑制は外部不要、多言語環境では言語を絞り込む、テレフォニー(8kHz)は外部ノイズキャンセル避けて Gladia に任せる、add-ons（sentiment, NER）はトランスクリプション後実行なので速度vs深さで選択

---

## 5. 2025-08-27 / Discover how we improved Whisper ASR for enterprise scale
**差出人**: Anna at Gladia <support@gladia.io>

### 要約
Gladia の API は OpenAI Whisper をエンタープライズ向けに改良したもの、という自社製品の差別化説明メール。最新モデル **Whisper-Zero** はハルシネーションを99.9%除去したと主張。**しゅうしゅうが Whisper API を使っている観点で最も注目すべきメール**。

### キーポイント
- Gladia API は OpenAI Whisper の改良版（より正確、高速、多機能、低価格と主張）
- **Whisper-Zero**：ハルシネーション99.9%除去、言語検出強化、付加機能
- オリジナルWhisperの課題：ハルシネーション、機能制限、スケール問題
- ハイブリッドアーキテクチャ：エンドツーエンド処理の各段階で追加AIモデルを併用するMLアンサンブル
- 実環境・ノイズ環境での精度改善
- 追加機能：ライブストリーミング、speaker diarization
- 柔軟性：大きな入力サイズ、YouTube URLサポート
- 関連記事：「Whisperホスティングの実コストは？」「OSS Whisperを使う際の検討事項」

---

## 6. 2025-08-13 / How companies like Selectra, VEED, or Carv drive success with STT
**差出人**: Anna at Gladia <support@gladia.io>

### 要約
顧客事例3社の紹介メール。STTを既存ツールに組み込むことで、顧客体験向上、営業支援、会議プラットフォーム最適化を実現した事例集。

### キーポイント
- 顧客の成果指標：手作業時間を平均30%削減、20+言語の書き起こし、75%が即時ユーザー採用
- **Selectra**：営業電話の品質モニタリング自動化
- **VEED**：動画編集と字幕生成のスムーズ化
- **Carv**：採用担当者向け多言語対応
- 1on1コンサル誘導CTA

---

## 7. 2025-08-12 / Early access to low-latency partials on real-time API
**差出人**: Gladia <support@gladia.io>

### 要約
real-time API の **partials**（発話の最初の単語を超低レイテンシで返す機能）の早期アクセス募集。これが約1ヶ月半後（9月）にGA化されることになる。短いCTA中心メール。

### キーポイント
- partials = 発話の最初の単語を超低レイテンシで返す機能
- 精度・品質を犠牲にしない設計
- 早期アクセス申込みフォーム経由で順次解放
- 後に **September 2025 で 100ms partials として GA**（メール#4参照）

---

## 8. 2025-08-06 / Sentiment analysis, summarization, and more—now in Gladia
**差出人**: Anna at Gladia <support@gladia.io>

### 要約
Gladia playground に追加された新リアルタイム機能の告知。sentiment analysis、NER、summarization が **300ms未満のレイテンシ、100+言語対応** で利用可能に。

### キーポイント
- リアルタイム機能：**sentiment analysis**、**named entity recognition (NER)**、**summarization**
- **レイテンシ <300ms、100+言語対応**
- Gladia playgroundで無料試用可能
- 高度な機能は専門家との1on1ミーティング案内

---

## 9. 2025-07-31 / Unmuted: A Founder-to-Founder Talk on Building with Voice and AI
**差出人**: Anna at Gladia <contact@gladia.io>

### 要約
イベント案内。BigPanda 共同創業者・元CTO の **Elik Eizenberg** との30分セッション「Unmuted」。AI×音声プロダクト開発の知見を共有するファウンダー向けトーク。

### キーポイント
- 開催日：**2025年8月26日 11am EDT / 5pm CEST**
- 登壇者：Elik Eizenberg（BigPanda 共同創業者・元CTO）
- スタートアップに優しいベンダーの見つけ方
- STT評価でファウンダーが犯す最大の間違い
- MVP→2.0 のインフラスケーリング
- BigPanda 構築時に知りたかったこと
- 対象：voice agent、AI co-pilot を作っている人、プロダクト構築に興味ある人
- 録画送付あり

---

## 10. 2025-06-12 / Product updates - June 2025
**差出人**: Anna at Gladia <support@gladia.io>

### 要約
翻訳エンジンの強化（**context** と **informal** パラメータ追加）、US West クラスタの開設、8kHz音声処理改善などのアップデート。

### キーポイント
- **新翻訳パラメータ `context`**：翻訳に明示的な指示を渡せる（マーケコピー風、カナダ仏語、フォーマル法人、学生向けなど）
- **新翻訳パラメータ `informal`**：フォーマル/インフォーマルを切替可能（仏: tu/vous、独: du/Sie、西: tú/usted、蘭: jij/U）
- `context`、`informal`、`context_adaptation` を組み合わせ可能（例: フォーマルな欧州ポルトガル語）
- **US West クラスタ ローンチ**：米西海岸ユーザー向けにAPI性能を大幅改善
- 8kHz音声（電話録音標準）の書き起こし精度向上 → コールセンター用途強化
- 言語ガイダンス機能更新：使用言語を指定し自動検出精度を改善
- 非同期（バッチ）書き起こしの精度改善

---

## 11. 2025-04-02 / Meet Solaria, the most advanced real-time speech-to-text model
**差出人**: Anna at Gladia <support@gladia.io>

### 要約
**Solaria** という新リアルタイムSTTモデルの発表メール。**100+言語**でネイティブレベルの書き起こしを謳う、Gladia のシグネチャーモデル。LiveKit と Daily（Pipecat開発元）との連携も同時発表。

### キーポイント
- **Solaria**：リアルタイム STT モデル、**100+言語ネイティブレベル**
- 業界トップの精度、速度
- 英語・スペイン語・フランス語などで他社STTを上回る精度
- 超低レイテンシで自然な会話AI体験
- **GDPR、HIPAA、SOC 2** 準拠、米欧両方にインフラ
- **LiveKit パートナーシップ**：AIアプリでライブ翻訳を活用
- **Daily / Pipecat パートナーシップ**：言語切替デモチャットボット公開
- 両ライブラリにネイティブ統合、Solaria が裏側で稼働
- 2025年4月10日にライブデモ＋Q&Aセッション開催

---

## 12. 2025-03-26 / Have you tested Gladia's core features yet?
**差出人**: Anna at Gladia <support@gladia.io>

### 要約
新規登録ユーザー向けのコア機能リマインダー。Gladia API で使える基本的なオーディオインテリジェンス機能の紹介と、ドキュメント誘導。

### キーポイント
- **Speaker diarization**：話者ごとに自動分割
- **Word-level timestamps**：単語ごとに秒単位タイムスタンプ
- **Translation**：99+ 言語対応
- **Code-switching**：会話中の言語切替にも対応した書き起こし
- 開発者ドキュメントへの誘導

---

## 13. 2025-03-24 / Welcome to Gladia, 修司!
**差出人**: Anna at Gladia <support@gladia.io>

### 要約
**Gladia アカウント登録時のWelcomeメール**。Audio Intelligence API を使い始めるための3つのリソース案内。しゅうしゅうは2025年3月24日にGladiaに登録したことがわかる。

### キーポイント
- 開発者ドキュメント
- Discord サーバー（コミュニティ学習）
- Support フォーム（チケット提出）
- Gladia playground での試用案内

---

# 全体サマリ

## Gladia という会社の概要
- **本社**：パリ（Gladia SAS, 8 rue Sainte Cécile, 75009 Paris, France）+ ニューヨーク（Gladia Inc., 27 West 20th Street – Suite 800, NY 10011）
- **CEO**：Jean-Louis Quéguiner（CEO Office Hours を定期開催）
- **製品ライン**：エンタープライズ向け Speech-to-Text API（Audio Intelligence API）
  - 主力モデル：**Solaria**（リアルタイム100+言語STT）、**Whisper-Zero**（Whisper改良版）
  - SDK：JavaScript / TypeScript / Python
  - Playground（GUI動作確認環境）
- **コア機能**：transcription、speaker diarization（pyannoteAI採用）、translation（99-100+言語）、code-switching、sentiment analysis、NER、summarization、Audio-to-LLM
- **コンプライアンス**：SOC 2 Type II、HIPAA、GDPR、ISO 27001
- **インフラ**：米欧両方、US West クラスタも開設、EU Data Act 準拠
- **顧客**：Selectra、VEED、Carv、（パートナー：LiveKit、Daily/Pipecat）

## 1年3ヶ月の進化（時系列）
- **2025/3**：しゅうしゅう Welcome、コア機能紹介（diarization、word-timestamp、translation、code-switching）
- **2025/4**：**Solaria** リアルタイム100+言語STTモデル発表、LiveKit/Daily 提携
- **2025/6**：翻訳に `context`/`informal` パラメータ追加、US West クラスタ、8kHz改善
- **2025/7末-8月**：sentiment/NER/summarization リアルタイム化（<300ms）、Whisper-Zero 解説、partials 早期アクセス、顧客事例（Selectra等）、Founder-to-Founderイベント
- **2025/9**：partials **GA（100ms）**、Playground 2.0、JS SDK ベータ
- **2026/5**：**Audio-to-LLM**（1リクエストで音声→LLM分析、700+モデル）、Summarization GA、JS/Python SDK GA、正規化ライブラリ多言語化
- **2026/6**：SOC 2/HIPAA 更新、オープンASR盲検ランキングで1位、リアルタイム多言語ASR OSS、EU Data Act対応

## しゅうしゅう向けポイント（Whisper API・kotoba-whisper併用の観点）

### 1. Whisper-Zero は注目価値あり
しゅうしゅうは現在ボイスメモを **Whisper API** で文字起こし、過去は **kotoba-whisper** ローカル運用。Gladia の Whisper-Zero は「ハルシネーション99.9%除去」を謳う。これは2026/2-4にしゅうしゅうがWhisper APIでハルシネーション問題から悩んだ経緯と直結する話題。試す価値あり。

### 2. リアルタイム性が必要なら Solaria + 100ms partials
現在の用途（ボイスメモの事後文字起こし）は非同期なのでリアルタイム性は不要。ただし将来「会話をリアルタイムで処理したい」「ライブ字幕」「音声エージェント」用途が出てきたら Solaria/partials が選択肢に。

### 3. Audio-to-LLM が秀逸（2026/5）
音声→文字起こし→要約・アクションアイテム抽出 を **1API** で完結できる機能。現在しゅうしゅうがやっている「Whisper APIで文字起こし→Claudeで要約」フローを統合できる可能性。ただし Claude を介する利点（CLAUDE.md ルール適用など）と引き換えになる。

### 4. 日本語対応の明示はメールにない
100+言語対応だが、メール中で日本語の精度に触れた記述は無し。kotoba-whisper（日本語特化）と直接比較した記述もない。日本語ボイスメモ用途では実際にplaygroundで自分の声で試して比較するのが妥当。

### 5. 価格情報は今回のメールには含まれない
13通中、明示的な価格表は無し。「affordable」「open-source Whisper よりコスト効率良い」程度の言及のみ。実コストは別途確認が必要。

---

# 注目すべき機能/モデル/イベント トップ5

1. **Whisper-Zero**（2025/8）：ハルシネーション99.9%除去版Whisper。しゅうしゅうがハルシネーションでWhisper APIに移行した経緯と直結
2. **Solaria**（2025/4）：100+言語ネイティブレベルのリアルタイムSTT、LiveKit/Daily統合あり
3. **Audio-to-LLM**（2026/5）：音声→文字起こし→LLM分析を1コールで、700+モデル、GPT-5.4 Nano デフォルト、WER 1-3%
4. **Real-time partials @ 100ms**（2025/9 GA）：業界トップのストリーミング書き起こしレイテンシ
5. **Founder-to-Founder talk with Elik Eizenberg (BigPanda)**（2025/8/26開催）：唯一のイベント告知、STT評価とインフラスケーリングの実話
