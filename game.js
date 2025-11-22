/* --- 無限稟議 ゲームロジック (Ver 7.4: Fix & Repair) --- */

// 1. ライブラリチェック
if (typeof Decimal === 'undefined') {
    alert("【エラー】ライブラリ読み込み失敗\nページをリロードしてください。");
    throw new Error("Decimal lib missing");
}

const D = Decimal;
const SUFFIXES = ["", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"];

// 2. 定数データ（保存されない固定情報）
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

// 3. ゲーム状態変数
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

/* --- 4. ロード処理（修復機能付き） --- */
function loadGame() {
    try {
        const saved = localStorage.getItem("mugenRingiSave");
        if (saved) {
            const parsed = JSON.parse(saved);
            
            // 数値の復元（もしデータがなくても0で初期化）
            game.paper = new D(parsed.paper || 0);
            game.totalPaper = new D(parsed.totalPaper || 0);
            game.prestigePoints = new D(parsed.prestigePoints || 0);
            game.totalClicks = parsed.totalClicks || 0;
            game.prestigeCount = parsed.prestigeCount || 0;
            game.lastSaveTime = parsed.lastSaveTime || Date.now();
            
            // リスク関連の復元
            game.risk = (typeof parsed.risk === 'number') ? parsed.risk : 0;
            game.isScandal = !!parsed.isScandal;
            game.scapegoatUsed = parsed.scapegoatUsed || 0;
            game.lawyerLevel = parsed.lawyerLevel || 0;

            // 施設の復元（セーブデータにある所持数と、定数データをマージ）
            game.facilities = FACILITY_DATA.map((data, i) => {
                let owned = 0;
                if (parsed.facilities && parsed.facilities[i]) {
                    owned = parsed.facilities[i].owned || 0;
                }
                return { id: data.id, owned: owned };
            });

            // アップグレードの復元
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
            // 新規ゲーム
            initNewGame();
        }

        // UI生成
        initUI();
        
        // ゲームループ開始
        lastFrameTime = Date.now();
        requestAnimationFrame(gameLoop);

    } catch (e) {
        console.error("Load Failed:", e);
        // 致命的なら初期化
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
    createUpgradeUI();
    createAchievementUI();
    createRiskShopUI();
    updateBuyModeUI();
    if (game.isScandal) startScandal();
}

/* --- 5. UI構築 --- */
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
            </div>
            <button class="buy-btn" id="btn-${index}" onclick="buyFacility(${index})">雇用</button>
        `;
        container.appendChild(div);
    });
}

function createRiskShopUI() {
    const container = document.getElementById("risk-shop-container");
    if (!container) return;
    container.innerHTML = "";

    const divScape = document.createElement("div");
    divScape.className = "item-box";
    divScape.innerHTML = `
        <div class="item-info"><h3>スケープゴート</h3><p>リスク-50% (価格3倍増)</p></div>
        <button class="buy-btn risk-btn danger" id="btn-scapegoat" onclick="buyScapegoat()">購入 <span id="cost-scapegoat">0</span></button>
    `;
    container.appendChild(divScape);

    const divLawyer = document.createElement("div");
    divLawyer.className = "item-box";
    divLawyer.innerHTML = `
        <div class="item-info"><h3>顧問弁護士 (Lv.<span id="lvl-lawyer">0</span>)</h3><p>リスク減少UP (価格2.5倍増)</p></div>
        <button class="buy-btn risk-btn" id="btn-lawyer" onclick="buyLawyer()">契約 <span id="cost-lawyer">0</span></button>
    `;
    container.appendChild(divLawyer);
}

// UI生成の省略（前と同じだが安全のため再掲）
function createUpgradeUI() {
    const container = document.getElementById("upgrades-container");
    if(!container) return;
    container.innerHTML = `<p style="padding:5px; color:#999; font-size:12px;">条件を満たすと出現します</p>`;
    game.upgrades.forEach((u, index) => {
        const div = document.createElement("div");
        div.className = "item-box";
        div.id = `upg-box-${index}`;
        div.style.display = "none";
        div.innerHTML = `<div class="item-info"><h3>${u.name}</h3><p>${u.desc}</p></div>
            <button class="buy-btn" id="upg-btn-${index}" onclick="buyUpgrade(${index})">購入</button>`;
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
        if(a.unlocked) div.classList.add("unlocked");
        div.innerHTML = `<div class="ach-icon">🏆</div><div class="item-info"><h3 id="ach-name-${index}">${a.name}</h3><p id="ach-desc-${index}">${a.desc}</p></div>`;
        container.appendChild(div);
    });
}

/* --- 6. 計算ロジック --- */
function calculateCPS() {
    let prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    let unlockedCount = game.achievements.filter(a => a.unlocked).length;
    let achievementBonus = new D(1.04).pow(unlockedCount);
    
    let multiplier = prestigeBonus.times(achievementBonus);
    let cps = new D(0);

    game.facilities.forEach(f => {
        let data = FACILITY_DATA[f.id];
        let prod = new D(data.baseProd).times(multiplier);
        
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
        
        for(let i=0; i<1000; i++) { // 最大1000個まで
            if(currentPaper.gte(currentPrice)) {
                currentPaper = currentPaper.minus(currentPrice);
                cost = cost.plus(currentPrice);
                amount++;
                currentPrice = currentPrice.times(r);
            } else {
                break;
            }
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

/* --- 7. アクション --- */
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

/* --- 8. メインループ --- */
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
    updateRiskUI();

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
    updateButtons();
    updateRiskShop();
    checkPrestige();
    checkAchievements();

    if (Math.random() < 0.02) saveGame();
    requestAnimationFrame(gameLoop);
}

/* --- 9. UI更新群 --- */
function updateButtons() {
    game.facilities.forEach((f, i) => {
        const bulk = getBulkCost(f, buyMode);
        setText(`owned-${i}`, f.owned);
        
        const btn = document.getElementById(`btn-${i}`);
        if(btn) {
            if (game.isScandal) {
                btn.innerHTML = "炎上中<br>不可";
                btn.disabled = true;
            } else if (bulk.amount === 0) {
                // 1個も買えない場合
                let data = FACILITY_DATA[f.id];
                let nextCost = new D(data.baseCost).times(new D(1.15).pow(f.owned));
                btn.innerHTML = `雇用 (不足)<br><span style="font-size:10px">${formatNumber(nextCost)}</span>`;
                btn.disabled = true;
            } else {
                btn.innerHTML = `雇用 +${bulk.amount}<br><span id="cost-${i}">${formatNumber(bulk.cost)}</span>`;
                btn.disabled = game.paper.lt(bulk.cost);
            }
        }
    });
    
    game.upgrades.forEach((u, i) => {
        const box = document.getElementById(`upg-box-${i}`);
        const btn = document.getElementById(`upg-btn-${i}`);
        if(box && btn) {
            let isVisible = u.purchased || 
               (u.targetId >= 0 && game.facilities[u.targetId].owned >= u.req) ||
               (u.targetId === -1);
            
            box.style.display = isVisible ? "flex" : "none";
            if (isVisible && !u.purchased) {
                btn.innerHTML = `購入 ${formatNumber(u.cost)}`;
                btn.disabled = game.paper.lt(u.cost) || game.isScandal;
                btn.className = "buy-btn";
            } else if (u.purchased) {
                btn.innerHTML = "済";
                btn.className = "buy-btn bought-btn";
                btn.disabled = true;
            }
        }
    });
}

function updateRiskUI() {
    const bar = document.getElementById("risk-bar");
    const val = document.getElementById("risk-val");
    const trendTxt = document.getElementById("risk-trend");
    
    if(bar) bar.style.width = game.risk + "%";
    if(val) val.innerText = Math.floor(game.risk) + "%";
    // 増加傾向の表示計算（省略）
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
function setText(id, text) { const el = document.getElementById(id); if(el) el.innerText = text; }
function getOwned(g, id) { return g.facilities[id] ? g.facilities[id].owned : 0; }
function getPurchasedCount(g) { return g.upgrades.filter(u => u.purchased).length; }
function getTotalFacilities(g) { return g.facilities.reduce((sum, f) => sum + f.owned, 0); }

/* --- アクション（残り） --- */
function buyScapegoat() {
    const sCost = new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed));
    if(game.paper.gte(sCost)) {
        game.paper = game.paper.minus(sCost);
        game.scapegoatUsed++;
        game.risk = Math.max(0, game.risk - 50);
        if(game.isScandal && game.risk <= 0) endScandal();
        updateRiskShop();
    }
}
function buyLawyer() {
    const lCost = new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel));
    if(game.paper.gte(lCost)) {
        game.paper = game.paper.minus(lCost);
        game.lawyerLevel++;
        updateRiskShop();
    }
}
function startScandal() { game.isScandal = true; const el = document.getElementById("scandal-overlay"); if(el) el.style.display = "flex"; }
function endScandal() { game.isScandal = false; const el = document.getElementById("scandal-overlay"); if(el) el.style.display = "none"; }
function clickApology() { game.risk -= 5; if(game.risk<=0) { game.risk=0; endScandal(); } updateRiskUI(); }
function checkPrestige() {
    const threshold = 1000000;
    let potential = game.totalPaper.div(threshold).pow(1/3).floor();
    let gain = potential.minus(game.prestigePoints);
    if(gain.lt(0)) gain = new D(0);
    
    let nextPoint = potential.plus(1);
    let reqTotal = nextPoint.pow(3).times(threshold);
    let remaining = reqTotal.minus(game.totalPaper);
    if(remaining.lt(0)) remaining = new D(0);
    setText("next-prestige-info", `次の伝説度まで: あと ${formatNumber(remaining)} 枚`);
    
    const btn = document.getElementById("do-prestige-btn");
    if(btn) {
        if(gain.gte(1)) { btn.style.display="block"; setText("prestige-gain", formatNumber(gain)); }
        else { btn.style.display="none"; }
    }
}
function doPrestige() {
    const threshold = 1000000;
    let potential = game.totalPaper.div(threshold).pow(1/3).floor();
    let gain = potential.minus(game.prestigePoints);
    if(gain.lt(1)) return;
    if(confirm("本社へ栄転しますか？")) {
        game.prestigePoints = game.prestigePoints.plus(gain);
        game.prestigeCount++;
        initNewGame(); // 初期化（伝説度以外）
        // 伝説度だけは戻す
        game.prestigePoints = potential; // potentialは現在の総獲得量に基づくのでこれでOK
        // ※厳密には「今回のgain」を加算するロジックだが、
        // ここでは「累積ポイント = (総枚数計算)」方式をとっているため、再計算してセット
        saveGame();
        location.reload();
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
    const now = Date.now();
    const diff = (now - game.lastSaveTime)/1000;
    if(diff>10) {
        let cps = calculateCPS();
        if(game.isScandal) cps=cps.times(0.2);
        const earn = cps.times(diff);
        if(earn.gt(0)) {
            game.paper = game.paper.plus(earn);
            game.totalPaper = game.totalPaper.plus(earn);
            const m = document.getElementById("offline-modal");
            if(m) {
                setText("offline-time", formatNumber(diff));
                setText("offline-earned", formatNumber(earn));
                m.style.display="flex";
            }
        }
    }
}
function setBuyMode(m) { buyMode = m; updateBuyModeUI(); }
function updateBuyModeUI() {
    ['1','10','100','max'].forEach(m => { const b=document.getElementById(`mode-${m}`); if(b) b.className="mode-btn"; });
    const aBtn = document.getElementById(`mode-${buyMode === 'MAX' ? 'max' : buyMode}`);
    if(aBtn) aBtn.className="mode-btn active";
}
function switchTab(name) {
    ['facilities','upgrades','risk','achievements'].forEach(t => {
        const el = document.getElementById(`${t}-tab`);
        if(el) el.style.display = (t===name)?'block':'none';
    });
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach((b,i) => b.className = 'tab-btn' + (['facilities','upgrades','risk','achievements'][i]===name ? ' active' : ''));
}
function spawnFloatingText(e, text) {
    const el = document.createElement("div");
    el.className = "click-effect";
    el.innerText = text;
    let x = e.clientX; let y = e.clientY;
    if (!x || !y) { const r = document.getElementById("stamp-btn").getBoundingClientRect(); x=r.left+r.width/2; y=r.top; }
    el.style.left=x+"px"; el.style.top=y+"px";
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1000);
}
function checkAchievements() {
    game.achievements.forEach((a, index) => {
        if (!a.unlocked && a.check(game)) {
            a.unlocked = true;
            notify(`実績解除: ${a.name}`);
            const box = document.getElementById(`ach-box-${index}`);
            if(box) {
                box.classList.add("unlocked");
                box.innerHTML = `<div class="ach-icon">🏆</div><div class="item-info"><h3>${a.name}</h3><p>${a.desc}</p></div>`;
            }
        }
    });
}
function notify(msg) {
    const area = document.getElementById("notification-area");
    if(area) {
        const div = document.createElement("div");
        div.className = "notify-box";
        div.innerText = msg;
        area.appendChild(div);
        setTimeout(()=>div.remove(), 4000);
    }
}
function exportSave(){ saveGame(); prompt("コピー", btoa(localStorage.getItem("mugenRingiSave"))); }
function importSave(){ try{ const d = atob(prompt("貼り付け")); JSON.parse(d); localStorage.setItem("mugenRingiSave", d); location.reload(); }catch(e){alert("失敗");} }
function hardReset(){ if(confirm("全消去しますか？")) { localStorage.removeItem("mugenRingiSave"); location.reload(); } }

// 起動
window.onload = function() { loadGame(); };
