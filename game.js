/* --- 無限稟議 ゲームロジック (Ver 7.0: Risk & Scandal) --- */

const D = Decimal;

const SUFFIXES = [
    "", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
    "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"
];

let game = {
    paper: new D(0),
    totalPaper: new D(0),
    prestigePoints: new D(0),
    totalClicks: 0,
    prestigeCount: 0,
    startTime: Date.now(),
    lastSaveTime: Date.now(),

    // ★リスク関連データ
    risk: 0,           // 0-100
    isScandal: false,  // 炎上中か
    scapegoatUsed: 0,  // スケープゴート使用回数（価格上昇用）
    lawyerLevel: 0,    // 顧問弁護士レベル

    facilities: [
        // riskPerSec: 秒間リスク増加量
        { id: 0, name: "アルバイト", baseCost: 15, baseProd: 0.5, riskPerSec: 0, owned: 0, desc: "安全です。" },
        { id: 1, name: "自動捺印機", baseCost: 100, baseProd: 4, riskPerSec: 0, owned: 0, desc: "文句を言いません。" },
        { id: 2, name: "ベテラン社員", baseCost: 1100, baseProd: 22, riskPerSec: 0, owned: 0, desc: "残業も厭いません。" },
        { id: 3, name: "クラウドワーカー", baseCost: 12000, baseProd: 85, riskPerSec: 0.1, owned: 0, desc: "管理が行き届きません (リスク+0.1%/s)" },
        { id: 4, name: "承認AI Type-0", baseCost: 130000, baseProd: 350, riskPerSec: 0.5, owned: 0, desc: "時々暴走します (リスク+0.5%/s)" },
        { id: 5, name: "書類養殖プラント", baseCost: 1400000, baseProd: 1800, riskPerSec: 2.0, owned: 0, desc: "倫理的問題があります (リスク+2.0%/s)" },
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
        // ...他省略せず維持
    ]
};

let lastFrameTime = Date.now();
let clickTimestamps = [];
let buyMode = 1; 

// ★リスク対策アイテムの定義
const SCAPEGOAT_BASE_COST = 2000;
const LAWYER_BASE_COST = 10000;

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
            
            // リスク関連復元
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
        } catch (e) { console.error(e); }
    }
    createFacilityUI();
    createUpgradeUI();
    createAchievementUI();
    createRiskShopUI(); // ★追加
    updateBuyModeUI();
    lastFrameTime = Date.now();
    requestAnimationFrame(gameLoop);
}

/* --- リスクショップUI生成 --- */
function createRiskShopUI() {
    const container = document.getElementById("risk-shop-container");
    container.innerHTML = "";

    // スケープゴート
    const divScape = document.createElement("div");
    divScape.className = "item-box";
    divScape.innerHTML = `
        <div class="item-info">
            <h3>スケープゴートを用意</h3>
            <p>責任を押し付け、リスクを-50%します。<br>
            <span style="color:#d32f2f;">※買うたびに価格が3倍になります</span></p>
        </div>
        <button class="buy-btn risk-btn danger" id="btn-scapegoat" onclick="buyScapegoat()">
            購入 <span id="cost-scapegoat">0</span>
        </button>
    `;
    container.appendChild(divScape);

    // 顧問弁護士
    const divLawyer = document.createElement("div");
    divLawyer.className = "item-box";
    divLawyer.innerHTML = `
        <div class="item-info">
            <h3>顧問弁護士と契約 (Lv.<span id="lvl-lawyer">0</span>)</h3>
            <p>リスクの自然減少スピードを高めます。<br>
            <span style="color:#d32f2f;">※買うたびに価格が2.5倍になります</span></p>
        </div>
        <button class="buy-btn risk-btn" id="btn-lawyer" onclick="buyLawyer()">
            契約 <span id="cost-lawyer">0</span>
        </button>
    `;
    container.appendChild(divLawyer);
}

function processOfflineProgress() {
    const now = Date.now();
    const diffSeconds = (now - game.lastSaveTime) / 1000;
    if (diffSeconds > 10) {
        const cps = calculateCPS();
        // 炎上中は効率ダウン
        if (game.isScandal) cps = cps.times(0.2);
        
        const earned = cps.times(diffSeconds);
        if (earned.gt(0)) {
            game.paper = game.paper.plus(earned);
            game.totalPaper = game.totalPaper.plus(earned);
            document.getElementById("offline-time").innerText = formatNumber(diffSeconds);
            document.getElementById("offline-earned").innerText = formatNumber(earned);
            document.getElementById("offline-modal").style.display = "flex";
        }
    }
}
function closeModal() { document.getElementById("offline-modal").style.display = "none"; }

/* --- 計算ロジック --- */
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
    let n = 0;
    if (mode === 'MAX') {
        if (game.paper.lt(base.times(Math.pow(r, k)))) return { cost: base.times(Math.pow(r, k)), amount: 0 };
        let term = game.paper.times(r - 1).div(base.times(Math.pow(r, k))).plus(1);
        n = Math.floor(term.log10() / Math.log10(r));
        if (n < 0) n = 0;
    } else {
        n = mode;
    }
    if (n === 0) return { cost: new D(0), amount: 0 };
    let firstTerm = base.times(Math.pow(r, k));
    let totalCost = firstTerm.times(Math.pow(r, n) - 1).div(r - 1);
    return { cost: totalCost, amount: n };
}

/* --- ★リスク関連ロジック --- */
// スケープゴート価格： Base * 3^使用回数 (強烈なインフレ)
function getScapegoatCost() {
    return new D(SCAPEGOAT_BASE_COST).times(new D(3).pow(game.scapegoatUsed));
}
// 弁護士価格： Base * 2.5^レベル
function getLawyerCost() {
    return new D(LAWYER_BASE_COST).times(new D(2.5).pow(game.lawyerLevel));
}

function buyScapegoat() {
    const cost = getScapegoatCost();
    if (game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        game.scapegoatUsed++;
        game.risk = Math.max(0, game.risk - 50); // リスク-50%
        // 炎上中なら解除のチャンス
        if(game.isScandal && game.risk <= 0) endScandal();
        updateRiskShop();
    }
}

function buyLawyer() {
    const cost = getLawyerCost();
    if (game.paper.gte(cost)) {
        game.paper = game.paper.minus(cost);
        game.lawyerLevel++;
        updateRiskShop();
    }
}

function startScandal() {
    game.isScandal = true;
    document.getElementById("scandal-overlay").style.display = "flex";
}

function endScandal() {
    game.isScandal = false;
    document.getElementById("scandal-overlay").style.display = "none";
}

function clickApology() {
    // 謝罪連打でリスク低下
    game.risk -= 5; 
    if (game.risk <= 0) {
        game.risk = 0;
        endScandal();
    }
    updateRiskDisplay();
}

/* --- メインループ --- */
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // --- リスク計算 ---
    // 危険施設からの増加
    let riskIncrease = 0;
    game.facilities.forEach(f => {
        if (f.riskPerSec > 0) {
            riskIncrease += f.riskPerSec * f.owned;
        }
    });
    // 自然減少 (弁護士がいると早くなる: 基礎1.0 + Lv*0.5)
    let riskDecay = 1.0 + (game.lawyerLevel * 0.5);
    
    // リスク変動
    if (!game.isScandal) {
        let riskDelta = riskIncrease - riskDecay;
        // 増えるときはそのまま、減るときは少しゆっくりにする等の調整も可能だが今回はシンプルに
        game.risk += riskDelta * dt;
        
        if (game.risk < 0) game.risk = 0;
        if (game.risk >= 100) {
            game.risk = 100;
            startScandal();
        }
    } else {
        // 炎上中は自動では下がらない（謝罪が必要）
    }
    
    updateRiskDisplay(riskIncrease - riskDecay);

    // --- 生産処理 ---
    let cps = calculateCPS();
    
    // 炎上ペナルティ (80%ダウン)
    if (game.isScandal) {
        cps = cps.times(0.2);
    }

    if (dt > 0) {
        const earned = cps.times(dt);
        game.paper = game.paper.plus(earned);
        game.totalPaper = game.totalPaper.plus(earned);
    }

    // UI更新
    document.getElementById("counter").innerText = formatNumber(game.paper);
    document.getElementById("cps-display").innerText = "毎秒処理: " + formatNumber(cps) + " 枚";
    
    updateButtons();
    updateRiskShop(); // 価格更新
    checkPrestige();
    checkAchievements();

    if (Math.random() < 0.02) saveGame();
    requestAnimationFrame(gameLoop);
}

function updateRiskDisplay(trend) {
    const bar = document.getElementById("risk-bar");
    const val = document.getElementById("risk-val");
    const trendTxt = document.getElementById("risk-trend");
    
    bar.style.width = game.risk + "%";
    val.innerText = Math.floor(game.risk) + "%";
    
    // 炎上メーター（モーダル内）
    const scandalBar = document.getElementById("scandal-meter-bar");
    if(scandalBar) scandalBar.style.width = game.risk + "%";

    if(trend !== undefined) {
        trendTxt.innerText = `変動: ${(trend > 0 ? "+" : "") + trend.toFixed(2)}%/秒`;
        trendTxt.style.color = trend > 0 ? "#d32f2f" : "#2e7d32";
    }
}

function updateRiskShop() {
    const sCost = getScapegoatCost();
    document.getElementById("cost-scapegoat").innerText = formatNumber(sCost);
    document.getElementById("btn-scapegoat").disabled = game.paper.lt(sCost);

    const lCost = getLawyerCost();
    document.getElementById("cost-lawyer").innerText = formatNumber(lCost);
    document.getElementById("lvl-lawyer").innerText = game.lawyerLevel;
    document.getElementById("btn-lawyer").disabled = game.paper.lt(lCost);
}

function updateButtons() {
    game.facilities.forEach((f, i) => {
        const bulk = getBulkCost(f, buyMode);
        document.getElementById(`owned-${i}`).innerText = f.owned;
        const btn = document.getElementById(`btn-${i}`);
        
        // 炎上中は購入不可
        if (game.isScandal) {
            btn.innerHTML = "炎上中<br>購入不可";
            btn.disabled = true;
            return;
        }

        if (buyMode === 'MAX') {
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
    });

    game.upgrades.forEach((u, i) => {
        const box = document.getElementById(`upg-box-${i}`);
        const btn = document.getElementById(`upg-btn-${i}`);
        let isVisible = u.purchased;
        if (!isVisible) {
            if (u.targetId >= 0 && game.facilities[u.targetId].owned >= u.req) isVisible = true;
            else if (u.targetId === -1) isVisible = true;
        }
        if (isVisible) {
            box.style.display = "flex";
            if (btn && !u.purchased) btn.disabled = game.paper.lt(u.cost) || game.isScandal;
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
    document.getElementById(`mode-${activeId}`).className = "mode-btn active";
}

function clickStamp(event) {
    game.totalClicks++;
    const now = Date.now();
    clickTimestamps.push(now);
    clickTimestamps = clickTimestamps.filter(t => now - t < 1000);

    let clickPower = new D(1);
    const unlockedCount = game.achievements.filter(a => a.unlocked).length;
    const achievementBonus = Math.pow(1.04, unlockedCount);
    const prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    clickPower = clickPower.times(prestigeBonus).times(achievementBonus);

    const upg = game.upgrades.find(u => u.id === "click_1");
    if (upg && upg.purchased) clickPower = clickPower.times(upg.scale);

    // 炎上中はクリックも弱くする？ 今回はクリックは救済措置としてそのままにする
    // if (game.isScandal) clickPower = clickPower.times(0.2);

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

function switchTab(tabName) {
    document.getElementById("facilities-tab").style.display = (tabName === 'facilities') ? 'block' : 'none';
    document.getElementById("upgrades-tab").style.display = (tabName === 'upgrades') ? 'block' : 'none';
    document.getElementById("achievements-tab").style.display = (tabName === 'achievements') ? 'block' : 'none';
    document.getElementById("risk-tab").style.display = (tabName === 'risk') ? 'block' : 'none'; // 追加

    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.className = 'tab-btn');
    if (tabName === 'facilities') btns[0].className += ' active';
    if (tabName === 'upgrades') btns[1].className += ' active';
    if (tabName === 'risk') btns[2].className += ' active'; // 追加
    if (tabName === 'achievements') btns[3].className += ' active';
}

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
        const rect = document.getElementById("stamp-btn").getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top;
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
    const div = document.createElement("div");
    div.className = "notify-box";
    div.innerText = msg;
    area.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

// ★転生ロジック修正：次の目標を見える化
function checkPrestige() {
    const threshold = 1000000;
    // 獲得見込みポイント
    let potential = game.totalPaper.div(threshold).pow(1 / 3).floor();
    let gain = potential.minus(game.prestigePoints);
    if (gain.lt(0)) gain = new D(0);

    // 次のポイントまでの必要枚数
    // (currentPoints + 1 + gain_already_claimed?? no, logic is strictly cumulative)
    // nextTargetPoints = potential + 1
    // requiredTotal = (potential + 1)^3 * 1,000,000
    
    let nextPoint = potential.plus(1);
    let requiredTotal = nextPoint.pow(3).times(threshold);
    let remaining = requiredTotal.minus(game.totalPaper);
    
    document.getElementById("next-prestige-info").innerText = 
        `次の伝説度まで: あと ${formatNumber(remaining)} 枚 (累計 ${formatNumber(game.totalPaper)})`;

    const btn = document.getElementById("do-prestige-btn");
    // 1ポイントでも稼げるならボタンを表示、そうでなくても情報は表示したままグレーアウトしてもいいが、
    // 今回は「稼げる時だけボタン有効」にするスタイル
    if (gain.gte(1)) {
        btn.style.display = "block";
        document.getElementById("prestige-gain").innerText = formatNumber(gain);
    } else {
        btn.style.display = "none";
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
        
        // リスクシステムの初期化
        game.risk = 0;
        game.isScandal = false;
        game.scapegoatUsed = 0; // 価格リセット
        game.lawyerLevel = 0;   // レベルリセット

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
        
        // リスク保存
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

function exportSave() {
    saveGame();
    const saved = localStorage.getItem("mugenRingiSave");
    const encoded = btoa(saved);
    prompt("以下のテキストをコピーして保存してください", encoded);
}

function importSave() {
    const encoded = prompt("保存したデータ（テキスト）を貼り付けてください");
    if (encoded) {
        try {
            const decoded = atob(encoded);
            JSON.parse(decoded);
            localStorage.setItem("mugenRingiSave", decoded);
            location.reload();
        } catch (e) {
            alert("データの読み込みに失敗しました。");
        }
    }
}

function hardReset() {
    if (confirm("本当に全てのデータを消去しますか？（復元できません）")) {
        localStorage.removeItem("mugenRingiSave");
        location.reload();
    }
}

window.onload = function() { loadGame(); };
