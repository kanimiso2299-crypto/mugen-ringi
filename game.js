/* --- 無限稟議 ゲームロジック (Ver 7.1: Robust & Fix) --- */

const D = Decimal;

const SUFFIXES = [
    "", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
    "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"
];

// ゲームデータ初期値
let game = {
    paper: new D(0),
    totalPaper: new D(0),
    prestigePoints: new D(0),
    totalClicks: 0,
    prestigeCount: 0,
    startTime: Date.now(),
    lastSaveTime: Date.now(),

    // リスク関連
    risk: 0,
    isScandal: false,
    scapegoatUsed: 0,
    lawyerLevel: 0,

    facilities: [
        { id: 0, name: "アルバイト", baseCost: 15, baseProd: 0.5, riskPerSec: 0, owned: 0, desc: "安全です。" },
        { id: 1, name: "自動捺印機", baseCost: 100, baseProd: 4, riskPerSec: 0, owned: 0, desc: "文句を言いません。" },
        { id: 2, name: "ベテラン社員", baseCost: 1100, baseProd: 22, riskPerSec: 0, owned: 0, desc: "残業も厭いません。" },
        { id: 3, name: "クラウドワーカー", baseCost: 12000, baseProd: 85, riskPerSec: 0.1, owned: 0, desc: "管理不届き (リスク+0.1%/s)" },
        { id: 4, name: "承認AI Type-0", baseCost: 130000, baseProd: 350, riskPerSec: 0.5, owned: 0, desc: "暴走の危険 (リスク+0.5%/s)" },
        { id: 5, name: "書類養殖プラント", baseCost: 1400000, baseProd: 1800, riskPerSec: 2.0, owned: 0, desc: "倫理的問題 (リスク+2.0%/s)" },
    ],

    upgrades: [
        { id: "u0_1", name: "エルゴノミクス椅子", cost: 1000, targetId: 0, scale: 2, purchased: false, req: 10, desc: "アルバイト効率2倍" },
        { id: "u0_2", name: "エナジードリンク", cost: 50000, targetId: 0, scale: 2, purchased: false, req: 50, desc: "アルバイト効率さらに2倍" },
        { id: "u1_1", name: "工業用潤滑油", cost: 10000, targetId: 1, scale: 2, purchased: false, req: 10, desc: "捺印機効率2倍" },
        { id: "u1_2", name: "予備バッテリー", cost: 500000, targetId: 1, scale: 2, purchased: false, req: 50, desc: "捺印機効率さらに2倍" },
        { id: "u2_1", name: "腱鞘炎ガード", cost: 100000, targetId: 2, scale: 2, purchased: false, req: 10, desc: "ベテラン効率2倍" },
        { id: "click_1", name: "重厚なハンコ", cost: 500, targetId: -1, scale: 10, purchased: false, req: 1, desc: "クリック効率10倍" },
    ],

    achievements: [
        { id: "ach_1", name: "初めの一歩", desc: "ハンコを1回押す", unlocked: false, check: g => g.totalClicks >= 1 },
        { id: "ach_2", name: "腱鞘炎予備軍", desc: "ハンコを1,000回押す", unlocked: false, check: g => g.totalClicks >= 1000 },
        { id: "ach_3", name: "小さなチーム", desc: "施設合計10", unlocked: false, check: g => getTotalFacilities(g) >= 10 },
        { id: "ach_4", name: "課の設立", desc: "施設合計50", unlocked: false, check: g => getTotalFacilities(g) >= 50 },
        { id: "ach_5", name: "ブラック企業", desc: "施設合計100", unlocked: false, check: g => getTotalFacilities(g) >= 100 },
        { id: "ach_6", name: "100万円の壁", desc: "累計1M枚", unlocked: false, check: g => g.totalPaper.gte(1000000) },
        { id: "ach_7", name: "億り人", desc: "累計100M枚", unlocked: false, check: g => g.totalPaper.gte(100000000) },
        { id: "ach_8", name: "兆万長者", desc: "累計1T枚", unlocked: false, check: g => g.totalPaper.gte(1e12) },
        { id: "ach_9", name: "バイトリーダー", desc: "アルバイト50人", unlocked: false, check: g => g.facilities[0].owned >= 50 },
        { id: "ach_10", name: "自動化推進", desc: "捺印機50台", unlocked: false, check: g => g.facilities[1].owned >= 50 },
        { id: "ach_11", name: "効率厨", desc: "UG3個購入", unlocked: false, check: g => g.upgrades.filter(u => u.purchased).length >= 3 },
        { id: "ach_12", name: "伝説の始まり", desc: "初めて栄転", unlocked: false, check: g => g.prestigeCount >= 1 },
    ]
};

let lastFrameTime = Date.now();
let clickTimestamps = [];
let buyMode = 1; 

// 定数
const SCAPEGOAT_BASE_COST = 2000;
const LAWYER_BASE_COST = 10000;

/* --- ロード処理 --- */
function loadGame() {
    const saved = localStorage.getItem("mugenRingiSave");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            game.paper = new D(parsed.paper);
            game.totalPaper = parsed.totalPaper ? new D(parsed.totalPaper) : new D(parsed.paper);
            game.prestigePoints = parsed.prestigePoints ? new D(parsed.prestigePoints) : new D(0);
            game.totalClicks = parsed.totalClicks || 0;
            game.prestigeCount = parsed.prestigeCount || 0;
            game.lastSaveTime = parsed.lastSaveTime || Date.now();
            
            game.risk = parsed.risk || 0;
            game.isScandal = parsed.isScandal || false;
            game.scapegoatUsed = parsed.scapegoatUsed || 0;
            game.lawyerLevel = parsed.lawyerLevel || 0;

            game.facilities.forEach((f, i) => {
                if (parsed.facilities && parsed.facilities[i]) f.owned = parsed.facilities[i].owned;
            });
            if (parsed.upgrades) {
                game.upgrades.forEach(u => {
                    const savedUp = parsed.upgrades.find(su => su.id === u.id);
                    if (savedUp) u.purchased = savedUp.purchased;
                });
            }
            if (parsed.achievements) {
                game.achievements.forEach(a => {
                    const savedAch = parsed.achievements.find(sa => sa.id === a.id);
                    if (savedAch) a.unlocked = savedAch.unlocked;
                });
            }

            processOfflineProgress();
        } catch (e) { console.error("Save file corrupted", e); }
    }

    // UI作成（HTML要素がない場合のクラッシュ防止付き）
    safeExecute(createFacilityUI);
    safeExecute(createUpgradeUI);
    safeExecute(createAchievementUI);
    safeExecute(createRiskShopUI);
    safeExecute(updateBuyModeUI);
    
    // ★修正: ロード時に炎上中なら画面を出す
    if (game.isScandal) startScandal();

    lastFrameTime = Date.now();
    requestAnimationFrame(gameLoop);
}

/* --- リスクショップUI --- */
function createRiskShopUI() {
    const container = document.getElementById("risk-shop-container");
    if (!container) return; // HTMLに要素がなければ何もしない

    container.innerHTML = "";
    // スケープゴート
    const divScape = document.createElement("div");
    divScape.className = "item-box";
    divScape.innerHTML = `
        <div class="item-info">
            <h3>スケープゴートを用意</h3>
            <p>リスクを-50%します。<br><span style="color:#d32f2f;">※買うたびに価格3倍</span></p>
        </div>
        <button class="buy-btn risk-btn danger" id="btn-scapegoat" onclick="buyScapegoat()">
            購入 <span id="cost-scapegoat">0</span>
        </button>
    `;
    container.appendChild(divScape);

    // 弁護士
    const divLawyer = document.createElement("div");
    divLawyer.className = "item-box";
    divLawyer.innerHTML = `
        <div class="item-info">
            <h3>顧問弁護士 (Lv.<span id="lvl-lawyer">0</span>)</h3>
            <p>リスク自然減少UP。<br><span style="color:#d32f2f;">※買うたびに価格2.5倍</span></p>
        </div>
        <button class="buy-btn risk-btn" id="btn-lawyer" onclick="buyLawyer()">
            契約 <span id="cost-lawyer">0</span>
        </button>
    `;
    container.appendChild(divLawyer);
}

/* --- オフライン進行 --- */
function processOfflineProgress() {
    const now = Date.now();
    const diffSeconds = (now - game.lastSaveTime) / 1000;
    if (diffSeconds > 10) {
        let cps = calculateCPS();
        if (game.isScandal) cps = cps.times(0.2);
        
        const earned = cps.times(diffSeconds);
        if (earned.gt(0)) {
            game.paper = game.paper.plus(earned);
            game.totalPaper = game.totalPaper.plus(earned);
            
            const modal = document.getElementById("offline-modal");
            if(modal) {
                document.getElementById("offline-time").innerText = formatNumber(diffSeconds);
                document.getElementById("offline-earned").innerText = formatNumber(earned);
                modal.style.display = "flex";
            }
        }
    }
}
function closeModal() { 
    const modal = document.getElementById("offline-modal");
    if(modal) modal.style.display = "none"; 
}

/* --- 計算系 --- */
function calculateCPS() {
    const prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    const unlockedCount = game.achievements.filter(a => a.unlocked).length;
    const achievementBonus = Math.pow(1.04, unlockedCount);
    
    let multipliers = {};
    game.facilities.forEach(f => {
        multipliers[f.id] = new D(prestigeBonus).times(achievementBonus);
    });
    game.upgrades.forEach(u => {
        if (u.purchased && u.targetId >= 0) multipliers[u.targetId] = multipliers[u.targetId].times(u.scale);
    });

    let cps = new D(0);
    game.facilities.forEach(f => {
        let singleProd = new D(f.baseProd).times(multipliers[f.id]);
        cps = cps.plus(singleProd.times(f.owned));
    });
    return cps;
}

function getBulkCost(facility, mode) {
    const base = new D(facility.baseCost);
    const r = 1.15;
    const k = facility.owned;
    
    if (mode === 'MAX') {
        if (game.paper.lt(base.times(Math.pow(r, k)))) return { cost: base.times(Math.pow(r, k)), amount: 0 };
        let term = game.paper.times(r - 1).div(base.times(Math.pow(r, k))).plus(1);
        let n = Math.floor(term.log10() / Math.log10(r));
        if (n < 0) n = 0;
        return { cost: base.times(Math.pow(r, k)).times(Math.pow(r, n) - 1).div(r - 1), amount: n };
    } else {
        let n = mode;
        let cost = base.times(Math.pow(r, k)).times(Math.pow(r, n) - 1).div(r - 1);
        return { cost: cost, amount: n };
    }
}

function getScapegoatCost() { return new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed)); }
function getLawyerCost() { return new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel)); }

/* --- アクション --- */
function buyScapegoat() {
    const cost = getScapegoatCost();
    if (game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        game.scapegoatUsed++;
        game.risk = Math.max(0, game.risk - 50);
        if(game.isScandal && game.risk <= 0) endScandal();
        safeExecute(updateRiskShop);
    }
}

function buyLawyer() {
    const cost = getLawyerCost();
    if (game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        game.lawyerLevel++;
        safeExecute(updateRiskShop);
    }
}

function startScandal() {
    game.isScandal = true;
    const el = document.getElementById("scandal-overlay");
    if(el) el.style.display = "flex";
}
function endScandal() {
    game.isScandal = false;
    const el = document.getElementById("scandal-overlay");
    if(el) el.style.display = "none";
}
function clickApology() {
    game.risk -= 5;
    if (game.risk <= 0) { game.risk = 0; endScandal(); }
    safeExecute(() => updateRiskDisplay(0));
}

/* --- メインループ --- */
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // リスク計算
    let riskIncrease = 0;
    game.facilities.forEach(f => { if (f.riskPerSec > 0) riskIncrease += f.riskPerSec * f.owned; });
    let riskDecay = 1.0 + (game.lawyerLevel * 0.5);

    if (!game.isScandal) {
        let delta = riskIncrease - riskDecay;
        game.risk += delta * dt;
        if (game.risk < 0) game.risk = 0;
        if (game.risk >= 100) { game.risk = 100; startScandal(); }
    }
    
    safeExecute(() => updateRiskDisplay(riskIncrease - riskDecay));

    // 生産
    let cps = calculateCPS();
    if (game.isScandal) cps = cps.times(0.2);

    if (dt > 0) {
        const earned = cps.times(dt);
        game.paper = game.paper.plus(earned);
        game.totalPaper = game.totalPaper.plus(earned);
    }

    // UI更新
    setText("counter", formatNumber(game.paper));
    setText("cps-display", "毎秒処理: " + formatNumber(cps) + " 枚");
    
    safeExecute(updateButtons);
    safeExecute(updateRiskShop);
    safeExecute(checkPrestige);
    safeExecute(checkAchievements);

    if (Math.random() < 0.02) saveGame();
    requestAnimationFrame(gameLoop);
}

/* --- UI更新ヘルパー --- */
function updateRiskDisplay(trend) {
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
    const sCost = getScapegoatCost();
    setText("cost-scapegoat", formatNumber(sCost));
    const btnS = document.getElementById("btn-scapegoat");
    if(btnS) btnS.disabled = game.paper.lt(sCost);

    const lCost = getLawyerCost();
    setText("cost-lawyer", formatNumber(lCost));
    setText("lvl-lawyer", game.lawyerLevel);
    const btnL = document.getElementById("btn-lawyer");
    if(btnL) btnL.disabled = game.paper.lt(lCost);
}

function updateButtons() {
    game.facilities.forEach((f, i) => {
        const bulk = getBulkCost(f, buyMode);
        setText(`owned-${i}`, f.owned);
        const btn = document.getElementById(`btn-${i}`);
        if(btn) {
            if (game.isScandal) {
                btn.innerHTML = "炎上中<br>購入不可";
                btn.disabled = true;
            } else if (buyMode === 'MAX') {
                if (bulk.amount > 0) {
                    btn.innerHTML = `雇用 +${formatNumber(bulk.amount)}<br><span style="font-size:10px">${formatNumber(bulk.cost)}</span>`;
                    btn.disabled = false;
                } else {
                    const nextCost = new D(f.baseCost).times(Math.pow(1.15, f.owned));
                    btn.innerHTML = `雇用 (不足)<br><span style="font-size:10px">${formatNumber(nextCost)}</span>`;
                    btn.disabled = true;
                }
            } else {
                btn.innerHTML = `雇用 +${buyMode}<br><span id="cost-${i}">${formatNumber(bulk.cost)}</span>`;
                btn.disabled = game.paper.lt(bulk.cost);
            }
        }
    });
    game.upgrades.forEach((u, i) => {
        const box = document.getElementById(`upg-box-${i}`);
        const btn = document.getElementById(`upg-btn-${i}`);
        let isVisible = u.purchased;
        if (!isVisible) {
            if (u.targetId >= 0 && game.facilities[u.targetId].owned >= u.req) isVisible = true;
            else if (u.targetId === -1) isVisible = true;
        }
        if(box) {
            if (isVisible) {
                box.style.display = "flex";
                if (btn && !u.purchased) btn.disabled = game.paper.lt(u.cost) || game.isScandal;
            } else {
                box.style.display = "none";
            }
        }
    });
}

function setBuyMode(mode) {
    buyMode = mode;
    updateBuyModeUI();
}
function updateBuyModeUI() {
    ['1', '10', '100', 'max'].forEach(m => {
        const btn = document.getElementById(`mode-${m}`);
        if (btn) btn.className = "mode-btn";
    });
    const activeId = (buyMode === 'MAX') ? 'max' : buyMode;
    const activeBtn = document.getElementById(`mode-${activeId}`);
    if(activeBtn) activeBtn.className = "mode-btn active";
}

function switchTab(tabName) {
    const tabs = ['facilities', 'upgrades', 'risk', 'achievements'];
    tabs.forEach((t, i) => {
        const el = document.getElementById(`${t}-tab`);
        if(el) el.style.display = (t === tabName) ? 'block' : 'none';
    });
    
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach((b, i) => {
        b.className = 'tab-btn';
        if (tabs[i] === tabName) b.className += ' active';
    });
}

function clickStamp(event) {
    game.totalClicks++;
    const now = Date.now();
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter(t => now - t < 1000);

    let clickPower = new D(1);
    const unlockedCount = game.achievements.filter(a => a.unlocked).length;
    clickPower = clickPower.times(Math.pow(1.04, unlockedCount));
    clickPower = clickPower.times(game.prestigePoints.times(0.1).plus(1));
    const upg = game.upgrades.find(u => u.id === "click_1");
    if (upg && upg.purchased) clickPower = clickPower.times(upg.scale);

    game.paper = game.paper.plus(clickPower);
    game.totalPaper = game.totalPaper.plus(clickPower);
    spawnFloatingText(event, "+" + formatNumber(clickPower));
}
function clickRateCheck() { return clickTimestamps.length >= 10; }

function buyFacility(index) {
    const f = game.facilities[index];
    const bulk = getBulkCost(f, buyMode);
    if (bulk.amount > 0 && game.paper.gte(bulk.cost)) {
        game.paper = game.paper.minus(bulk.cost);
        f.owned += bulk.amount;
    }
}
function buyUpgrade(index) {
    const u = game.upgrades[index];
    if (!u.purchased && game.paper.gte(u.cost)) {
        game.paper = game.paper.minus(u.cost);
        u.purchased = true;
        createUpgradeUI();
    }
}

/* --- 転生 --- */
function checkPrestige() {
    const threshold = 1000000;
    let potential = game.totalPaper.div(threshold).pow(1 / 3).floor();
    let gain = potential.minus(game.prestigePoints);
    if (gain.lt(0)) gain = new D(0);

    // 次の目標を表示
    let nextPoint = potential.plus(1);
    let reqTotal = nextPoint.pow(3).times(threshold);
    let remaining = reqTotal.minus(game.totalPaper);
    if(remaining.lt(0)) remaining = new D(0);

    setText("next-prestige-info", `次の伝説度まで: あと ${formatNumber(remaining)} 枚`);

    const btn = document.getElementById("do-prestige-btn");
    if(btn) {
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
    const gain = potential.minus(game.prestigePoints);
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

/* --- その他ツール --- */
function formatNumber(n) {
    n = new D(n);
    if (n.lt(1000000)) return n.toNumber().toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (n.exponent >= 66) return n.mantissa.toFixed(2) + "e" + n.exponent;
    const suffixIndex = Math.floor(n.exponent / 3);
    const suffix = SUFFIXES[suffixIndex];
    const val = n.mantissa * Math.pow(10, n.exponent % 3);
    return val.toFixed(2) + " " + suffix;
}
function spawnFloatingText(e, text) {
    const el = document.createElement("div");
    el.className = "click-effect";
    el.innerText = text;
    let x = e.clientX;
    let y = e.clientY;
    if (!x || !y) {
        const btn = document.getElementById("stamp-btn");
        if(btn) {
            const rect = btn.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top;
        }
    }
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}
function getTotalFacilities(g) { return g.facilities.reduce((sum, f) => sum + f.owned, 0); }
function checkAchievements() {
    game.achievements.forEach((a, index) => {
        if (!a.unlocked && a.check(game)) {
            a.unlocked = true;
            notify(`実績解除！: ${a.name}`);
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
    if(!area) return;
    const div = document.createElement("div");
    div.className = "notify-box";
    div.innerText = msg;
    area.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

// 安全に要素のテキストを変える関数
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

// UI生成関数を安全に呼ぶ（HTML要素がない場合は無視する）
function safeExecute(func) {
    try { func(); } catch (e) { console.warn("UI update skipped:", e); }
}

function createFacilityUI() {
    const container = document.getElementById("facilities-container");
    if(!container) return;
    container.innerHTML = "";
    game.facilities.forEach((f, index) => {
        const div = document.createElement("div");
        div.className = "item-box facility";
        div.innerHTML = `
            <div class="item-info">
                <h3>${f.name}</h3>
                <p>${f.desc}</p>
                <p>所持: <span id="owned-${index}" style="font-weight:bold;">0</span></p>
                <p>生産: <span id="prod-total-${index}">0</span> /秒 <span style="color:#888; font-size:10px;">(単体 <span id="prod-single-${index}">0</span>)</span></p>
            </div>
            <button class="buy-btn" id="btn-${index}" onclick="buyFacility(${index})">
                雇用 <span id="cost-${index}">0</span>
            </button>
        `;
        container.appendChild(div);
    });
}

function createUpgradeUI() {
    const container = document.getElementById("upgrades-container");
    if(!container) return;
    container.innerHTML = `<p style="padding:5px; color:#999; font-size:12px;">条件を満たすと出現します</p>`;
    game.upgrades.forEach((u, index) => {
        const div = document.createElement("div");
        div.className = "item-box";
        div.id = `upg-box-${index}`;
        div.style.display = "none";
        let btnHtml = u.purchased ? `<button class="buy-btn bought-btn" disabled>済</button>` : `<button class="buy-btn" id="upg-btn-${index}" onclick="buyUpgrade(${index})">購入 ${u.cost}</button>`;
        div.innerHTML = `<div class="item-info"><h3>${u.name}</h3><p>${u.desc}</p></div>${btnHtml}`;
        container.appendChild(div);
    });
}

function createAchievementUI() {
    const container = document.getElementById("achievements-container");
    if(!container) return;
    container.innerHTML = "";
    game.achievements.forEach((a, index) => {
        const div = document.createElement("div");
        div.className = "achievement-box";
        div.id = `ach-box-${index}`;
        if (a.unlocked) div.classList.add("unlocked");
        const icon = a.unlocked ? "🏆" : "❓";
        const name = a.unlocked ? a.name : "？？？";
        const desc = a.unlocked ? a.desc : "（条件未達成）";
        div.innerHTML = `<div class="ach-icon">${icon}</div><div class="item-info"><h3 id="ach-name-${index}">${name}</h3><p id="ach-desc-${index}">${desc}</p></div>`;
        container.appendChild(div);
    });
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

function exportSave() { saveGame(); const saved = localStorage.getItem("mugenRingiSave"); prompt("コピーしてください", btoa(saved)); }
function importSave() {
    const encoded = prompt("データを貼り付けてください");
    if (encoded) {
        try {
            const decoded = atob(encoded);
            JSON.parse(decoded);
            localStorage.setItem("mugenRingiSave", decoded);
            location.reload();
        } catch (e) { alert("データ読み込み失敗"); }
    }
}
function hardReset() { if (confirm("全データを消去しますか？")) { localStorage.removeItem("mugenRingiSave"); location.reload(); } }

window.onload = function() { loadGame(); };
