/* --- 無限稟議 ゲームロジック (Ver 9.4: High Inflation) --- */

if (typeof Decimal === 'undefined') { alert("Err: Lib"); throw new Error("Decimal missing"); }
const D = Decimal;
const SUFFIXES = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"];

// ゲーム状態
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
    legacyUpgrades: [],
    achievements: [],
    lastSaveTime: Date.now()
};

let lastFrameTime = Date.now();
let clickTimestamps = [];
let buyMode = 1;
let newsTimer = 0;
let goldenDocTimer = 0;
let activeBuffs = { productionMultiplier: 1, clickMultiplier: 1, endTime: 0 };
let cachedCPS = new D(0);

/* --- 初期化 --- */
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
            game.risk = (typeof parsed.risk === 'number') ? parsed.risk : 0;
            game.isScandal = !!parsed.isScandal;
            game.scapegoatUsed = parsed.scapegoatUsed || 0;
            game.lawyerLevel = parsed.lawyerLevel || 0;

            game.facilities = FACILITY_DATA.map((data, i) => {
                let owned = 0;
                if (parsed.facilities && parsed.facilities[i]) owned = Number(parsed.facilities[i].owned) || 0;
                return { id: data.id, owned: owned };
            });
            game.upgrades = UPGRADE_DATA.map(data => {
                let purchased = false;
                if (parsed.upgrades) {
                    const savedUp = parsed.upgrades.find(su => su.id === data.id);
                    if (savedUp) purchased = savedUp.purchased;
                }
                return { ...data, purchased: purchased };
            });
            game.legacyUpgrades = Array.isArray(parsed.legacyUpgrades) ? parsed.legacyUpgrades : [];
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
        console.error(e);
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
    game.legacyUpgrades = [];
    game.achievements = ACHIEVEMENT_DATA.map(d => ({ ...d, unlocked: false }));
    game.lastSaveTime = Date.now();
}

function initUI() {
    safeExecute(createFacilityUI);
    safeExecute(createUpgradeUI);
    safeExecute(createLegacyShopUI);
    safeExecute(createAchievementUI);
    safeExecute(createRiskShopUI);
    safeExecute(updateBuyModeUI);
    safeExecute(updateNews);
    if (game.isScandal) startScandal();
    const tab = document.getElementById("tab-legacy-btn");
    if(tab) tab.style.display = (game.prestigeCount > 0) ? "block" : "none";
}

/* --- ループ --- */
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    safeExecute(() => updateRiskLogic(dt));

    cachedCPS = calculateCPS();
    let effectiveCPS = cachedCPS;
    if (game.isScandal) effectiveCPS = effectiveCPS.times(0.2);

    if (dt > 0) {
        const earned = effectiveCPS.times(dt);
        game.paper = game.paper.plus(earned);
        game.totalPaper = game.totalPaper.plus(earned);
    }

    safeExecute(() => updateNewsLogic(dt));
    safeExecute(() => updateGoldenDocLogic(dt));
    safeExecute(() => updateBuffLogic(now));
    
    // 実績ボーナス表示更新
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.02).pow(unlockedCount);
    if(hasLegacy("l_ledger")) achievementBonus = achievementBonus.times(new D(1.05).pow(unlockedCount));
    let bonusPercent = achievementBonus.minus(1).times(100);
    
    setText("bonus-display", `実績ボーナス: +${formatNumber(bonusPercent)}% (${unlockedCount}個)`);
    setText("counter", formatNumber(game.paper));
    setText("cps-display", "毎秒処理: " + formatNumber(effectiveCPS) + " 枚");
    setText("legacy-points-display", formatNumber(game.prestigePoints));

    safeExecute(updateFacilityButtons);
    safeExecute(updateUpgradeButtons);
    safeExecute(updateLegacyShopButtons);
    safeExecute(updateRiskShop);
    safeExecute(checkPrestige);
    safeExecute(checkAchievements);

    if (Math.random() < 0.02) saveGame();
    requestAnimationFrame(gameLoop);
}

/* --- ロジック --- */
function updateRiskLogic(dt) {
    let riskIncrease = 0;
    game.facilities.forEach(f => {
        let d = FACILITY_DATA[f.id];
        if (d && d.riskPerSec > 0) riskIncrease += d.riskPerSec * f.owned;
    });
    let riskDecay = 1.0 + (game.lawyerLevel * 0.5);
    if(hasLegacy("l_risk")) riskIncrease *= 0.8;

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
    if (newsTimer > 15) { newsTimer = 0; updateNews(); }
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

/* --- 計算 --- */
function calculateCPS(ignoreBuffs = false) {
    // ★ LPボーナス強化: 1ポイントにつき +100% (1.0)
    let prestigeBonus = game.prestigePoints.times(1.0).plus(1);
    
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.02).pow(unlockedCount);
    if(hasLegacy("l_ledger")) achievementBonus = achievementBonus.times(new D(1.05).pow(unlockedCount));
    
    let legacyMult = hasLegacy("l_infinite") ? 10 : 1;
    let globalMult = prestigeBonus.times(achievementBonus).times(legacyMult);
    
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
            if(f.id === 2 && hasLegacy("l_fac_1")) prod = prod.times(1 + getOwned(game, 0) * 0.001);
            if(f.id === 4 && hasLegacy("l_fac_2")) prod = prod.times(1 + getOwned(game, 1) * 0.001);

            cps = cps.plus(prod.times(f.owned));
        }
    });
    return cps;
}

function getBulkCost(facilityObj, mode) {
    let data = FACILITY_DATA[facilityObj.id];
    if(!data) return { cost: new D(0), amount: 0 };
    let base = new D(data.baseCost);
    let r = hasLegacy("l_lifetime") ? 1.14 : 1.15;
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

/* --- アクション --- */
function clickStamp(event) {
    game.totalClicks++;
    const now = Date.now();
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter(t => now - t < 1000);

    let clickPower = new D(1);
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    
    let achievementBonus = new D(1.02).pow(unlockedCount);
    if(hasLegacy("l_ledger")) achievementBonus = achievementBonus.times(new D(1.05).pow(unlockedCount));
    
    // ★ LPボーナス強化
    let prestigeBonus = game.prestigePoints.times(1.0).plus(1);
    
    clickPower = clickPower.times(achievementBonus).times(prestigeBonus);
    if(hasLegacy("l_infinite")) clickPower = clickPower.times(10);

    game.upgrades.forEach(u => {
        if (u.purchased && u.targetId === -1 && u.type === "mul") {
            clickPower = clickPower.times(u.scale);
        }
    });
    let cpsAdd = new D(0);
    let currentCPS = cachedCPS;
    game.upgrades.forEach(u => {
        if (u.purchased && u.targetId === -1 && u.type === "cps") {
            cpsAdd = cpsAdd.plus(currentCPS.times(u.scale));
        }
    });
    clickPower = clickPower.plus(cpsAdd);

    if (now < activeBuffs.endTime) clickPower = clickPower.times(activeBuffs.clickMultiplier);

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
    }
}

function buyLegacy(id) {
    const data = LEGACY_UPGRADE_DATA.find(d => d.id === id);
    if(!data) return;
    if(!hasLegacy(id) && game.prestigePoints.gte(data.cost)) {
        if(confirm(`伝説度(LP)を ${data.cost} 消費して購入しますか？\n(生産ボーナスが減少します)`)) {
            game.prestigePoints = game.prestigePoints.minus(data.cost);
            game.legacyUpgrades.push(id);
            createLegacyShopUI();
        }
    }
}

/* --- UI更新 --- */
function updateFacilityButtons() {
    let prestigeBonus = game.prestigePoints.times(1.0).plus(1);
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.02).pow(unlockedCount);
    if(hasLegacy("l_ledger")) achievementBonus = achievementBonus.times(new D(1.05).pow(unlockedCount));
    let legacyMult = hasLegacy("l_infinite") ? 10 : 1;
    
    let globalMult = prestigeBonus.times(achievementBonus).times(legacyMult);
    if (Date.now() < activeBuffs.endTime) globalMult = globalMult.times(activeBuffs.productionMultiplier);

    game.facilities.forEach((f, i) => {
        const btn = document.getElementById(`btn-${i}`);
        if (!btn) return;
        const bulk = getBulkCost(f, buyMode);
        setText(`owned-${i}`, f.owned);
        
        let data = FACILITY_DATA[i];
        let prod = new D(data.baseProd).times(globalMult);
        game.upgrades.forEach(u => { 
            if (u.purchased && u.targetId === i && (!u.type || u.type === "mul")) prod = prod.times(u.scale); 
        });
        if(i === 2 && hasLegacy("l_fac_1")) prod = prod.times(1 + getOwned(game, 0) * 0.001);
        if(i === 4 && hasLegacy("l_fac_2")) prod = prod.times(1 + getOwned(game, 1) * 0.001);

        setText(`prod-total-${i}`, formatNumber(prod.times(f.owned)));
        setText(`prod-single-${i}`, formatNumber(prod));

        if (game.isScandal) {
            btn.innerHTML = "炎上中<br>不可";
            btn.disabled = true;
        } else if (bulk.amount === 0) {
            let r = hasLegacy("l_lifetime") ? 1.14 : 1.15;
            let nextCost = new D(data.baseCost).times(new D(r).pow(f.owned));
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
               (u.targetId === -1);
            box.style.display = isVisible ? "flex" : "none";
            if (u.purchased) {
                btn.innerHTML = "済"; btn.className = "buy-btn bought-btn"; btn.disabled = true;
            } else {
                const cost = new D(u.cost);
                btn.innerHTML = `購入 ${formatNumber(cost)}`; btn.className = "buy-btn";
                btn.disabled = game.paper.lt(cost) || game.isScandal;
            }
        }
    });
}

function updateLegacyShopButtons() {
    LEGACY_UPGRADE_DATA.forEach((d) => {
        const btn = document.getElementById(`btn-legacy-${d.id}`);
        if(btn && !hasLegacy(d.id)) {
            btn.disabled = game.prestigePoints.lt(d.cost);
        }
    });
}

/* --- UI生成 --- */
function createFacilityUI() {
    const c = document.getElementById("facilities-container"); if(!c) return; c.innerHTML = "";
    FACILITY_DATA.forEach((d, i) => {
        const div = document.createElement("div"); div.className = "item-box facility";
        div.innerHTML = `<div class="item-info"><h3>${d.name}</h3><p>${d.desc}</p><p>所持: <span id="owned-${i}" style="font-weight:bold;">0</span></p><p>生産: <span id="prod-total-${i}">0</span> /秒 <span style="color:#888; font-size:10px;">(単体 <span id="prod-single-${i}">0</span>)</span></p></div><button class="buy-btn" id="btn-${i}" onclick="buyFacility(${i})">雇用</button>`;
        c.appendChild(div);
    });
}
function createUpgradeUI() {
    const c = document.getElementById("upgrades-container"); if(!c) return; c.innerHTML = `<p style="padding:5px; color:#999; font-size:12px;">条件を満たすと出現します</p>`;
    game.upgrades.forEach((u, i) => {
        const div = document.createElement("div"); div.className = "item-box"; div.id = `upg-box-${i}`; div.style.display = "none";
        div.innerHTML = `<div class="item-info"><h3>${u.name}</h3><p>${u.desc}</p></div><button class="buy-btn" id="upg-btn-${i}" onclick="buyUpgrade(${i})">購入</button>`;
        c.appendChild(div);
    });
}
function createAchievementUI() {
    const c = document.getElementById("achievements-container"); if(!c) return; c.innerHTML = "";
    game.achievements.forEach((a, i) => {
        const div = document.createElement("div"); div.className = "achievement-box"; div.id = `ach-box-${i}`;
        if(a.unlocked) div.classList.add("unlocked");
        const icon = a.unlocked ? "🏆" : "❓"; const name = a.unlocked ? a.name : "？？？"; const desc = a.unlocked ? a.desc : "（条件未達成）";
        div.innerHTML = `<div class="ach-icon">${icon}</div><div class="item-info"><h3 id="ach-name-${i}">${name}</h3><p id="ach-desc-${i}">${desc}</p></div>`;
        c.appendChild(div);
    });
}
function createRiskShopUI() {
    const c = document.getElementById("risk-shop-container"); if(!c) return; c.innerHTML = "";
    const dS = document.createElement("div"); dS.className="item-box"; dS.innerHTML = `<div class="item-info"><h3>スケープゴート</h3><p>リスク-50% (価格3倍増)</p></div><button class="buy-btn risk-btn danger" id="btn-scapegoat" onclick="buyScapegoat()">購入 <span id="cost-scapegoat">0</span></button>`; c.appendChild(dS);
    const dL = document.createElement("div"); dL.className="item-box"; dL.innerHTML = `<div class="item-info"><h3>顧問弁護士 (Lv.<span id="lvl-lawyer">0</span>)</h3><p>リスク減少UP (価格2.5倍増)</p></div><button class="buy-btn risk-btn" id="btn-lawyer" onclick="buyLawyer()">契約 <span id="cost-lawyer">0</span></button>`; c.appendChild(dL);
}
function createLegacyShopUI() {
    const c = document.getElementById("legacy-shop-container"); if(!c) return; c.innerHTML = "";
    LEGACY_UPGRADE_DATA.forEach(d => {
        const div = document.createElement("div"); div.className = "item-box legacy";
        const isBought = hasLegacy(d.id);
        let btnHtml = isBought ? `<button class="buy-btn legacy-btn" disabled>取得済</button>` : `<button class="buy-btn legacy-btn" id="btn-legacy-${d.id}" onclick="buyLegacy('${d.id}')">取得 ${d.cost} LP</button>`;
        div.innerHTML = `<div class="item-info"><h3>${d.name}</h3><p>${d.desc}</p></div>${btnHtml}`;
        c.appendChild(div);
    });
}

/* --- ヘルパー --- */
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
function hasLegacy(id) { return game.legacyUpgrades.includes(id); }

function updateRiskUI(trend) {
    const bar = document.getElementById("risk-bar"); const val = document.getElementById("risk-val"); const trendTxt = document.getElementById("risk-trend");
    if(bar) bar.style.width = game.risk + "%"; if(val) val.innerText = Math.floor(game.risk) + "%";
    if(trendTxt && trend !== undefined) { trendTxt.innerText = `変動: ${(trend > 0 ? "+" : "") + trend.toFixed(2)}%/秒`; trendTxt.style.color = trend > 0 ? "#d32f2f" : "#2e7d32"; }
    const scanBar = document.getElementById("scandal-meter-bar"); if(scanBar) scanBar.style.width = game.risk + "%";
}
function updateRiskShop() {
    const sCost = new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed)); setText("cost-scapegoat", formatNumber(sCost)); const btnS = document.getElementById("btn-scapegoat"); if(btnS) btnS.disabled = game.paper.lt(sCost);
    const lCost = new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel)); setText("cost-lawyer", formatNumber(lCost)); setText("lvl-lawyer", game.lawyerLevel); const btnL = document.getElementById("btn-lawyer"); if(btnL) btnL.disabled = game.paper.lt(lCost);
}
function startScandal() { game.isScandal=true; document.getElementById("scandal-overlay").style.display="flex"; }
function endScandal() { game.isScandal=false; document.getElementById("scandal-overlay").style.display="none"; }
function clickApology() { game.risk-=5; if(game.risk<=0){game.risk=0; endScandal();} updateRiskUI(); }

// ★ LP計算式変更 (2乗根 & 基準10000)
function checkPrestige() {
    const th = 10000; // 1万
    let pot = game.totalPaper.div(th).sqrt().floor(); // 2乗根
    let gain = pot.minus(game.prestigePoints); if(gain.lt(0)) gain=new D(0);
    let next = pot.plus(1); let req = next.pow(2).times(th); let rem = req.minus(game.totalPaper); if(rem.lt(0)) rem=new D(0);
    setText("next-prestige-info", `次の伝説度まで: あと ${formatNumber(rem)} 枚`);
    const btn = document.getElementById("do-prestige-btn");
    if(btn) { if(gain.gte(1)){ btn.style.display="block"; setText("prestige-gain", formatNumber(gain)); } else { btn.style.display="none"; } }
}
function doPrestige() {
    const th = 10000; let pot = game.totalPaper.div(th).sqrt().floor(); let gain = pot.minus(game.prestigePoints);
    if(gain.lt(1)) return;
    if(confirm("本社へ栄転しますか？\n(伝説度を獲得し、リセットします)")) {
        game.prestigePoints = game.prestigePoints.plus(gain); game.prestigeCount++;
        let savedPoints = game.prestigePoints; let savedCount = game.prestigeCount; let savedLegacy = [...game.legacyUpgrades]; let savedTotalPaper = game.totalPaper;
        let startPaper = new D(0); if(savedLegacy.includes("l_parachute")) startPaper = game.paper.times(0.01);
        initNewGame();
        game.prestigePoints = savedPoints; game.prestigeCount = savedCount; game.legacyUpgrades = savedLegacy; game.totalPaper = savedTotalPaper; game.paper = startPaper;
        if(savedLegacy.includes("l_nepotism")) { if(game.facilities[0]) game.facilities[0].owned = 10; if(game.facilities[1]) game.facilities[1].owned = 10; }
        saveGame(); location.reload();
    }
}
function saveGame() {
    const saveObj = { ...game };
    saveObj.paper = game.paper.toString();
    saveObj.totalPaper = game.totalPaper.toString();
    saveObj.prestigePoints = game.prestigePoints.toString();
    localStorage.setItem("mugenRingiSave", JSON.stringify(saveObj));
}
function processOfflineProgress() {
    const diff = (Date.now()-game.lastSaveTime)/1000;
    if(diff>10){
        let cps = calculateCPS(true);
        if(game.isScandal) cps=cps.times(0.2);
        if(!hasLegacy("l_chronos")) cps = cps.times(0.5);
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
function switchTab(name){ ['facilities','upgrades','risk','achievements','legacy'].forEach(t=>{ document.getElementById(`${t}-tab`).style.display=(t===name)?'block':'none'; }); const b=document.querySelectorAll('.tab-btn'); b.forEach((btn,i)=>btn.className='tab-btn'+(['facilities','upgrades','risk','legacy','achievements'][i]===name?' active':'')); }
function spawnFloatingText(e,t){ const el=document.createElement("div"); el.className="click-effect"; el.innerText=t; let x=e.clientX; let y=e.clientY; if(!x||!y){const r=document.getElementById("stamp-btn").getBoundingClientRect();x=r.left+r.width/2;y=r.top;} el.style.left=x+"px"; el.style.top=y+"px"; document.body.appendChild(el); setTimeout(()=>el.remove(),1000); }
function checkAchievements(){ game.achievements.forEach((a,i)=>{ if(!a.unlocked&&a.check(game)){ a.unlocked=true; notify(`実績解除: ${a.name}`); const b=document.getElementById(`ach-box-${i}`); if(b){ b.classList.add("unlocked"); b.innerHTML=`<div class="ach-icon">🏆</div><div class="item-info"><h3>${a.name}</h3><p>${a.desc}</p></div>`;}}}); }
function notify(m){ const a=document.getElementById("notification-area"); if(a){ const d=document.createElement("div"); d.className="notify-box"; d.innerText=m; a.appendChild(d); setTimeout(()=>d.remove(),4000); } }
function exportSave(){ saveGame(); prompt("コピー", btoa(localStorage.getItem("mugenRingiSave"))); }
function importSave(){ try{ const d=atob(prompt("貼り付け")); JSON.parse(d); localStorage.setItem("mugenRingiSave",d); location.reload(); }catch(e){alert("失敗");} }
function hardReset(){ if(confirm("全消去しますか？")){ localStorage.removeItem("mugenRingiSave"); location.reload(); } }
function updateNews() { const c=document.getElementById("news-ticker-content"); if(!c)return; c.innerText=NEWS_DATA[Math.floor(Math.random()*NEWS_DATA.length)]; c.style.animation='none'; c.offsetHeight; c.style.animation='ticker 20s linear infinite'; }
function resetGoldenTimer() { goldenDocTimer = 120 + Math.random()*180; if(hasLegacy("l_insider")) goldenDocTimer *= 0.9; }
function spawnGoldenDoc() { const d=document.getElementById("golden-doc"); if(!d)return; d.style.left=(50+Math.random()*(window.innerWidth-150))+"px"; d.style.top=(100+Math.random()*(window.innerHeight-200))+"px"; d.style.display="flex"; setTimeout(()=>{d.style.display="none";},15000); }
function clickGoldenDoc() { 
    const d=document.getElementById("golden-doc"); d.style.display="none"; 
    const t=Math.floor(Math.random()*4); let m=""; const now=Date.now();
    let timeMul = hasLegacy("l_zone") ? 2.0 : 1.0;
    if(t===0){ activeBuffs.productionMultiplier=7; activeBuffs.endTime=now+(77000*timeMul); m="【特別決済】生産7倍"; }
    else if(t===1){ activeBuffs.clickMultiplier=777; activeBuffs.endTime=now+(13000*timeMul); m="【特別決済】クリック777倍"; }
    else if(t===2){ let gain=calculateCPS(true).times(900); if(gain.eq(0))gain=new D(1000); game.paper=game.paper.plus(gain); game.totalPaper=game.totalPaper.plus(gain); m=`【特別決済】${formatNumber(gain)}枚獲得`; }
    else { game.risk=0; if(game.isScandal)endScandal(); m="【特別決済】リスク完全回復"; updateRiskUI(); }
    notify(m); resetGoldenTimer();
}
function closeModal() { document.getElementById("offline-modal").style.display="none"; }

window.onload = function() { loadGame(); };
