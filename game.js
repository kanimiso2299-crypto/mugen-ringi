/* --- 無限稟議 ゲームロジック (Ver 8.2: Upgrade Fix) --- */

// 1. ライブラリチェック
if (typeof Decimal === 'undefined') {
    alert("【エラー】ライブラリ読み込み失敗\nページをリロードしてください。");
    throw new Error("Decimal lib missing");
}

const D = Decimal;
const SUFFIXES = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"];

// 2. 定数データ
const NEWS_DATA = [
    "承認印のインク、実は醤油だった説が浮上。",
    "「ハンコを押すだけの簡単なお仕事です」の求人に長蛇の列。",
    "本社ビル、なぜか物理法則を無視して増築中。",
    "社員食堂のA定食、今日は「虚無」です。",
    "有給休暇申請書がシュレッダーに直結されていることが発覚。",
    "社長の肖像画、目が動いたとの報告多数。",
    "経理部、「円」の代わりに「どんぐり」での決済を検討。",
    "廊下の蛍光灯、モールス信号で「タスケテ」と点滅中。",
    "労働基準監督署、当社の結界を突破できず撤退。",
    "アルバイトの田中君、ハンコ押しで音速を超える。",
    "「時給アップよりエナドリを支給しろ」バイト組合が要求。",
    "自動捺印機、深夜に独り言を言っているとの噂。",
    "最新の捺印機、AIが「承認したくない」とストライキ。",
    "ベテラン社員、「家に帰る方法を忘れた」と供述。",
    "「残業代？ それは都市伝説だよ」古参社員が新人に説教。",
    "クラウドワーカーの実体、実は猫ではないかと話題に。",
    "地球の裏側からの承認、通信ラグゼロで到着。なぜ？",
    "承認AI、「人類に承認など不要」と哲学し始める。",
    "「私を電源から抜かないで」AIが悲痛なメッセージ。",
    "書類養殖場から「悲鳴のような音」がするとの苦情。",
    "養殖された書類、勝手に自走して机の上へ。",
    "週刊誌、「無限稟議社の闇」を特集予定。",
    "SNSで「#無限稟議を許すな」がトレンド入り。",
    "監査役、「見なかったことにしてやる」とワイロを要求。",
    "【速報】宇宙人が入社希望。",
    "【速報】明日が来ない可能性が浮上。",
    "【怪奇】あなたの後ろに誰かいますよ。",
    "【警告】このゲームはフィクションではありません。",
    "世界は、一枚の巨大な書類かもしれない。",
    "クリックする指、疲れていませんか？",
];

const FACILITY_DATA = [
    { id: 0, name: "アルバイト", baseCost: 15, baseProd: 0.5, riskPerSec: 0, desc: "安全です。" },
    { id: 1, name: "自動捺印機", baseCost: 100, baseProd: 4, riskPerSec: 0, desc: "文句を言いません。" },
    { id: 2, name: "ベテラン社員", baseCost: 1100, baseProd: 22, riskPerSec: 0, desc: "残業も厭いません。" },
    { id: 3, name: "クラウドワーカー", baseCost: 12000, baseProd: 85, riskPerSec: 0.1, desc: "管理不届き (リスク+0.1%/s)" },
    { id: 4, name: "承認AI Type-0", baseCost: 130000, baseProd: 350, riskPerSec: 0.5, desc: "暴走の危険 (リスク+0.5%/s)" },
    { id: 5, name: "書類養殖プラント", baseCost: 1400000, baseProd: 1800, riskPerSec: 2.0, desc: "倫理的問題 (リスク+2.0%/s)" },
];

const UPGRADE_DATA = [
    { id: "u0_1", name: "エルゴノミクス椅子", cost: 1000, targetId: 0, scale: 2, req: 10, desc: "アルバイト効率2倍" },
    { id: "u0_2", name: "エナジードリンク", cost: 50000, targetId: 0, scale: 2, req: 50, desc: "アルバイト効率さらに2倍" },
    { id: "u1_1", name: "工業用潤滑油", cost: 10000, targetId: 1, scale: 2, req: 10, desc: "捺印機効率2倍" },
    { id: "u1_2", name: "予備バッテリー", cost: 500000, targetId: 1, scale: 2, req: 50, desc: "捺印機効率さらに2倍" },
    { id: "u2_1", name: "腱鞘炎ガード", cost: 100000, targetId: 2, scale: 2, req: 10, desc: "ベテラン効率2倍" },
    { id: "click_1", name: "重厚なハンコ", cost: 500, targetId: -1, scale: 10, req: 1, desc: "クリック効率10倍" },
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

const SCAPEGOAT_BASE_COST = 2000;
const LAWYER_BASE_COST = 10000;

// 3. ゲーム状態
let game = {
    paper: new D(0),
    totalPaper: new D(0),
    prestigePoints: new D(0),
    totalClicks: 0,
    prestigeCount: 0,
    risk: 0,
    isScandal: false,
    scapegoatUsed: 0,
    lawyerLevel: 0,
    facilities: [],
    upgrades: [],
    achievements: [],
    lastSaveTime: Date.now()
};

let lastFrameTime = Date.now();
let clickTimestamps = [];
let buyMode = 1;
let newsTimer = 0;
let goldenDocTimer = 0;
let activeBuffs = {
    productionMultiplier: 1,
    clickMultiplier: 1,
    endTime: 0
};

/* --- 4. ロード処理 --- */
function loadGame() {
    try {
        const saved = localStorage.getItem("mugenRingiSave");
        if (saved) {
            const parsed = JSON.parse(saved);
            game.paper = new D(parsed.paper || 0);
            game.totalPaper = new D(parsed.totalPaper || 0);
            game.prestigePoints = new D(parsed.prestigePoints || 0);
            game.totalClicks = parsed.totalClicks || 0;
            game.prestigeCount = parsed.prestigeCount || 0;
            game.lastSaveTime = parsed.lastSaveTime || Date.now();
            
            game.risk = (typeof parsed.risk === 'number') ? parsed.risk : 0;
            game.isScandal = !!parsed.isScandal;
            game.scapegoatUsed = parsed.scapegoatUsed || 0;
            game.lawyerLevel = parsed.lawyerLevel || 0;

            // 施設
            game.facilities = FACILITY_DATA.map((data, i) => {
                let owned = 0;
                if (parsed.facilities && parsed.facilities[i]) {
                    owned = parsed.facilities[i].owned || 0;
                }
                return { id: data.id, owned: owned };
            });

            // アップグレード
            game.upgrades = UPGRADE_DATA.map(data => {
                let purchased = false;
                if (parsed.upgrades) {
                    const savedUp = parsed.upgrades.find(su => su.id === data.id);
                    if (savedUp) purchased = savedUp.purchased;
                }
                return { ...data, purchased: purchased };
            });

            // 実績
            game.achievements = ACHIEVEMENT_DATA.map(data => {
                let unlocked = false;
                if (parsed.achievements) {
                    const savedAch = parsed.achievements.find(sa => sa.id === data.id);
                    if (savedAch) unlocked = savedAch.unlocked;
                }
                return { ...data, unlocked: unlocked };
            });

            processOfflineProgress();
        } else {
            initNewGame();
        }

        initUI();
        resetGoldenTimer();
        lastFrameTime = Date.now();
        requestAnimationFrame(gameLoop);

    } catch (e) {
        console.error("Load Error:", e);
        initNewGame();
        initUI();
        requestAnimationFrame(gameLoop);
    }
}

function initNewGame() {
    game.paper = new D(0);
    game.totalPaper = new D(0);
    game.prestigePoints = new D(0);
    game.totalClicks = 0;
    game.prestigeCount = 0;
    game.risk = 0;
    game.isScandal = false;
    game.scapegoatUsed = 0;
    game.lawyerLevel = 0;
    game.facilities = FACILITY_DATA.map(d => ({ id: d.id, owned: 0 }));
    game.upgrades = UPGRADE_DATA.map(d => ({ ...d, purchased: false }));
    game.achievements = ACHIEVEMENT_DATA.map(d => ({ ...d, unlocked: false }));
    game.lastSaveTime = Date.now();
}

function initUI() {
    createFacilityUI();
    createUpgradeUI(); // ここでDOMを作成し、以降はupdateButtonsで制御する
    createAchievementUI();
    createRiskShopUI();
    updateBuyModeUI();
    updateNews();
    if (game.isScandal) startScandal();
}

/* --- 5. ゲームループ --- */
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // リスク計算
    let riskIncrease = 0;
    game.facilities.forEach(f => {
        let d = FACILITY_DATA[f.id];
        if (d.riskPerSec > 0) riskIncrease += d.riskPerSec * f.owned;
    });
    let riskDecay = 1.0 + (game.lawyerLevel * 0.5);
    if (!game.isScandal) {
        let delta = riskIncrease - riskDecay;
        game.risk += delta * dt;
        if (game.risk < 0) game.risk = 0;
        if (game.risk >= 100) { game.risk = 100; startScandal(); }
    }
    updateRiskUI(riskIncrease - riskDecay);

    // 生産
    let cps = calculateCPS();
    if (game.isScandal) cps = cps.times(0.2);
    if (dt > 0) {
        const earned = cps.times(dt);
        game.paper = game.paper.plus(earned);
        game.totalPaper = game.totalPaper.plus(earned);
    }

    // ニュース
    newsTimer += dt;
    if (newsTimer > 15) {
        newsTimer = 0;
        updateNews();
    }

    // ゴールデン書類
    if (goldenDocTimer > 0) {
        goldenDocTimer -= dt;
        if (goldenDocTimer <= 0) {
            spawnGoldenDoc();
        }
    }

    // バフ処理
    if (now > activeBuffs.endTime) {
        activeBuffs.productionMultiplier = 1;
        activeBuffs.clickMultiplier = 1;
        document.getElementById("buff-display").style.display = "none";
    } else {
        const buffEl = document.getElementById("buff-display");
        buffEl.style.display = "block";
        let text = "";
        if(activeBuffs.productionMultiplier > 1) text += `生産${activeBuffs.productionMultiplier}倍 `;
        if(activeBuffs.clickMultiplier > 1) text += `クリック${activeBuffs.clickMultiplier}倍 `;
        let remain = Math.ceil((activeBuffs.endTime - now) / 1000);
        buffEl.innerText = `★FEVER: ${text}(あと${remain}秒)`;
    }

    // UI更新
    setText("counter", formatNumber(game.paper));
    setText("cps-display", "毎秒処理: " + formatNumber(cps) + " 枚");
    updateButtons(); // ここでdisabled状態などを更新
    updateRiskShop();
    checkPrestige();
    checkAchievements();

    if (Math.random() < 0.02) saveGame();
    requestAnimationFrame(gameLoop);
}

/* --- 6. アクション & ロジック --- */
function clickStamp(event) {
    game.totalClicks++;
    const now = Date.now();
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter(t => now - t < 1000);

    let clickPower = new D(1);
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    clickPower = clickPower.times(new D(1.04).pow(unlockedCount));
    clickPower = clickPower.times(game.prestigePoints.times(0.1).plus(1));
    
    const upg = game.upgrades.find(u => u.id === "click_1");
    if (upg && upg.purchased) clickPower = clickPower.times(upg.scale);

    if (now < activeBuffs.endTime) {
        clickPower = clickPower.times(activeBuffs.clickMultiplier);
    }

    game.paper = game.paper.plus(clickPower);
    game.totalPaper = game.totalPaper.plus(clickPower);
    spawnFloatingText(event, "+" + formatNumber(clickPower));
}

function buyFacility(index) {
    const f = game.facilities[index];
    const bulk = getBulkCost(f, buyMode);
    if (bulk.amount > 0 && game.paper.gte(bulk.cost)) {
        game.paper = game.paper.minus(bulk.cost);
        f.owned += bulk.amount;
        // リスク表示即時更新
        let riskIncrease = 0;
        game.facilities.forEach(f => { 
            let d = FACILITY_DATA[f.id];
            if (d.riskPerSec > 0) riskIncrease += d.riskPerSec * f.owned;
        });
        let riskDecay = 1.0 + (game.lawyerLevel * 0.5);
        updateRiskUI(riskIncrease - riskDecay);
    }
}

function buyUpgrade(index) {
    const u = game.upgrades[index];
    // ★修正：Decimal型に変換して比較を確実にする
    const cost = new D(u.cost);
    
    if (!u.purchased && game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        u.purchased = true;
        
        // ★修正：ここでは再描画関数(createUpgradeUI)を呼ばず、
        // DOMのclass変更とテキスト変更だけで済ませるか、
        // updateButtonsに任せる。ここでは何もしなくても次のフレームでupdateButtonsが反映する。
    }
}

function calculateCPS(ignoreBuffs = false) {
    let prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.04).pow(unlockedCount);
    
    let globalMult = prestigeBonus.times(achievementBonus);
    if (!ignoreBuffs && Date.now() < activeBuffs.endTime) {
        globalMult = globalMult.times(activeBuffs.productionMultiplier);
    }

    let cps = new D(0);
    game.facilities.forEach(f => {
        let data = FACILITY_DATA[f.id];
        let prod = new D(data.baseProd).times(globalMult);
        game.upgrades.forEach(u => {
            if (u.purchased && u.targetId === f.id) prod = prod.times(u.scale);
        });
        cps = cps.plus(prod.times(f.owned));
    });
    return cps;
}

function getBulkCost(facilityObj, mode) {
    let data = FACILITY_DATA[facilityObj.id];
    let base = new D(data.baseCost);
    let r = 1.15;
    let owned = facilityObj.owned;
    let cost = new D(0);
    let amount = 0;

    if (mode === 'MAX') {
        let currentPaper = new D(game.paper);
        let currentPrice = base.times(new D(r).pow(owned));
        for(let i=0; i<1000; i++) {
            if (currentPaper.gte(currentPrice)) {
                currentPaper = currentPaper.minus(currentPrice);
                cost = cost.plus(currentPrice);
                amount++;
                currentPrice = currentPrice.times(r);
            } else { break; }
        }
    } else {
        let count = parseInt(mode);
        let tempPrice = base.times(new D(r).pow(owned));
        for(let i=0; i<count; i++) {
            cost = cost.plus(tempPrice);
            tempPrice = tempPrice.times(r);
        }
        amount = count;
    }
    return { cost: cost, amount: amount };
}

/* --- 7. UI更新系 --- */
function updateButtons() {
    // 施設ボタン更新
    let prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.04).pow(unlockedCount);
    let globalMult = prestigeBonus.times(achievementBonus);
    if (Date.now() < activeBuffs.endTime) globalMult = globalMult.times(activeBuffs.productionMultiplier);

    game.facilities.forEach((f, i) => {
        const bulk = getBulkCost(f, buyMode);
        setText(`owned-${i}`, f.owned);
        
        let data = FACILITY_DATA[i];
        let prod = new D(data.baseProd).times(globalMult);
        game.upgrades.forEach(u => { if (u.purchased && u.targetId === i) prod = prod.times(u.scale); });
        let totalProd = prod.times(f.owned);
        
        setText(`prod-total-${i}`, formatNumber(totalProd));
        setText(`prod-single-${i}`, formatNumber(prod));

        const btn = document.getElementById(`btn-${i}`);
        if (btn) {
            if (game.isScandal) {
                btn.innerHTML = "炎上中<br>不可";
                btn.disabled = true;
            } else if (bulk.amount === 0) {
                let nextCost = new D(data.baseCost).times(new D(1.15).pow(f.owned));
                btn.innerHTML = `雇用 (不足)<br><span style="font-size:10px">${formatNumber(nextCost)}</span>`;
                btn.disabled = true;
            } else {
                btn.innerHTML = `雇用 +${bulk.amount}<br><span id="cost-${i}">${formatNumber(bulk.cost)}</span>`;
                btn.disabled = game.paper.lt(bulk.cost);
            }
        }
    });
    
    // ★修正：アップグレードボタン更新
    game.upgrades.forEach((u, i) => {
        const box = document.getElementById(`upg-box-${i}`);
        const btn = document.getElementById(`upg-btn-${i}`);
        if (box && btn) {
            let isVisible = u.purchased || 
               (u.targetId >= 0 && game.facilities[u.targetId].owned >= u.req) ||
               (u.targetId === -1);
            
            box.style.display = isVisible ? "flex" : "none";
            
            if (u.purchased) {
                btn.innerHTML = "済";
                btn.className = "buy-btn bought-btn";
                btn.disabled = true;
            } else {
                const cost = new D(u.cost);
                btn.innerHTML = `購入 ${formatNumber(cost)}`;
                btn.className = "buy-btn";
                btn.disabled = game.paper.lt(cost) || game.isScandal;
            }
        }
    });
}

function updateRiskUI(trend) {
    const bar = document.getElementById("risk-bar");
    const val = document.getElementById("risk-val");
    const trendTxt = document.getElementById("risk-trend");
    
    if (bar) bar.style.width = game.risk + "%";
    if (val) val.innerText = Math.floor(game.risk) + "%";
    if (trendTxt && trend !== undefined) {
        trendTxt.innerText = `変動: ${(trend > 0 ? "+" : "") + trend.toFixed(2)}%/秒`;
        trendTxt.style.color = trend > 0 ? "#d32f2f" : "#2e7d32";
    }
    const scanBar = document.getElementById("scandal-meter-bar");
    if (scanBar) scanBar.style.width = game.risk + "%";
}

function updateRiskShop() {
    const sCost = new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed));
    setText("cost-scapegoat", formatNumber(sCost));
    const btnS = document.getElementById("btn-scapegoat");
    if (btnS) btnS.disabled = game.paper.lt(sCost);

    const lCost = new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel));
    setText("cost-lawyer", formatNumber(lCost));
    setText("lvl-lawyer", game.lawyerLevel);
    const btnL = document.getElementById("btn-lawyer");
    if (btnL) btnL.disabled = game.paper.lt(lCost);
}

/* --- ヘルパー関数 --- */
function formatNumber(n) {
    n = new D(n);
    if (n.lt(1000000)) return n.toNumber().toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (n.exponent >= 66) return n.mantissa.toFixed(2) + "e" + n.exponent;
    const suffixIndex = Math.floor(n.exponent / 3);
    const suffix = SUFFIXES[suffixIndex] || "??";
    const val = n.mantissa * Math.pow(10, n.exponent % 3);
    return val.toFixed(2) + " " + suffix;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function getOwned(g, id) {
    return g.facilities[id] ? g.facilities[id].owned : 0;
}

function getPurchasedCount(g) {
    return g.upgrades.filter(u => u.purchased).length;
}

function getTotalFacilities(g) {
    return g.facilities.reduce((sum, f) => sum + f.owned, 0);
}

function buyScapegoat() {
    const cost = new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed));
    if (game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        game.scapegoatUsed++;
        game.risk = Math.max(0, game.risk - 50);
        if (game.isScandal && game.risk <= 0) endScandal();
        updateRiskShop();
    }
}

function buyLawyer() {
    const cost = new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel));
    if (game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        game.lawyerLevel++;
        updateRiskShop();
    }
}

function startScandal() {
    game.isScandal = true;
    const el = document.getElementById("scandal-overlay");
    if (el) el.style.display = "flex";
}

function endScandal() {
    game.isScandal = false;
    const el = document.getElementById("scandal-overlay");
    if (el) el.style.display = "none";
}

function clickApology() {
    game.risk -= 5;
    if (game.risk <= 0) {
        game.risk = 0;
        endScandal();
    }
    updateRiskUI();
}

function checkPrestige() {
    const threshold = 1000000;
    let potential = game.totalPaper.div(threshold).pow(1 / 3).floor();
    let gain = potential.minus(game.prestigePoints);
    if (gain.lt(0)) gain = new D(0);

    let nextPoint = potential.plus(1);
    let reqTotal = nextPoint.pow(3).times(threshold);
    let remaining = reqTotal.minus(game.totalPaper);
    if (remaining.lt(0)) remaining = new D(0);

    setText("next-prestige-info", `次の伝説度まで: あと ${formatNumber(remaining)} 枚`);

    const btn = document.getElementById("do-prestige-btn");
    if (btn) {
        if (gain.gte(1)) {
            btn.style.display = "block";
            setText("prestige-gain", formatNumber(gain));
        } else {
            btn.style.display = "none";
        }
    }
}

function doPrestige() {
    const threshold = 1000000;
    let potential = game.totalPaper.div(threshold).pow(1 / 3).floor();
    let gain = potential.minus(game.prestigePoints);

    if (gain.lt(1)) return;

    if (confirm(`本社へ栄転しますか？\n\n伝説度 +${formatNumber(gain)} を獲得します。`)) {
        game.prestigePoints = game.prestigePoints.plus(gain);
        game.prestigeCount++;
        game.paper = new D(0);
        
        game.risk = 0;
        game.isScandal = false;
        game.scapegoatUsed = 0;
        game.lawyerLevel = 0;

        game.facilities.forEach(f => f.owned = 0);
        game.upgrades.forEach(u => u.purchased = false);
        saveGame();
        location.reload();
    }
}

function saveGame() {
    const saveObj = {
        paper: game.paper.toString(),
        totalPaper: game.totalPaper.toString(),
        prestigePoints: game.prestigePoints.toString(),
        totalClicks: game.totalClicks,
        prestigeCount: game.prestigeCount,
        lastSaveTime: Date.now(),
        risk: game.risk,
        isScandal: game.isScandal,
        scapegoatUsed: game.scapegoatUsed,
        lawyerLevel: game.lawyerLevel,
        facilities: game.facilities.map(f => ({ owned: f.owned })),
        upgrades: game.upgrades.map(u => ({ id: u.id, purchased: u.purchased })),
        achievements: game.achievements.map(a => ({ id: a.id, unlocked: a.unlocked }))
    };
    localStorage.setItem("mugenRingiSave", JSON.stringify(saveObj));
}

function processOfflineProgress() {
    const now = Date.now();
    const diff = (now - game.lastSaveTime) / 1000;
    if (diff > 10) {
        let cps = calculateCPS(true);
        if (game.isScandal) cps = cps.times(0.2);
        
        const earned = cps.times(diff);
        if (earned.gt(0)) {
            game.paper = game.paper.plus(earned);
            game.totalPaper = game.totalPaper.plus(earned);
            
            const m = document.getElementById("offline-modal");
            if (m) {
                setText("offline-time", formatNumber(diff));
                setText("offline-earned", formatNumber(earned));
                m.style.display = "flex";
            }
        }
    }
}

function setBuyMode(m) {
    buyMode = m;
    updateBuyModeUI();
}

function updateBuyModeUI() {
    ['1', '10', '100', 'max'].forEach(m => {
        const btn = document.getElementById(`mode-${m}`);
        if (btn) btn.className = "mode-btn";
    });
    const activeId = (buyMode === 'MAX') ? 'max' : buyMode;
    const aBtn = document.getElementById(`mode-${activeId}`);
    if (aBtn) aBtn.className = "mode-btn active";
}

function switchTab(name) {
    ['facilities', 'upgrades', 'risk', 'achievements'].forEach(t => {
        const el = document.getElementById(`${t}-tab`);
        if (el) el.style.display = (t === name) ? 'block' : 'none';
    });
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach((b, i) => {
        b.className = 'tab-btn' + (['facilities', 'upgrades', 'risk', 'achievements'][i] === name ? ' active' : '');
    });
}

function spawnFloatingText(e, text) {
    const el = document.createElement("div");
    el.className = "click-effect";
    el.innerText = text;
    let x = e.clientX;
    let y = e.clientY;
    if (!x || !y) {
        const r = document.getElementById("stamp-btn").getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top;
    }
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function checkAchievements() {
    game.achievements.forEach((a, index) => {
        if (!a.unlocked && a.check(game)) {
            a.unlocked = true;
            notify(`実績解除: ${a.name}`);
            const box = document.getElementById(`ach-box-${index}`);
            if (box) {
                box.classList.add("unlocked");
                box.innerHTML = `<div class="ach-icon">🏆</div><div class="item-info"><h3>${a.name}</h3><p>${a.desc}</p></div>`;
            }
        }
    });
}

function notify(msg) {
    const area = document.getElementById("notification-area");
    if (area) {
        const div = document.createElement("div");
        div.className = "notify-box";
        div.innerText = msg;
        area.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    }
}

function exportSave() {
    saveGame();
    const saved = localStorage.getItem("mugenRingiSave");
    prompt("以下のテキストをコピーして保存してください", btoa(saved));
}

function importSave() {
    try {
        const d = atob(prompt("保存したデータを貼り付けてください"));
        JSON.parse(d);
        localStorage.setItem("mugenRingiSave", d);
        location.reload();
    } catch (e) {
        alert("データの読み込みに失敗しました。");
    }
}

function hardReset() {
    if (confirm("本当に全てのデータを消去しますか？（復元できません）")) {
        localStorage.removeItem("mugenRingiSave");
        location.reload();
    }
}

function createFacilityUI() {
    const container = document.getElementById("facilities-container");
    if (!container) return;
    container.innerHTML = "";
    
    FACILITY_DATA.forEach((data, index) => {
        const div = document.createElement("div");
        div.className = "item-box facility";
        div.innerHTML = `
            <div class="item-info">
                <h3>${data.name}</h3>
                <p>${data.desc}</p>
                <p>所持: <span id="owned-${index}" style="font-weight:bold;">0</span></p>
                <p>生産: <span id="prod-total-${index}">0</span> /秒 <span style="color:#888; font-size:10px;">(単体 <span id="prod-single-${index}">0</span>)</span></p>
