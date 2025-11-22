/* --- 無限稟議 データ定義ファイル (Ver 9.0) --- */

const FACILITY_DATA = [
    { id: 0, name: "アルバイト", baseCost: 15, baseProd: 0.5, riskPerSec: 0, desc: "安全です。" },
    { id: 1, name: "自動捺印機", baseCost: 100, baseProd: 4, riskPerSec: 0, desc: "文句を言いません。" },
    { id: 2, name: "ベテラン社員", baseCost: 1100, baseProd: 22, riskPerSec: 0, desc: "残業も厭いません。" },
    { id: 3, name: "クラウドワーカー", baseCost: 12000, baseProd: 85, riskPerSec: 0.1, desc: "管理不届き (リスク+0.1%/s)" },
    { id: 4, name: "承認AI Type-0", baseCost: 130000, baseProd: 350, riskPerSec: 0.5, desc: "暴走の危険 (リスク+0.5%/s)" },
    { id: 5, name: "書類養殖プラント", baseCost: 1400000, baseProd: 1800, riskPerSec: 2.0, desc: "倫理的問題 (リスク+2.0%/s)" },
];

const UPGRADE_DATA = [
    // 施設強化
    { id: "u0_1", name: "エルゴノミクス椅子", cost: 1000, targetId: 0, type: "mul", scale: 2, req: 10, desc: "アルバイト効率2倍" },
    { id: "u0_2", name: "エナジードリンク", cost: 50000, targetId: 0, type: "mul", scale: 2, req: 50, desc: "アルバイト効率さらに2倍" },
    { id: "u1_1", name: "工業用潤滑油", cost: 10000, targetId: 1, type: "mul", scale: 2, req: 10, desc: "捺印機効率2倍" },
    { id: "u1_2", name: "予備バッテリー", cost: 500000, targetId: 1, type: "mul", scale: 2, req: 50, desc: "捺印機効率さらに2倍" },
    { id: "u2_1", name: "腱鞘炎ガード", cost: 100000, targetId: 2, type: "mul", scale: 2, req: 10, desc: "ベテラン効率2倍" },
    
    // クリック強化
    { id: "click_base", name: "重厚なハンコ", cost: 500, targetId: -1, type: "mul", scale: 10, req: 1, desc: "クリック基礎力 10倍" },
    { id: "click_cps_1", name: "手首の筋トレ", cost: 5000, targetId: -1, type: "cps", scale: 0.01, req: 100, desc: "クリックに秒間生産量の1%を加算" },
    { id: "click_cps_2", name: "高級朱肉", cost: 50000, targetId: -1, type: "cps", scale: 0.02, req: 1000, desc: "クリックに秒間生産量の2%を加算" },
    { id: "click_cps_3", name: "マクロツール", cost: 5000000, targetId: -1, type: "cps", scale: 0.05, req: 10000, desc: "クリックに秒間生産量の5%を加算" },
    { id: "click_cps_4", name: "社長の直接決済", cost: 500000000, targetId: -1, type: "cps", scale: 0.10, req: 50000, desc: "クリックに秒間生産量の10%を加算" },
    { id: "click_god", name: "神の指", cost: 500000000000, targetId: -1, type: "mul", scale: 20, req: 100000, desc: "クリック基礎力 さらに20倍" },
];

// ★新規：レガシーアップグレードデータ
const LEGACY_UPGRADE_DATA = [
    { id: "l_nepotism", name: "コネ入社", cost: 10, desc: "転生直後、アルバイトと捺印機を各10個所持" },
    { id: "l_chronos", name: "クロノス・トリガー", cost: 50, desc: "オフライン生産効率が100%になる" },
    { id: "l_insider", name: "インサイダー取引", cost: 100, desc: "特別決済の出現頻度が10%アップ" },
    
    { id: "l_ledger", name: "裏帳簿", cost: 300, desc: "解除実績1個につき生産力+5%" },
    { id: "l_fac_1", name: "派閥：人海戦術", cost: 500, desc: "アルバイト10人毎にベテラン生産力+1%" },
    { id: "l_fac_2", name: "派閥：機械化", cost: 500, desc: "捺印機10台毎にAI生産力+1%" },
    
    { id: "l_risk", name: "リスク管理マニュアル", cost: 1500, desc: "リスク上昇速度を20%軽減" },
    { id: "l_zone", name: "ゾーン状態", cost: 3000, desc: "特別決済の効果時間が2倍" },
    { id: "l_parachute", name: "黄金のパラシュート", cost: 5000, desc: "転生前の所持金の1%を引き継ぐ" },
    
    { id: "l_lifetime", name: "終身雇用契約", cost: 50000, desc: "施設価格上昇率を1.15倍から1.14倍へ" },
    { id: "l_infinite", name: "無限稟議", cost: 1000000, desc: "全生産力10倍" }
];

const ACHIEVEMENT_DATA = [
    { id: "ach_1", name: "初めの一歩", desc: "ハンコを1回押す", check: g => g.totalClicks >= 1 },
    { id: "ach_2", name: "腱鞘炎予備軍", desc: "ハンコを1,000回押す", check: g => g.totalClicks >= 1000 },
    { id: "ach_3", name: "小さなチーム", desc: "施設合計10", check: g => getTotalFacilities(g) >= 10 },
    { id: "ach_4", name: "課の設立", desc: "施設合計50", check: g => getTotalFacilities(g) >= 50 },
    { id: "ach_5", name: "ブラック企業", desc: "施設合計100", check: g => getTotalFacilities(g) >= 100 },
    { id: "ach_6", name: "100万円の壁", desc: "累計1M枚", check: g => new D(g.totalPaper).gte(1000000) },
    { id: "ach_7", name: "億り人", desc: "累計100M枚", check: g => new D(g.totalPaper).gte(100000000) },
    { id: "ach_8", name: "兆万長者", desc: "累計1T枚", check: g => new D(g.totalPaper).gte(1e12) },
    { id: "ach_9", name: "バイトリーダー", desc: "アルバイト50人", check: g => getOwned(g,0) >= 50 },
    { id: "ach_10", name: "自動化推進", desc: "捺印機50台", check: g => getOwned(g,1) >= 50 },
    { id: "ach_11", name: "効率厨", desc: "UG3個購入", check: g => getPurchasedCount(g) >= 3 },
    { id: "ach_12", name: "伝説の始まり", desc: "初めて栄転", check: g => g.prestigeCount >= 1 },
];

const NEWS_DATA = [
    "承認印のインク、実は醤油だった説が浮上。", "「ハンコを押すだけの簡単なお仕事です」求人に長蛇の列。",
    "本社ビル、物理法則を無視して増築中。", "社員食堂のA定食、今日は「虚無」です。",
    "有給休暇申請書がシュレッダーに直結されていることが発覚。", "社長の肖像画、目が動いたとの報告。",
    "経理部、「どんぐり」での決済を検討。", "廊下の蛍光灯がモールス信号で「タスケテ」。",
    "労基署、当社の結界を突破できず撤退。", "アルバイトの田中君、ハンコ押しで音速を超える。",
    "自動捺印機、深夜に独り言。", "ベテラン社員、「家に帰る方法を忘れた」。",
    "クラウドワーカーの実体は猫？", "承認AI、「人類に承認など不要」と哲学。",
    "書類養殖場から悲鳴。", "週刊誌、「無限稟議社の闇」を特集。",
    "【速報】宇宙人が入社希望。", "【速報】明日が来ない可能性。",
    "【怪奇】後ろに誰かいますよ。", "クリックする指、疲れていませんか？"
];

const SCAPEGOAT_BASE_COST = 2000;
const LAWYER_BASE_COST = 10000;
