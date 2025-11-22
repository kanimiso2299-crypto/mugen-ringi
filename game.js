/* --- 無限稟議 ゲームロジック (Ver 9.0: Click Power Update) --- */

// 1. ライブラリチェック
if (typeof Decimal === 'undefined') {
    alert("【致命的エラー】\nライブラリの読み込みに失敗しました。\n通信環境の良い場所でリロードしてください。");
    throw new Error("Decimal lib missing");
}

const D = Decimal;
const SUFFIXES = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"];

// 2. データ定数
const FACILITY_DATA = [
    { id: 0, name: "アルバイト", baseCost: 15, baseProd: 0.5, riskPerSec: 0, desc: "安全です。" },
    { id: 1, name: "自動捺印機", baseCost: 100, baseProd: 4, riskPerSec: 0, desc: "文句を言いません。" },
    { id: 2, name: "ベテラン社員", baseCost: 1100, baseProd: 22, riskPerSec: 0, desc: "残業も厭いません。" },
    { id: 3, name: "クラウドワーカー", baseCost: 12000, baseProd: 85, riskPerSec: 0.1, desc: "管理不届き (リスク+0.1%/s)" },
    { id: 4, name: "承認AI Type-0", baseCost: 130000, baseProd: 350, riskPerSec: 0.5, desc: "暴走の危険 (リスク+0.5%/s)" },
    { id: 5, name: "書類養殖プラント", baseCost: 1400000, baseProd: 1800, riskPerSec: 2.0, desc: "倫理的問題 (リスク+2.0%/s)" },
];

// type: "mul" (乗算) or "cps" (CPS加算)
const UPGRADE_DATA = [
    // 施設強化
    { id: "u0_1", name: "エルゴノミクス椅子", cost: 1000, targetId: 0, type: "mul", scale: 2, req: 10, desc: "アルバイト効率2倍" },
    { id: "u0_2", name: "エナジードリンク", cost: 50000, targetId: 0, type: "mul", scale: 2, req: 50, desc: "アルバイト効率さらに2倍" },
    { id: "u1_1", name: "工業用潤滑油", cost: 10000, targetId: 1, type: "mul", scale: 2, req: 10, desc: "捺印機効率2倍" },
    { id: "u1_2", name: "予備バッテリー", cost: 500000, targetId: 1, type: "mul", scale: 2, req: 50, desc: "捺印機効率さらに2倍" },
    { id: "u2_1", name: "腱鞘炎ガード", cost: 100000, targetId: 2, type: "mul", scale: 2, req: 10, desc: "ベテラン効率2倍" },
    
    // ★新：クリック強化 (targetId: -1)
    { id: "click_base", name: "重厚なハンコ", cost: 500, targetId: -1, type: "mul", scale: 10, req: 1, desc: "クリック基礎力 10倍" },
    { id: "click_cps_1", name: "手首の筋トレ", cost: 5000, targetId: -1, type: "cps", scale: 0.01, req: 100, desc: "クリックに秒間生産量の1%を加算" },
    { id: "click_cps_2", name: "高級朱肉", cost: 50000, targetId: -1, type: "cps", scale: 0.02, req: 1000, desc: "クリックに秒間生産量の2%を加算" },
    { id: "click_cps_3", name: "マクロツール", cost: 5000000, targetId: -1, type: "cps", scale: 0.05, req: 10000, desc: "クリックに秒間生産量の5%を加算" },
    { id: "click_cps_4", name: "社長の直接決済", cost: 500000000, targetId: -1, type: "cps", scale: 0.10, req: 50000, desc: "クリックに秒間生産量の10%を加算" },
    { id: "click_god", name: "神の指", cost: 500000000000, targetId: -1, type: "mul", scale: 20, req: 100000, desc: "クリック基礎力 さらに20倍" },
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

// ランタイム変数（保存しない）
let lastFrameTime = Date.now();
let clickTimestamps = [];
let buyMode = 1;
let newsTimer = 0;
let goldenDocTimer = 0;
let activeBuffs = { productionMultiplier: 1, clickMultiplier: 1, endTime: 0 };
let cachedCPS = new D(0); // ★最適化：CPSをキャッシュ

/* --- 4. 初期化・ロード --- */
function loadGame() {
    try {
        const saved = localStorage.getItem("mugenRingiSave");
        if (saved) {
            const parsed = JSON.parse(saved);
            game.paper = new D(parsed.paper || 0);
            game.totalPaper = new D(parsed.totalPaper || 0);
            game.prestigePoints = new D(parsed.prestigePoints || 0);
            game.totalClicks = Number(parsed.totalClicks) || 0;
            game.prestigeCount = Number(parsed.prestigeCount) || 0;
            game.lastSaveTime = Number(parsed.lastSaveTime) || Date.now();
            
            game.risk = Number(parsed.risk) || 0;
            game.isScandal = !!parsed.isScandal;
            game.scapegoatUsed = Number(parsed.scapegoatUsed) || 0;
            game.lawyerLevel = Number(parsed.lawyerLevel) || 0;

            // 施設データのマージ
            game.facilities = FACILITY_DATA.map((data, i) => {
                let owned = 0;
                if (parsed.facilities && parsed.facilities[i]) owned = Number(parsed.facilities[i].owned) || 0;
                return { id: data.id, owned: owned };
            });

            // アップグレードの復元（IDベースで照合）
            game.upgrades = UPGRADE_DATA.map(data => {
                let purchased = false;
                if (parsed.upgrades) {
                    const savedUp = parsed.upgrades.find(su => su.id === data.id);
                    if (savedUp) purchased = savedUp.purchased;
                }
                return { ...data, purchased: purchased };
            });

            // 実績の復元
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
    } catch (e) {
        console.error("Load Error:", e);
        initNewGame();
    }

    initUI();
    resetGoldenTimer();
    lastFrameTime = Date.now();
    requestAnimationFrame(gameLoop);
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
    safeExecute(createFacilityUI);
    safeExecute(createUpgradeUI);
    safeExecute(createAchievementUI);
    safeExecute(createRiskShopUI);
    safeExecute(updateBuyModeUI);
    safeExecute(updateNews);
    if (game.isScandal) startScandal();
}

/* --- 5. ゲームループ --- */
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // 1. リスク計算
    safeExecute(() => updateRiskLogic(dt));

    // 2. 生産計算
    cachedCPS = calculateCPS(); // 毎フレーム計算してキャッシュ
    let effectiveCPS = cachedCPS;
    if (game.isScandal) effectiveCPS = effectiveCPS.times(0.2);

    if (dt > 0) {
        const earned = effectiveCPS.times(dt);
        game.paper = game.paper.plus(earned);
        game.totalPaper = game.totalPaper.plus(earned);
    }

    // 3. 各種更新
    safeExecute(() => updateNewsLogic(dt));
    safeExecute(() => updateGoldenDocLogic(dt));
    safeExecute(() => updateBuffLogic(now));
    
    // 4. UI更新
    setText("counter", formatNumber(game.paper));
    setText("cps-display", "毎秒処理: " + formatNumber(effectiveCPS) + " 枚");

    safeExecute(updateFacilityButtons);
    safeExecute(updateUpgradeButtons);
    safeExecute(updateRiskShop);
    safeExecute(checkPrestige);
    safeExecute(checkAchievements);

    if (Math.random() < 0.02) saveGame();
    requestAnimationFrame(gameLoop);
}

/* --- 6. ロジック詳細 --- */
function updateRiskLogic(dt) {
    let riskIncrease = 0;
    game.facilities.forEach(f => {
        let d = FACILITY_DATA[f.id];
        if (d && d.riskPerSec > 0) riskIncrease += d.riskPerSec * f.owned;
    });
    let riskDecay = 1.0 + (game.lawyerLevel * 0.5);
    if (!game.isScandal) {
        let delta = riskIncrease - riskDecay;
        game.risk += delta * dt;
        if (game.risk < 0) game.risk = 0;
        if (game.risk >= 100) { game.risk = 100; startScandal(); }
    }
    updateRiskUI(riskIncrease - riskDecay);
}

function updateNewsLogic(dt) {
    newsTimer += dt;
    if (newsTimer > 15) {
        newsTimer = 0;
        updateNews();
    }
}

function updateGoldenDocLogic(dt) {
    if (goldenDocTimer > 0) {
        goldenDocTimer -= dt;
        if (goldenDocTimer <= 0) spawnGoldenDoc();
    }
}

function updateBuffLogic(now) {
    if (now > activeBuffs.endTime) {
        activeBuffs.productionMultiplier = 1;
        activeBuffs.clickMultiplier = 1;
        const el = document.getElementById("buff-display");
        if(el) el.style.display = "none";
    } else {
        const buffEl = document.getElementById("buff-display");
        if(buffEl) {
            buffEl.style.display = "block";
            let text = "";
            if(activeBuffs.productionMultiplier > 1) text += `生産${activeBuffs.productionMultiplier}倍 `;
            if(activeBuffs.clickMultiplier > 1) text += `クリック${activeBuffs.clickMultiplier}倍 `;
            let remain = Math.ceil((activeBuffs.endTime - now) / 1000);
            buffEl.innerText = `★FEVER: ${text}(あと${remain}秒)`;
        }
    }
}

/* --- 7. 計算ロジック --- */
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
        if(data) {
            let prod = new D(data.baseProd).times(globalMult);
            game.upgrades.forEach(u => {
                if (u.purchased && u.targetId === f.id && (!u.type || u.type === "mul")) {
                    prod = prod.times(u.scale);
                }
            });
            cps = cps.plus(prod.times(f.owned));
        }
    });
    return cps;
}

function getBulkCost(facilityObj, mode) {
    let data = FACILITY_DATA[facilityObj.id];
    if(!data) return { cost: new D(0), amount: 0 };
    
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

/* --- 8. アクション --- */
function clickStamp(event) {
    game.totalClicks++;
    const now = Date.now();
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter(t => now - t < 1000);

    let clickPower = new D(1);
    
    // 1. 基礎倍率 (実績, 転生, 施設UGのmulタイプ)
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.04).pow(unlockedCount);
    let prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    clickPower = clickPower.times(prestigeBonus).times(achievementBonus);

    // 2. クリック専用UG (乗算タイプ: targetId=-1, type="mul")
    game.upgrades.forEach(u => {
        if (u.purchased && u.targetId === -1 && u.type === "mul") {
            clickPower = clickPower.times(u.scale);
        }
    });

    // 3. CPS加算タイプ (targetId=-1, type="cps")
    let cpsAdd = new D(0);
    let currentCPS = cachedCPS; // キャッシュを使用
    game.upgrades.forEach(u => {
        if (u.purchased && u.targetId === -1 && u.type === "cps") {
            cpsAdd = cpsAdd.plus(currentCPS.times(u.scale));
        }
    });
    clickPower = clickPower.plus(cpsAdd);

    // 4. バフ適用
    if (now < activeBuffs.endTime) {
        clickPower = clickPower.times(activeBuffs.clickMultiplier);
    }

    game.paper = game.paper.plus(clickPower);
    game.totalPaper = game.totalPaper.plus(clickPower);
    spawnFloatingText(event, "+" + formatNumber(clickPower));
}

function buyFacility(index) {
    if (!game.facilities[index]) return;
    const f = game.facilities[index];
    const bulk = getBulkCost(f, buyMode);
    if (bulk.amount > 0 && game.paper.gte(bulk.cost)) {
        game.paper = game.paper.minus(bulk.cost);
        f.owned += bulk.amount;
        // リスクUI更新
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
    if (!game.upgrades[index]) return;
    const u = game.upgrades[index];
    const cost = new D(u.cost);
    if (!u.purchased && game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        u.purchased = true;
        // 画面更新は次フレームのupdateButtonsで
    }
}

/* --- 9. UI更新 --- */
function updateFacilityButtons() {
    let prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.04).pow(unlockedCount);
    let globalMult = prestigeBonus.times(achievementBonus);
    if (Date.now() < activeBuffs.endTime) globalMult = globalMult.times(activeBuffs.productionMultiplier);

    game.facilities.forEach((f, i) => {
        const btn = document.getElementById(`btn-${i}`);
        if (!btn) return;

        const bulk = getBulkCost(f, buyMode);
        setText(`owned-${i}`, f.owned);
        
        let data = FACILITY_DATA[i];
        let prod = new D(data.baseProd).times(globalMult);
        game.upgrades.forEach(u => { 
            if (u.purchased && u.targetId === i && (!u.type || u.type === "mul")) {
                prod = prod.times(u.scale); 
            }
        });
        
        setText(`prod-total-${i}`, formatNumber(prod.times(f.owned)));
        setText(`prod-single-${i}`, formatNumber(prod));

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
    });
}

function updateUpgradeButtons() {
    game.upgrades.forEach((u, i) => {
        const box = document.getElementById(`upg-box-${i}`);
        const btn = document.getElementById(`upg-btn-${i}`);
        if (box && btn) {
            let isVisible = u.purchased || 
               (u.targetId >= 0 && game.facilities[u.targetId] && game.facilities[u.targetId].owned >= u.req) ||
               (u.targetId === -1 && (u.req <= game.totalClicks || u.req <= game.paper.e)); 
               // クリック系はクリック数か所持金桁数で出す簡易ロジック(今回はクリック数やpaperで判定)
               // データ定義のreqはクリック数や枚数など文脈依存だが、
               // 今回は簡易的に「targetId=-1なら常に出すか、安い順に出す」
               // -> 修正: targetId=-1の場合は、reqを"ゲーム全体の進行度"とみなすが、
               // わかりやすく「1つ前のUGを買ったら次が出る」か「最初から全部出る」にする。
               // 今回は「targetId=-1 は常に表示」に変更して遊びやすくする。
            
            if (u.targetId === -1) isVisible = true;

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

/* --- その他ツール・UI --- */
function createFacilityUI() {
    const c = document.getElementById("facilities-container");
    if(!c) return;
    c.innerHTML = "";
    FACILITY_DATA.forEach((d, i) => {
        const div = document.createElement("div");
        div.className = "item-box facility";
        div.innerHTML = `
            <div class="item-info"><h3>${d.name}</h3><p>${d.desc}</p>
            <p>所持: <span id="owned-${i}" style="font-weight:bold;">0</span></p>
            <p>生産: <span id="prod-total-${i}">0</span> /秒 <span style="color:#888; font-size:10px;">(単体 <span id="prod-single-${i}">0</span>)</span></p></div>
            <button class="buy-btn" id="btn-${i}" onclick="buyFacility(${i})">雇用</button>`;
        c.appendChild(div);
    });
}

function createUpgradeUI() {
    const c = document.getElementById("upgrades-container");
    if(!c) return;
    c.innerHTML = `<p style="padding:5px; color:#999; font-size:12px;">条件を満たすと出現します</p>`;
    game.upgrades.forEach((u, i) => {
        const div = document.createElement("div");
        div.className = "item-box";
        div.id = `upg-box-${i}`;
        div.style.display = "none";
        div.innerHTML = `<div class="item-info"><h3>${u.name}</h3><p>${u.desc}</p></div>
            <button class="buy-btn" id="upg-btn-${i}" onclick="buyUpgrade(${i})">購入</button>`;
        c.appendChild(div);
    });
}

function createRiskShopUI() {
    const c = document.getElementById("risk-shop-container");
    if(!c) return;
    c.innerHTML = "";
    const dS = document.createElement("div"); dS.className="item-box";
    dS.innerHTML = `<div class="item-info"><h3>スケープゴート</h3><p>リスク-50% (価格3倍増)</p></div><button class="buy-btn risk-btn danger" id="btn-scapegoat" onclick="buyScapegoat()">購入 <span id="cost-scapegoat">0</span></button>`;
    c.appendChild(dS);
    const dL = document.createElement("div"); dL.className="item-box";
    dL.innerHTML = `<div class="item-info"><h3>顧問弁護士 (Lv.<span id="lvl-lawyer">0</span>)</h3><p>リスク減少UP (価格2.5倍増)</p></div><button class="buy-btn risk-btn" id="btn-lawyer" onclick="buyLawyer()">契約 <span id="cost-lawyer">0</span></button>`;
    c.appendChild(dL);
}

function createAchievementUI() {
    const c = document.getElementById("achievements-container");
    if(!c) return;
    c.innerHTML = "";
    game.achievements.forEach((a, i) => {
        const div = document.createElement("div");
        div.className = "achievement-box";
        div.id = `ach-box-${i}`;
        if(a.unlocked) div.classList.add("unlocked");
        const icon = a.unlocked ? "🏆" : "❓";
        const name = a.unlocked ? a.name : "？？？";
        const desc = a.unlocked ? a.desc : "（条件未達成）";
        div.innerHTML = `<div class="ach-icon">${icon}</div><div class="item-info"><h3 id="ach-name-${i}">${name}</h3><p id="ach-desc-${i}">${desc}</p></div>`;
        c.appendChild(div);
    });
}

function updateRiskUI(trend) {
    const bar = document.getElementById("risk-bar");
    const val = document.getElementById("risk-val");
    const trendTxt = document.getElementById("risk-trend");
    if(bar) bar.style.width = game.risk + "%";
    if(val) val.innerText = Math.floor(game.risk) + "%";
    if(trendTxt && trend !== undefined) {
        trendTxt.innerText = `変動: ${(trend > 0 ? "+" : "") + trend.toFixed(2)}%/秒`;
        trendTxt.style.color = trend > 0 ? "#d32f2f" : "#2e7d32";
    }
    const scanBar = document.getElementById("scandal-meter-bar");
    if(scanBar) scanBar.style.width = game.risk + "%";
}

function updateRiskShop() {
    const sCost = new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed));
    setText("cost-scapegoat", formatNumber(sCost));
    const btnS = document.getElementById("btn-scapegoat");
    if(btnS) btnS.disabled = game.paper.lt(sCost);

    const lCost = new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel));
    setText("cost-lawyer", formatNumber(lCost));
    setText("lvl-lawyer", game.lawyerLevel);
    const btnL = document.getElementById("btn-lawyer");
    if(btnL) btnL.disabled = game.paper.lt(lCost);
}

// 共通ヘルパー
function safeExecute(func) { try { func(); } catch (e) { console.warn("Exec skip:", e); } }
function setText(id, text) { const el = document.getElementById(id); if(el) el.innerText = text; }
function formatNumber(n) {
    n = new D(n);
    if (n.lt(1000000)) return n.toNumber().toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (n.exponent >= 66) return n.mantissa.toFixed(2) + "e" + n.exponent;
    const suffixIndex = Math.floor(n.exponent / 3);
    const suffix = SUFFIXES[suffixIndex] || "??";
    const val = n.mantissa * Math.pow(10, n.exponent % 3);
    return val.toFixed(2) + " " + suffix;
}
function getOwned(g, id) { return g.facilities[id] ? g.facilities[id].owned : 0; }
function getPurchasedCount(g) { return g.upgrades.filter(u => u.purchased).length; }
function getTotalFacilities(g) { return g.facilities.reduce((sum, f) => sum + f.owned, 0); }
function buyScapegoat() { const c = new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed)); if(game.paper.gte(c)){ game.paper=game.paper.minus(c); game.scapegoatUsed++; game.risk=Math.max(0,game.risk-50); if(game.isScandal&&game.risk<=0)endScandal(); updateRiskShop(); }}
function buyLawyer() { const c = new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel)); if(game.paper.gte(c)){ game.paper=game.paper.minus(c); game.lawyerLevel++; updateRiskShop(); }}
function startScandal() { game.isScandal=true; document.getElementById("scandal-overlay").style.display="flex"; }
function endScandal() { game.isScandal=false; document.getElementById("scandal-overlay").style.display="none"; }
function clickApology() { game.risk-=5; if(game.risk<=0){game.risk=0; endScandal();} updateRiskUI(); }
function checkPrestige() {
    const th = 1000000; let pot = game.totalPaper.div(th).pow(1/3).floor(); let gain = pot.minus(game.prestigePoints); if(gain.lt(0)) gain=new D(0);
    let next = pot.plus(1); let req = next.pow(3).times(th); let rem = req.minus(game.totalPaper); if(rem.lt(0)) rem=new D(0);
    setText("next-prestige-info", `次の伝説度まで: あと ${formatNumber(rem)} 枚`);
    const btn = document.getElementById("do-prestige-btn");
    if(btn) { if(gain.gte(1)){ btn.style.display="block"; setText("prestige-gain", formatNumber(gain)); } else { btn.style.display="none"; } }
}
function doPrestige() {
    const th = 1000000; let pot = game.totalPaper.div(th).pow(1/3).floor(); let gain = pot.minus(game.prestigePoints);
    if(gain.lt(1)) return;
    if(confirm("本社へ栄転しますか？")) {
        game.prestigePoints = game.prestigePoints.plus(gain); game.prestigeCount++;
        initNewGame(); 
        game.prestigePoints = game.prestigePoints.plus(0);
        let savedP = game.prestigePoints;
        let savedC = game.prestigeCount;
        initNewGame();
        game.prestigePoints = savedP;
        game.prestigeCount = savedC;
        saveGame(); location.reload();
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
    const diff = (Date.now()-game.lastSaveTime)/1000;
    if(diff>10){
        let cps = calculateCPS(true);
        if(game.isScandal) cps=cps.times(0.2);
        const earn = cps.times(diff);
        if(earn.gt(0)){
            game.paper=game.paper.plus(earn); game.totalPaper=game.totalPaper.plus(earn);
            const m=document.getElementById("offline-modal");
            if(m){ setText("offline-time",formatNumber(diff)); setText("offline-earned",formatNumber(earn)); m.style.display="flex"; }
        }
    }
}
function setBuyMode(m){ buyMode=m; updateBuyModeUI(); }
function updateBuyModeUI(){ ['1','10','100','max'].forEach(m=>{ const b=document.getElementById(`mode-${m}`); if(b)b.className="mode-btn"; }); const a=document.getElementById(`mode-${buyMode==='MAX'?'max':buyMode}`); if(a)a.className="mode-btn active"; }
function switchTab(name){ ['facilities','upgrades','risk','achievements'].forEach(t=>{ document.getElementById(`${t}-tab`).style.display=(t===name)?'block':'none'; }); const b=document.querySelectorAll('.tab-btn'); b.forEach((btn,i)=>btn.className='tab-btn'+(['facilities','upgrades','risk','achievements'][i]===name?' active':'')); }
function spawnFloatingText(e,t){ const el=document.createElement("div"); el.className="click-effect"; el.innerText=t; let x=e.clientX; let y=e.clientY; if(!x||!y){const r=document.getElementById("stamp-btn").getBoundingClientRect();x=r.left+r.width/2;y=r.top;} el.style.left=x+"px"; el.style.top=y+"px"; document.body.appendChild(el); setTimeout(()=>el.remove(),1000); }
function checkAchievements(){ game.achievements.forEach((a,i)=>{ if(!a.unlocked&&a.check(game)){ a.unlocked=true; notify(`実績解除: ${a.name}`); const b=document.getElementById(`ach-box-${i}`); if(b){ b.classList.add("unlocked"); b.innerHTML=`<div class="ach-icon">🏆</div><div class="item-info"><h3>${a.name}</h3><p>${a.desc}</p></div>`;}}}); }
function notify(m){ const a=document.getElementById("notification-area"); if(a){ const d=document.createElement("div"); d.className="notify-box"; d.innerText=m; a.appendChild(d); setTimeout(()=>d.remove(),4000); } }
function exportSave(){ saveGame(); prompt("コピー", btoa(localStorage.getItem("mugenRingiSave"))); }
function importSave(){ try{ const d=atob(prompt("貼り付け")); JSON.parse(d); localStorage.setItem("mugenRingiSave",d); location.reload(); }catch(e){alert("失敗");} }
function hardReset(){ if(confirm("全消去しますか？")){ localStorage.removeItem("mugenRingiSave"); location.reload(); } }
function updateNews() { const c=document.getElementById("news-ticker-content"); if(!c)return; c.innerText=NEWS_DATA[Math.floor(Math.random()*NEWS_DATA.length)]; c.style.animation='none'; c.offsetHeight; c.style.animation='ticker 20s linear infinite'; }
function resetGoldenTimer() { goldenDocTimer = 120 + Math.random()*180; }
function spawnGoldenDoc() { const d=document.getElementById("golden-doc"); if(!d)return; d.style.left=(50+Math.random()*(window.innerWidth-150))+"px"; d.style.top=(100+Math.random()*(window.innerHeight-200))+"px"; d.style.display="flex"; setTimeout(()=>{d.style.display="none";},15000); }
function clickGoldenDoc() { 
    const d=document.getElementById("golden-doc"); d.style.display="none"; 
    const t=Math.floor(Math.random()*4); let m=""; const now=Date.now();
    if(t===0){ activeBuffs.productionMultiplier=7; activeBuffs.endTime=now+77000; m="【特別決済】生産7倍(77秒)"; }
    else if(t===1){ activeBuffs.clickMultiplier=777; activeBuffs.endTime=now+13000; m="【特別決済】クリック777倍(13秒)"; }
    else if(t===2){ let gain=calculateCPS(true).times(900); if(gain.eq(0))gain=new D(1000); game.paper=game.paper.plus(gain); game.totalPaper=game.totalPaper.plus(gain); m=`【特別決済】${formatNumber(gain)}枚獲得`; }
    else { game.risk=0; if(game.isScandal)endScandal(); m="【特別決済】リスク完全回復"; updateRiskUI(); }
    notify(m); resetGoldenTimer();
}
function closeModal() { document.getElementById("offline-modal").style.display="none"; }
function clickRateCheck() { return clickTimestamps.length >= 10; }

window.onload = function() { loadGame(); };
