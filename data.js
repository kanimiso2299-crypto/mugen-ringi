/* --- 無限稟議 データ定義ファイル (Ver 9.6: Complete & Readable) --- */

const FACILITY_DATA = [
    { id: 0, name: "アルバイト", baseCost: 15, baseProd: 0.5, riskPerSec: 0, desc: "安全です。" },
    { id: 1, name: "自動捺印機", baseCost: 100, baseProd: 4, riskPerSec: 0, desc: "文句を言いません。" },
    { id: 2, name: "ベテラン社員", baseCost: 1100, baseProd: 22, riskPerSec: 0, desc: "残業も厭いません。" },
    { id: 3, name: "クラウドワーカー", baseCost: 12000, baseProd: 85, riskPerSec: 0.1, desc: "管理不届き (リスク+0.1%/s)" },
    { id: 4, name: "承認AI Type-0", baseCost: 130000, baseProd: 350, riskPerSec: 0.5, desc: "暴走の危険 (リスク+0.5%/s)" },
    { id: 5, name: "書類養殖プラント", baseCost: 1400000, baseProd: 1800, riskPerSec: 2.0, desc: "倫理的問題 (リスク+2.0%/s)" },
    { id: 6, name: "深海支社", baseCost: 25000000, baseProd: 12000, riskPerSec: 3.0, desc: "水圧で書類を圧縮します (リスク+3.0%/s)" },
    { id: 7, name: "月面基地", baseCost: 450000000, baseProd: 85000, riskPerSec: 4.0, desc: "重力が弱くハンコが軽いです (リスク+4.0%/s)" },
    { id: 8, name: "時間管理部", baseCost: 8500000000, baseProd: 666666, riskPerSec: 5.0, desc: "未来の書類を先取り承認 (リスク+5.0%/s)" },
];

const UPGRADE_DATA = [
    // --- ID:0 アルバイト強化 ---
    { id: "u0_1", name: "エルゴノミクス椅子", cost: 1000, targetId: 0, type: "mul", scale: 2, req: 10, desc: "アルバイト効率2倍" },
    { id: "u0_2", name: "エナジードリンク", cost: 50000, targetId: 0, type: "mul", scale: 2, req: 50, desc: "アルバイト効率さらに2倍" },
    
    // --- ID:1 自動捺印機強化 ---
    { id: "u1_1", name: "工業用潤滑油", cost: 10000, targetId: 1, type: "mul", scale: 2, req: 10, desc: "捺印機効率2倍" },
    { id: "u1_2", name: "予備バッテリー", cost: 500000, targetId: 1, type: "mul", scale: 2, req: 50, desc: "捺印機効率さらに2倍" },
    
    // --- ID:2 ベテラン社員強化 ---
    { id: "u2_1", name: "腱鞘炎ガード", cost: 100000, targetId: 2, type: "mul", scale: 2, req: 10, desc: "ベテラン効率2倍" },
    { id: "u2_2", name: "社畜精神の注入", cost: 5000000, targetId: 2, type: "mul", scale: 2, req: 50, desc: "ベテラン効率さらに2倍" },

    // --- ID:3 クラウドワーカー強化 ---
    { id: "u3_1", name: "高速Wi-Fi", cost: 120000, targetId: 3, type: "mul", scale: 2, req: 10, desc: "クラウド効率2倍" },
    { id: "u3_2", name: "分散型台帳", cost: 6000000, targetId: 3, type: "mul", scale: 2, req: 50, desc: "クラウド効率さらに2倍" },

    // --- ID:4 承認AI Type-0強化 ---
    { id: "u4_1", name: "量子プロセッサ", cost: 1300000, targetId: 4, type: "mul", scale: 2, req: 10, desc: "AI効率2倍" },
    { id: "u4_2", name: "感情回路の切断", cost: 65000000, targetId: 4, type: "mul", scale: 2, req: 50, desc: "AI効率さらに2倍" },

    // --- ID:5 書類養殖プラント強化 ---
    { id: "u5_1", name: "遺伝子組み換えパルプ", cost: 14000000, targetId: 5, type: "mul", scale: 2, req: 10, desc: "養殖場効率2倍" },
    { id: "u5_2", name: "自動収穫コンバイン", cost: 700000000, targetId: 5, type: "mul", scale: 2, req: 50, desc: "養殖場効率さらに2倍" },

    // --- ID:6 深海支社強化 ---
    { id: "u6_1", name: "耐圧インク", cost: 250000000, targetId: 6, type: "mul", scale: 2, req: 10, desc: "深海支社効率2倍" },
    { id: "u6_2", name: "地熱発電サーバー", cost: 12000000000, targetId: 6, type: "mul", scale: 2, req: 50, desc: "深海支社効率さらに2倍" },
    
    // --- ID:7 月面基地強化 ---
    { id: "u7_1", name: "無重力スタンプ", cost: 4500000000, targetId: 7, type: "mul", scale: 2, req: 10, desc: "月面基地効率2倍" },
    { id: "u7_2", name: "クレーター埋立地", cost: 200000000000, targetId: 7, type: "mul", scale: 2, req: 50, desc: "月面基地効率さらに2倍" },
    
    // --- ID:8 時間管理部強化 ---
    { id: "u8_1", name: "タイムマシン", cost: 85000000000, targetId: 8, type: "mul", scale: 2, req: 10, desc: "時間管理部効率2倍" },
    { id: "u8_2", name: "因果律固定装置", cost: 4000000000000, targetId: 8, type: "mul", scale: 2, req: 50, desc: "時間管理部効率さらに2倍" },

    // --- クリック強化 ---
    { id: "click_base", name: "重厚なハンコ", cost: 500, targetId: -1, type: "mul", scale: 10, req: 1, desc: "クリック基礎力 10倍" },
    { id: "click_cps_1", name: "手首の筋トレ", cost: 5000, targetId: -1, type: "cps", scale: 0.01, req: 100, desc: "クリックに秒間生産量の1%を加算" },
    { id: "click_cps_2", name: "高級朱肉", cost: 50000, targetId: -1, type: "cps", scale: 0.02, req: 1000, desc: "クリックに秒間生産量の2%を加算" },
    { id: "click_cps_3", name: "マクロツール", cost: 5000000, targetId: -1, type: "cps", scale: 0.05, req: 10000, desc: "クリックに秒間生産量の5%を加算" },
    { id: "click_cps_4", name: "社長の直接決済", cost: 500000000, targetId: -1, type: "cps", scale: 0.10, req: 50000, desc: "クリックに秒間生産量の10%を加算" },
    { id: "click_god", name: "神の指", cost: 500000000000, targetId: -1, type: "mul", scale: 20, req: 100000, desc: "クリック基礎力 さらに20倍" },
];

// レガシーアップグレード (Ver9.4の低価格設定を維持)
const LEGACY_UPGRADE_DATA = [
    { id: "l_nepotism", name: "コネ入社", cost: 5, desc: "転生直後、アルバイトと捺印機を各10個所持" },
    { id: "l_chronos", name: "クロノス・トリガー", cost: 20, desc: "オフライン生産効率が100%になる" },
    { id: "l_insider", name: "インサイダー取引", cost: 50, desc: "特別決済の出現頻度が10%アップ" },
    { id: "l_ledger", name: "裏帳簿", cost: 100, desc: "解除実績1個につき生産力+5%" },
    { id: "l_fac_1", name: "派閥：人海戦術", cost: 200, desc: "アルバイト10人毎にベテラン生産力+1%" },
    { id: "l_fac_2", name: "派閥：機械化", cost: 200, desc: "捺印機10台毎にAI生産力+1%" },
    { id: "l_risk", name: "リスク管理マニュアル", cost: 500, desc: "リスク上昇速度を20%軽減" },
    { id: "l_zone", name: "ゾーン状態", cost: 1000, desc: "特別決済の効果時間が2倍" },
    { id: "l_parachute", name: "黄金のパラシュート", cost: 2000, desc: "転生前の所持金の1%を引き継ぐ" },
    { id: "l_lifetime", name: "終身雇用契約", cost: 10000, desc: "施設価格上昇率を1.15倍から1.14倍へ" },
    { id: "l_infinite", name: "無限稟議", cost: 500000, desc: "全生産力10倍" }
];

const ACHIEVEMENT_DATA = [
    // 基本
    { id: "ach_1", name: "初めの一歩", desc: "ハンコを1回押す", check: g => g.totalClicks >= 1 },
    { id: "ach_2", name: "腱鞘炎予備軍", desc: "ハンコを1,000回押す", check: g => g.totalClicks >= 1000 },
    
    // 施設数
    { id: "ach_3", name: "小さなチーム", desc: "施設合計10", check: g => getTotalFacilities(g) >= 10 },
    { id: "ach_4", name: "課の設立", desc: "施設合計50", check: g => getTotalFacilities(g) >= 50 },
    { id: "ach_5", name: "ブラック企業", desc: "施設合計100", check: g => getTotalFacilities(g) >= 100 },
    { id: "ach_fac_4", name: "中堅企業", desc: "施設合計200", check: g => getTotalFacilities(g) >= 200 },
    { id: "ach_fac_5", name: "大企業", desc: "施設合計300", check: g => getTotalFacilities(g) >= 300 },
    { id: "ach_fac_6", name: "コングロマリット", desc: "施設合計500", check: g => getTotalFacilities(g) >= 500 },

    // 金額 (単位拡張)
    { id: "ach_6", name: "100万円の壁", desc: "累計1M枚", check: g => new D(g.totalPaper).gte(1000000) },
    { id: "ach_7", name: "億り人", desc: "累計100M枚", check: g => new D(g.totalPaper).gte(100000000) },
    { id: "ach_8", name: "兆万長者", desc: "累計1T枚", check: g => new D(g.totalPaper).gte(1e12) },
    { id: "ach_money_4", name: "国家予算規模", desc: "累計1Qa(1000兆)枚", check: g => new D(g.totalPaper).gte(1e15) },
    { id: "ach_money_5", name: "天文学的数字", desc: "累計1Qi(100京)枚", check: g => new D(g.totalPaper).gte(1e18) },
    { id: "ach_money_6", name: "宇宙の塵", desc: "累計1Sx(10垓)枚", check: g => new D(g.totalPaper).gte(1e21) },
    { id: "ach_money_7", name: "概念的富豪", desc: "累計1Sp(100𥝱)枚", check: g => new D(g.totalPaper).gte(1e24) },

    // 施設固有 (全施設網羅)
    { id: "ach_9", name: "バイトリーダー", desc: "アルバイト50人", check: g => getOwned(g,0) >= 50 },
    { id: "ach_10", name: "自動化推進", desc: "捺印機50台", check: g => getOwned(g,1) >= 50 },
    { id: "ach_vet", name: "歴戦の勇士", desc: "ベテラン50人", check: g => getOwned(g,2) >= 50 },
    { id: "ach_cloud", name: "サーバー負荷増大", desc: "クラウド50人", check: g => getOwned(g,3) >= 50 },
    { id: "ach_ai", name: "シンギュラリティ", desc: "AI50台", check: g => getOwned(g,4) >= 50 },
    { id: "ach_bio", name: "マッドサイエンティスト", desc: "養殖場50箇所", check: g => getOwned(g,5) >= 50 },
    { id: "ach_sea", name: "アトランティス", desc: "深海支社50箇所", check: g => getOwned(g,6) >= 50 },
    { id: "ach_moon", name: "静かの海", desc: "月面基地50箇所", check: g => getOwned(g,7) >= 50 },
    { id: "ach_time", name: "タイムパトロール", desc: "時間管理部50箇所", check: g => getOwned(g,8) >= 50 },

    // その他
    { id: "ach_11", name: "効率厨", desc: "UG3個購入", check: g => getPurchasedCount(g) >= 3 },
    { id: "ach_12", name: "伝説の始まり", desc: "初めて栄転", check: g => g.prestigeCount >= 1 },
];

const NEWS_DATA = [
    // 一般・初期
    "承認印のインク、実は醤油だった説が浮上。",
    "「ハンコを押すだけの簡単なお仕事です」求人に長蛇の列。",
    "本社ビル、物理法則を無視して増築中。",
    "社員食堂のA定食、今日は「虚無」です。",
    "有給休暇申請書がシュレッダーに直結されていることが発覚。",
    "社長の肖像画、目が動いたとの報告多数。",
    "経理部、「円」の代わりに「どんぐり」での決済を検討。",
    "廊下の蛍光灯がモールス信号で「タスケテ」と点滅。",
    "労基署、当社の結界を突破できず撤退。",
    "給湯室のポットが「熱い」と悲鳴を上げました。",
    "「印鑑証明の証明書」の発行に行列。",
    "隣のビルの窓に「助けて」という人文字が。",
    "コピー機から知らない風景写真が出てくる現象が多発。",
    "「残業はスポーツ」という政府広報が炎上。",
    "社内通貨「ガバス」の導入が見送られました。",
    "エレベーターが地下100階まで降りていく都市伝説。",
    "「ハンコ道」がオリンピック正式種目に。",
    "新入社員、入社3秒で悟りを開き退職。",
    "オフィスの観葉植物、社員より良い給料をもらっている疑惑。",
    "「寝ていない自慢」をする大会で死傷者。",
    "キーボードの「Enter」キーだけがすり減っていく怪奇。",
    "空から大量の請求書が降ってくる予報です。",
    "地獄支店の開設準備室が発足しました。",
    "「月曜日は来ません」という怪文書が出回っています。",
    "書類の山の中で、行方不明だった課長を発見。",
    "「過労死」という言葉が辞書から削除されました。",
    "取締役会、全員がホログラムである可能性。",
    "会社のロゴが、見る角度によって「呪」に見える。",
    "シュレッダーの紙吹雪が、時々舞い上がって文字を作る。",
    "社員証の写真が、日ごとに老けていく現象。",

    // 施設関連
    "アルバイトの田中君、ハンコ押しで音速を超える。",
    "「時給アップよりエナドリを支給しろ」バイト組合が要求。",
    "自動捺印機、深夜に独り言。",
    "ベテラン社員、「家に帰る方法を忘れた」と供述。",
    "クラウドワーカーの実体は猫？",
    "承認AI、「人類に承認など不要」と哲学し始める。",
    "「私を電源から抜かないで」AIが悲痛なメッセージ。",
    "書類養殖場から悲鳴のような音。",
    "養殖された書類、勝手に自走して机の上へ。",
    "承認AI、「人間は効率が悪い」と溜息をつく機能を追加。",
    "クラウドワーカー、全員が同じ夢を見ていることが判明。",
    "深海支社、窓の外を巨大イカが通過中。",
    "「水圧で肩こりが治った」深海勤務者の声。",
    "深海支社、竜宮城からの買収提案を拒否。",
    "月面基地、ハンコが浮いてどこかへ飛んでいった模様。",
    "「地球が青いな」残業中に見上げる故郷。",
    "「空気がないのでタバコが吸えない」月面支社で暴動。",
    "時間管理部、「昨日のミス」を無かったことに成功。",
    "未来の自分から「早く寝ろ」というメールが届く。",
    "時間管理部、先週のランチをもう一度食べることに成功。",
    "未来から来た自分と目が合いましたが、無視されました。",
    "承認印の押しすぎで、地球の自転速度がわずかに変化。",
    "「紙」が絶滅危惧種に指定されました。",
    "月面基地、「ウサギを見た」という報告は揉み消されました。",
    "深海支社、未知の海底文明と業務提携。",

    // リスク・メタ・その他
    "週刊誌、「無限稟議社の闇」を特集。",
    "SNSで「#無限稟議を許すな」がトレンド入り。",
    "監査役、「見なかったことにしてやる」とワイロを要求。",
    "【速報】宇宙人が入社希望。",
    "【速報】明日が来ない可能性。",
    "【怪奇】後ろに誰かいますよ。",
    "【警告】このゲームはフィクションではありません。",
    "世界は、一枚の巨大な書類かもしれない。",
    "クリックする指、疲れていませんか？",
    "このニュースティッカーを書いている人も、実はAIかもしれません。",
    "あなたのPCのファンが悲鳴を上げています。",
    "「セーブデータ」こそが、あなたの生きた証です。",
];

const SCAPEGOAT_BASE_COST = 2000;
const LAWYER_BASE_COST = 10000;
