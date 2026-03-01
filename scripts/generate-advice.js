#!/usr/bin/env node
/**
 * generate-advice.js
 * GitHub Actions から呼ばれるアドバイス生成スクリプト。
 * Phase A: JSON読み込み
 * Phase B: 決定論的スコア計算（CLAUDE.mdのロジックをJS化）
 * Phase C: Claude API Haiku でテキスト生成
 * Phase D: advice.json / advice-scores.json 書き込み
 */

const fs = require('fs');
const path = require('path');

// ── 設定 ──────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// JST 今日の日付 (YYYY-MM-DD)
function todayJST() {
  const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

const TARGET_DATE = process.env.TARGET_DATE || todayJST();

// 直近 N 日間の日付リスト (TARGET_DATE を含む)
function last7Days(baseDate) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ── Phase A: JSON読み込み ──────────────────────────────────────────────

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function loadData() {
  const days = last7Days(TARGET_DATE);

  const weights   = readJSON(path.join(DATA_DIR, 'weights.json')) || { weights: {}, bodyFat: {} };
  const sleep     = readJSON(path.join(DATA_DIR, 'sleep.json'))   || {};
  const healthLog = readJSON(path.join(DATA_DIR, 'health-log.json')) || {};

  const meals  = {};
  const suppl  = {};
  for (const d of days) {
    meals[d] = readJSON(path.join(DATA_DIR, `meals-${d}.json`)) || null;
    suppl[d] = readJSON(path.join(DATA_DIR, `suppl-${d}.json`)) || null;
  }

  const existingAdvice       = readJSON(path.join(DATA_DIR, 'advice.json'))       || {};
  const existingScores       = readJSON(path.join(DATA_DIR, 'advice-scores.json')) || {};

  return { days, weights, sleep, healthLog, meals, suppl, existingAdvice, existingScores };
}

// ── Phase B: 決定論的スコア計算 ────────────────────────────────────────

function calcSleepHours(sleepEntry) {
  if (!sleepEntry) return 0;
  return sleepEntry.total || 0;
}

function calcSleepDeepHours(sleepEntry) {
  if (!sleepEntry) return 0;
  if (sleepEntry.deep != null) return sleepEntry.deep;
  if (sleepEntry.timeline) {
    return sleepEntry.timeline
      .filter(s => s.v === 'deep')
      .reduce((sum, s) => {
        const diff = (new Date(s.e) - new Date(s.s)) / 3600000;
        return sum + diff;
      }, 0);
  }
  return 0;
}

function calcDayMeals(mealEntry) {
  if (!mealEntry || !mealEntry.meals) return { kcal: 0, p: 0, f: 0, c: 0, fiber: 0, plants: [] };
  const agg = { kcal: 0, p: 0, f: 0, c: 0, fiber: 0, plants: [] };
  const plantSet = new Set();
  for (const m of mealEntry.meals) {
    agg.kcal  += m.kcal  || 0;
    agg.p     += m.p     || 0;
    agg.f     += m.f     || 0;
    agg.c     += m.c     || 0;
    agg.fiber += m.fiber || 0;
    if (Array.isArray(m.plants)) m.plants.forEach(p => plantSet.add(p));
  }
  agg.plants = [...plantSet];
  return agg;
}

// 発酵食品キーワード
const FERMENTED_KW  = ['納豆', '味噌', 'ヨーグルト', 'キムチ', '漬物', 'チーズ', '甘酒'];
// ポリフェノールキーワード
const POLYPHENOL_KW = ['ブルーベリー', 'ベリー', '緑茶', '抹茶', 'コーヒー', 'カフェ', 'ラテ', 'スタバ',
                       'ダークチョコ', 'チョコ', 'カカオ', 'ココア', '赤ワイン', '紫芋', '黒豆'];

function mealHasKeyword(mealEntry, keywords) {
  if (!mealEntry || !mealEntry.meals) return false;
  return mealEntry.meals.some(m => keywords.some(kw => (m.name || '').includes(kw)));
}

function calcDinnerHour(mealEntry) {
  if (!mealEntry || !mealEntry.meals || mealEntry.meals.length === 0) return null;
  // 最後の食事を夕食とみなす
  const lastMeal = mealEntry.meals[mealEntry.meals.length - 1];
  if (!lastMeal.time) return null;
  return parseInt(lastMeal.time.split(':')[0], 10);
}

// 標準偏差
function stddev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length);
}

// プレバイオ達成判定（1日分）
function prebioAchieved(dayFiber, supplChecks) {
  if (dayFiber >= 21) return true; // 繊維達成日 → サイリウム不要 → 達成
  const needed = Math.ceil((21 - dayFiber) / 2.75);
  const taken = ['a1', 'a2', 'a3'].filter(id => supplChecks?.[id]).length;
  return taken >= needed;
}

function calcGutScore(days, meals, suppl, healthLog, sleep) {
  // 7日間集計
  const fiberArr   = [];
  const allPlants  = new Set();
  let fermentedDays = 0;
  let polyphenolDays = 0;
  const dinnerHours = [];
  const mealTimesAll = [];
  let probioTotal = 0; // max 56 (8pt × 7days)
  let prebioAchDays = 0;
  const bowelDays = [];
  const waterArr  = [];
  const sleepArr  = [];
  let bowelGoodDays = 0, bowelStatusPts = 0;

  for (const d of days) {
    const m  = meals[d];
    const s  = suppl[d];
    const hl = healthLog[d];
    const sl = sleep[d];
    const dayM = calcDayMeals(m);

    fiberArr.push(dayM.fiber);
    dayM.plants.forEach(p => allPlants.add(p));

    if (mealHasKeyword(m, FERMENTED_KW))  fermentedDays++;
    if (mealHasKeyword(m, POLYPHENOL_KW)) polyphenolDays++;

    const dh = calcDinnerHour(m);
    if (dh !== null) dinnerHours.push(dh);
    if (m?.meals) m.meals.forEach(meal => {
      if (meal.time) mealTimesAll.push(parseInt(meal.time.split(':')[0], 10));
    });

    // プロバイオ: m5:2 + e4:2 + m4:2 + e3:2 = max 8pt/day
    const checks = s?.checks || {};
    let dayProbio = 0;
    if (checks.m5) dayProbio += 2;
    if (checks.e4) dayProbio += 2;
    if (checks.m4) dayProbio += 2;
    if (checks.e3) dayProbio += 2;
    probioTotal += dayProbio;

    // プレバイオ
    if (prebioAchieved(dayM.fiber, checks)) prebioAchDays++;

    // 水分
    if (hl?.water != null) waterArr.push(hl.water);

    // 排便
    if (hl?.bowel) {
      bowelDays.push(d);
      const st = hl.bowel.status;
      if (st === 'good') {
        bowelGoodDays++;
        bowelStatusPts += 4;
      } else if (st === 'hard' || st === 'loose') {
        bowelStatusPts += 2;
      }
    }

    // 睡眠
    const sh = calcSleepHours(sl);
    if (sh > 0) sleepArr.push(sh);
  }

  // ── スコア計算 ──
  const avgFiber  = fiberArr.length > 0 ? fiberArr.reduce((a,b)=>a+b,0)/fiberArr.length : 0;
  const plantCount = allPlants.size;
  const avgWater  = waterArr.length > 0 ? waterArr.reduce((a,b)=>a+b,0)/waterArr.length : 0;
  const avgSleep  = sleepArr.length > 0 ? sleepArr.reduce((a,b)=>a+b,0)/sleepArr.length : 0;

  // A. 食事・栄養（55点）
  const fiberPts      = Math.min(15, avgFiber / 21 * 15);
  const diversityPts  = plantCount >= 20 ? 10 : plantCount >= 15 ? 7 : plantCount >= 10 ? 5 : 2;
  const fermentedPts  = fermentedDays / 7 * 12;
  const polyphenolPts = polyphenolDays / 7 * 8;

  // 食事リズム
  const dinnerBefore21 = dinnerHours.filter(h => h < 21).length;
  const regularityDinnerPt = dinnerHours.length > 0 ? (dinnerBefore21 / dinnerHours.length) * 4 : 2;
  const mealSdPt = mealTimesAll.length > 1 ? Math.max(0, 6 - stddev(mealTimesAll)) : 3;
  const regularityPts = regularityDinnerPt + mealSdPt;

  // B. サプリ（15点）
  const probioRate = probioTotal / (8 * 7); // 0〜1
  const probioPts  = probioRate * 8;
  const prebioPts  = prebioAchDays / 7 * 7;

  // C. 排泄（15点）
  const bowelFreqPts = bowelDays.length / 7 * 8;
  const bowelQualPt  = bowelDays.length > 0 ? Math.min(4, bowelStatusPts / bowelDays.length) : 0;
  const bowelRegPt   = bowelDays.length >= 7 ? 3 : bowelDays.length >= 5 ? 2 : bowelDays.length >= 3 ? 1 : 0;
  const bowelPts     = bowelFreqPts + bowelQualPt + bowelRegPt;

  // D. 生活習慣（15点）
  const waterPts = Math.min(6, avgWater / 2.0 * 6);
  let sleepPts = avgSleep >= 7 ? 6 : avgSleep >= 6 ? 4 : avgSleep >= 5 ? 2 : 1;
  // deep bonus（当日分）
  const todaySleep = sleep[TARGET_DATE];
  if (todaySleep) {
    const deepH = calcSleepDeepHours(todaySleep);
    const totalH = calcSleepHours(todaySleep);
    if (totalH > 0 && deepH / totalH >= 0.10) sleepPts = Math.min(6, sleepPts + 1);
  }

  // 歩数（health-log の steps 平均）
  const stepsArr = days.map(d => healthLog[d]?.steps).filter(v => v != null);
  const avgSteps = stepsArr.length > 0 ? stepsArr.reduce((a,b)=>a+b,0)/stepsArr.length : 0;
  const stepsPts = avgSteps >= 8000 ? 3 : avgSteps >= 6000 ? 2 : avgSteps >= 4000 ? 1 : 0;

  const total = Math.round(
    fiberPts + diversityPts + fermentedPts + polyphenolPts + regularityPts +
    probioPts + prebioPts +
    bowelPts +
    waterPts + sleepPts + stepsPts
  );

  // 排便ステータス文字列
  const latestBowel = days.slice().reverse().map(d => healthLog[d]?.bowel).find(b => b);
  const bowelStatus = latestBowel?.status === 'good' ? '良好' :
                      latestBowel?.status === 'hard' ? '硬め' :
                      latestBowel?.status === 'loose' ? '緩め' : 'unknown';

  return {
    score: Math.min(100, Math.max(0, total)),
    factors: {
      fiber:      { avg: Math.round(avgFiber * 10) / 10, target: 21, pts: Math.round(fiberPts * 10) / 10 },
      diversity:  { plantCount, pts: diversityPts },
      fermented:  { daysHit: fermentedDays, items: [], pts: Math.round(fermentedPts * 10) / 10 },
      polyphenol: { daysHit: polyphenolDays, items: [], pts: Math.round(polyphenolPts * 10) / 10 },
      regularity: { score: Math.round(regularityPts / 10 * 10) / 10, pts: Math.round(regularityPts * 10) / 10 },
      probiotics: { rate: Math.round(probioRate * 100) / 100, pts: Math.round(probioPts * 10) / 10 },
      prebiotics: { rate: Math.round(prebioAchDays / 7 * 100) / 100, type: 'サイリウム', pts: Math.round(prebioPts * 10) / 10 },
      bowel:      { freqDays: bowelDays.length, status: bowelStatus, regScore: bowelRegPt / 3, pts: Math.round(bowelPts * 10) / 10 },
      water:      { avgL: Math.round(avgWater * 100) / 100, target: 2.0, pts: Math.round(waterPts * 10) / 10 },
      sleep:      { avgHrs: Math.round(avgSleep * 100) / 100, pts: sleepPts },
      steps:      { avgSteps: Math.round(avgSteps), pts: stepsPts }
    }
  };
}

function calcOverallScore(gutScore, days, meals, healthLog, sleep) {
  // 簡易 overall = gut score をベースに調整
  const stepsArr = days.map(d => healthLog[d]?.steps).filter(v => v != null);
  const avgSteps = stepsArr.length > 0 ? stepsArr.reduce((a,b)=>a+b,0)/stepsArr.length : 0;
  const sl = sleep[TARGET_DATE];
  const todaySleepH = calcSleepHours(sl);
  const sleepBonus = todaySleepH >= 7 ? 5 : todaySleepH >= 6 ? 0 : -5;
  const stepBonus  = avgSteps >= 8000 ? 5 : avgSteps >= 6000 ? 2 : avgSteps >= 4000 ? 0 : -3;
  return Math.min(100, Math.max(0, Math.round(gutScore + sleepBonus + stepBonus)));
}

// ── stageHints 計算 ──────────────────────────────────────────────────

function calcStageHints(sleepEntry, healthLogDay, supplDay, mealsDay) {
  const hints = { deep: null, rem: null, core: null, awake: null };
  if (!sleepEntry || !sleepEntry.total || sleepEntry.total === 0) return hints;

  const total = sleepEntry.total;
  let deep = 0, rem = 0, core = 0, awake = 0;

  if (sleepEntry.deep  != null) deep  = sleepEntry.deep;
  if (sleepEntry.rem   != null) rem   = sleepEntry.rem;
  if (sleepEntry.core  != null) core  = sleepEntry.core;
  if (sleepEntry.awake != null) awake = sleepEntry.awake;

  if (!deep && sleepEntry.timeline) {
    for (const s of sleepEntry.timeline) {
      const h = (new Date(s.e) - new Date(s.s)) / 3600000;
      if (s.v === 'deep')  deep  += h;
      if (s.v === 'rem')   rem   += h;
      if (s.v === 'core')  core  += h;
      if (s.v === 'awake') awake += h;
    }
  }

  const deepPct  = Math.round(deep  / total * 100);
  const remPct   = Math.round(rem   / total * 100);
  const corePct  = Math.round(core  / total * 100);
  const awakePct = Math.round(awake / total * 100);

  // deep: 理想 10-20%
  if (deepPct < 10 || deepPct > 20) {
    const steps    = healthLogDay?.steps;
    const b1taken  = supplDay?.checks?.b1;
    if (deepPct < 10) {
      if (steps && steps < 5000) {
        hints.deep = `深い睡眠${deepPct}%（理想10-20%）。歩数${steps.toLocaleString()}歩と少なめ。散歩30分で深睡眠↑`;
      } else if (!b1taken) {
        hints.deep = `深い睡眠${deepPct}%（理想10-20%）。b1マグネシウム未服用。就寝前に飲むと効果的`;
      } else {
        hints.deep = `深い睡眠${deepPct}%（理想10-20%）。`;
      }
    }
  }

  // rem: 理想 20-25%
  if (remPct < 20 || remPct > 25) {
    if (remPct > 25) {
      hints.rem = `REM${remPct}%（理想20-25%）。ストレスや飲酒翌日にREMが増える傾向`;
    } else if (remPct < 20) {
      hints.rem = `REM${remPct}%（理想20-25%）。睡眠の後半を長くすると改善しやすい`;
    }
  }

  // core: 理想 45-55%
  if (corePct < 45 || corePct > 55) {
    if (corePct > 55) {
      hints.core = `コア${corePct}%（理想45-55%）。深睡眠不足の分コアが長くなっている`;
    }
  }

  // awake: 理想 <5%
  if (awakePct >= 5) {
    hints.awake = `覚醒${awakePct}%（理想<5%）。途中覚醒が多め。就寝前の水分を控えると改善しやすい`;
  }

  return hints;
}

// reboundAlert 計算
function calcReboundAlert(sleepEntry) {
  if (!sleepEntry) return undefined;
  const total = sleepEntry.total || 0;
  if (total < 6.5) return undefined; // 短い睡眠の翌日はリスクなし（省略）
  const risk = total >= 7 ? 'high' : 'medium';
  return { risk, message: null }; // message は Claude API が生成
}

// ── Phase C: Claude API でテキスト生成 ────────────────────────────────

async function generateTextWithClaude(scoreData, rawData) {
  if (!ANTHROPIC_API_KEY) {
    console.log('[Phase C] ANTHROPIC_API_KEY なし → テキスト生成スキップ');
    return null;
  }

  const { days, meals, suppl, sleep, healthLog, weights } = rawData;
  const today = TARGET_DATE;

  // 直近7日サマリー
  const daySummaries = days.map(d => {
    const dm = calcDayMeals(meals[d]);
    const sl = sleep[d];
    const hl = healthLog[d] || {};
    const sp = suppl[d]?.checks || {};
    return {
      date: d,
      kcal: Math.round(dm.kcal), p: Math.round(dm.p * 10)/10,
      fiber: Math.round(dm.fiber * 10)/10,
      plants: dm.plants.slice(0, 8),
      sleepH: Math.round(calcSleepHours(sl) * 100)/100,
      steps: hl.steps || null,
      water: hl.water || null,
      bowel: hl.bowel?.status || null,
      suppl: Object.keys(sp).filter(k => sp[k]).join(',')
    };
  });

  // 今日の体重
  const todayWeight  = weights.weights?.[today]  || null;
  const todayBodyFat = weights.bodyFat?.[today]   || null;

  // 今日の睡眠詳細
  const todaySleep = sleep[today];
  let stageSummary = '';
  if (todaySleep?.total) {
    const total = todaySleep.total;
    let deep = todaySleep.deep || 0, rem = todaySleep.rem || 0;
    let core = todaySleep.core || 0, awake = todaySleep.awake || 0;
    if (!deep && todaySleep.timeline) {
      for (const s of todaySleep.timeline) {
        const h = (new Date(s.e) - new Date(s.s)) / 3600000;
        if (s.v === 'deep') deep += h;
        if (s.v === 'rem') rem += h;
        if (s.v === 'core') core += h;
        if (s.v === 'awake') awake += h;
      }
    }
    stageSummary = `deep ${Math.round(deep/total*100)}% rem ${Math.round(rem/total*100)}% core ${Math.round(core/total*100)}% awake ${Math.round(awake/total*100)}%`;
  }

  const gut = scoreData.gut;
  const overall = scoreData.overallScore;

  const prompt = `あなたは健康コーチAIです。以下のデータを元に、日本語で健康アドバイスを生成してください。

## 対象日: ${today}
## 全体スコア: ${overall}/100
## 腸内環境スコア: ${gut.score}/100

## 直近7日間サマリー
${JSON.stringify(daySummaries, null, 2)}

## 今日の体重: ${todayWeight ? todayWeight + 'kg' : '未記録'}（体脂肪: ${todayBodyFat ? todayBodyFat + '%' : '未記録'}）
## 今日の睡眠: ${todaySleep?.total ? todaySleep.total.toFixed(2) + 'h (' + stageSummary + ')' : '未記録'}
## 腸内スコア要素: ${JSON.stringify(gut.factors)}

## 出力形式（JSON のみ。説明文なし）
{
  "overall": {
    "headline": "今日の状態を一言で表す見出し（20文字以内）",
    "topAction": "今すぐできる最重要アクション（20文字以内）"
  },
  "meals": {
    "insight": "食事の分析・良い点・改善点（60文字以内）",
    "tips": ["具体的アドバイス1（30文字以内）", "具体的アドバイス2（30文字以内）"],
    "correlation": "他領域との相関（睡眠・体重等）（60文字以内）"
  },
  "sleep": {
    "insight": "睡眠の分析（60文字以内）",
    "tips": ["アドバイス1（30文字以内）", "アドバイス2（30文字以内）"],
    "weekTrend": "7日間の睡眠トレンド（60文字以内）",
    "correlation": "他領域との相関（60文字以内）",
    "stageHintsMessages": {
      "deep": ${scoreData.stageHints.deep ? '"ヒントを補完または null"' : 'null'},
      "rem": ${scoreData.stageHints.rem ? '"ヒントを補完または null"' : 'null'},
      "core": ${scoreData.stageHints.core ? '"ヒントを補完または null"' : 'null'},
      "awake": ${scoreData.stageHints.awake ? '"ヒントを補完または null"' : 'null'}
    },
    "reboundAlertMessage": ${scoreData.reboundAlert ? '"過去データを引用したリバウンド注意メッセージ（50文字以内）"' : 'null'}
  },
  "supplements": {
    "insight": "サプリ摂取状況の分析（60文字以内）",
    "tips": ["アドバイス1（30文字以内）", "アドバイス2（30文字以内）"]
  },
  "weight": {
    "insight": "体重トレンドの分析（60文字以内）",
    "tips": ["アドバイス1（30文字以内）", "アドバイス2（30文字以内）"],
    "projection": "今後の予測（60文字以内）",
    "correlation": "他領域との相関（60文字以内）"
  },
  "gut": {
    "insight": "腸内環境の分析（60文字以内）",
    "tips": ["アドバイス1（30文字以内）", "アドバイス2（30文字以内）"],
    "correlation": "他領域との相関（60文字以内）"
  },
  "crossDomain": [
    { "title": "クロスドメインの洞察タイトル（20文字以内）", "body": "詳細（60文字以内）", "relatedTabs": ["meals","sleep"] }
  ]
}

## 制約
- カロリー目標を押し付けない（1400kcal以下の時のみ注意）
- 具体的な数値を必ず引用する
- 一般論（「規則正しい生活を」等）は禁止。データから導いた内容のみ
- 出力はJSONのみ（\`\`\`なし）`;

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();
    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found in response');
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[Phase C] Claude API エラー:', err.message);
    return null;
  }
}

// ── Phase D: advice.json 組み立て ─────────────────────────────────────

function buildAdviceEntry(scoreData, claudeText) {
  const gut = scoreData.gut;
  const overall = scoreData.overallScore;

  // Claude API のテキストがあればマージ、なければデフォルト
  const ct = claudeText || {};

  const entry = {
    generated: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19),
    overall: {
      headline: ct.overall?.headline || `スコア${overall}点 - データを分析しました`,
      score: overall,
      topAction: ct.overall?.topAction || null
    },
    meals: {
      insight:     ct.meals?.insight     || '',
      tips:        ct.meals?.tips        || [],
      correlation: ct.meals?.correlation || ''
    },
    sleep: {
      insight:     ct.sleep?.insight     || '',
      tips:        ct.sleep?.tips        || [],
      weekTrend:   ct.sleep?.weekTrend   || '',
      correlation: ct.sleep?.correlation || '',
      stageHints: {
        deep:  ct.sleep?.stageHintsMessages?.deep  ?? scoreData.stageHints.deep  ?? null,
        rem:   ct.sleep?.stageHintsMessages?.rem   ?? scoreData.stageHints.rem   ?? null,
        core:  ct.sleep?.stageHintsMessages?.core  ?? scoreData.stageHints.core  ?? null,
        awake: ct.sleep?.stageHintsMessages?.awake ?? scoreData.stageHints.awake ?? null
      }
    },
    supplements: {
      insight: ct.supplements?.insight || '',
      tips:    ct.supplements?.tips    || []
    },
    weight: {
      insight:     ct.weight?.insight     || '',
      tips:        ct.weight?.tips        || [],
      projection:  ct.weight?.projection  || '',
      correlation: ct.weight?.correlation || ''
    },
    gut: {
      score:       gut.score,
      factors:     gut.factors,
      insight:     ct.gut?.insight     || '',
      tips:        ct.gut?.tips        || [],
      correlation: ct.gut?.correlation || ''
    },
    crossDomain: ct.crossDomain || []
  };

  // reboundAlert
  if (scoreData.reboundAlert) {
    entry.sleep.reboundAlert = {
      risk: scoreData.reboundAlert.risk,
      message: ct.sleep?.reboundAlertMessage || null
    };
  }

  return entry;
}

// ── メイン処理 ─────────────────────────────────────────────────────────

async function main() {
  console.log(`[generate-advice] 対象日: ${TARGET_DATE}`);

  // Phase A
  const data = loadData();
  const { days, weights, sleep, healthLog, meals, suppl, existingAdvice, existingScores } = data;
  console.log(`[Phase A] 読み込み完了。対象7日間: ${days.join(', ')}`);

  // Phase B
  const gut = calcGutScore(days, meals, suppl, healthLog, sleep);
  const overallScore = calcOverallScore(gut.score, days, meals, healthLog, sleep);

  const todaySleep = sleep[TARGET_DATE];
  const todayHL    = healthLog[TARGET_DATE] || {};
  const todaySuppl = suppl[TARGET_DATE];
  const todayMeals = meals[TARGET_DATE];

  const stageHints   = calcStageHints(todaySleep, todayHL, todaySuppl, todayMeals);
  const reboundAlert = calcReboundAlert(todaySleep);

  const scoreData = { gut, overallScore, stageHints, reboundAlert };
  console.log(`[Phase B] overall=${overallScore} gut=${gut.score}`);

  // Phase C
  const claudeText = await generateTextWithClaude(scoreData, data);
  if (claudeText) {
    console.log('[Phase C] Claude API テキスト生成成功');
  } else {
    console.log('[Phase C] テキスト生成なし（スコアのみで保存）');
  }

  // Phase D: advice.json 組み立て・7日ローテ
  const newEntry = buildAdviceEntry(scoreData, claudeText);
  existingAdvice[TARGET_DATE] = newEntry;

  // 7日より古いキーを削除
  const cutoff = days[0]; // 最も古い日付
  for (const key of Object.keys(existingAdvice)) {
    if (key < cutoff) delete existingAdvice[key];
  }

  fs.writeFileSync(path.join(DATA_DIR, 'advice.json'), JSON.stringify(existingAdvice, null, 2), 'utf8');
  console.log('[Phase D] advice.json 書き込み完了');

  // advice-scores.json 追記
  const todayM = calcDayMeals(meals[TARGET_DATE]);
  existingScores[TARGET_DATE] = {
    overall:  overallScore,
    gut:      gut.score,
    sleep:    todaySleep ? Math.round(todaySleep.total * 100) / 100 : null,
    weight:   weights.weights?.[TARGET_DATE]  || null,
    bodyFat:  weights.bodyFat?.[TARGET_DATE]  || null,
    steps:    todayHL.steps    || null,
    water:    todayHL.water    || null,
    fiber:    Math.round(todayM.fiber * 10) / 10,
    kcal:     Math.round(todayM.kcal)
  };

  fs.writeFileSync(path.join(DATA_DIR, 'advice-scores.json'), JSON.stringify(existingScores, null, 2), 'utf8');
  console.log('[Phase D] advice-scores.json 書き込み完了');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
