/* --- 無限稟議 ゲームロジック (Ver 6.0: Quality of Life Update) --- */

const D = Decimal;

// 単位リスト
const SUFFIXES = [
    "", "k", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
    "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod", "Vg"
];

// ゲームデータ
let game = {
    paper: new D(0),
    totalPaper: new D(0),
    prestigePoints: new D(0),
    totalClicks: 0,
    prestigeCount: 0,
    startTime: Date.now(),
    lastSaveTime: Date.now(), // ★オフライン計算用

    facilities: [
        { id: 0, name: "アルバイト", baseCost: 15, baseProd: 0.5, owned: 0, desc: "スマホ片手に作業します。" },
        { id: 1, name: "自動捺印機", baseCost: 100, baseProd: 4, owned: 0, desc: "ガシャンガシャン。" },
        { id: 2, name: "ベテラン社員", baseCost: 1100, baseProd: 22, owned: 0, desc: "残業は趣味です。" },
        { id: 3, name: "クラウドワーカー", baseCost: 12000, baseProd: 85, owned: 0, desc: "顔の見えない労働力。" },
        { id: 4, name: "承認AI Type-0", baseCost: 130000, baseProd: 350, owned: 0, desc: "空気を読んで承認します。" },
        { id: 5, name: "書類養殖プラント", baseCost: 1400000, baseProd: 1800, owned: 0, desc: "バイオ技術で書類を栽培。" },
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
        { id: "ach_click_3", name: "指先の達人", desc: "ハンコを10,000回押す", unlocked: false, check: g => g.totalClicks >= 10000 },
        { id: "ach_3", name: "小さなチーム", desc: "施設を合計10個持つ", unlocked: false, check: g => getTotalFacilities(g) >= 10 },
        { id: "ach_4", name: "課の設立", desc: "施設を合計50個持つ", unlocked: false, check: g => getTotalFacilities(g) >= 50 },
        { id: "ach_5", name: "ブラック企業", desc: "施設を合計100個持つ", unlocked: false, check: g => getTotalFacilities(g) >= 100 },
        { id: "ach_fac_4", name: "中堅企業", desc: "施設を合計200個持つ", unlocked: false, check: g => getTotalFacilities(g) >= 200 },
        { id: "ach_fac_5", name: "大企業", desc: "施設を合計300個持つ", unlocked: false, check: g => getTotalFacilities(g) >= 300 },
        { id: "ach_6", name: "100万円の壁", desc: "累計で1M枚稼ぐ", unlocked: false, check: g => g.totalPaper.gte(1000000) },
        { id: "ach_7", name: "億り人", desc: "累計で100M枚稼ぐ", unlocked: false, check: g => g.totalPaper.gte(100000000) },
        { id: "ach_8", name: "兆万長者", desc: "累計で1T枚稼ぐ", unlocked: false, check: g => g.totalPaper.gte(1e12) },
        { id: "ach_money_4", name: "国家予算規模", desc: "累計で1Qa枚稼ぐ", unlocked: false, check: g => g.totalPaper.gte(1e15) },
        { id: "ach_money_5", name: "天文学的数字", desc: "累計で1Qi枚稼ぐ", unlocked: false, check: g => g.totalPaper.gte(1e18) },
        { id: "ach_money_6", name: "宇宙の塵", desc: "累計で1Sx枚稼ぐ", unlocked: false, check: g => g.totalPaper.gte(1e21) },
        { id: "ach_9", name: "バイトリーダー", desc: "アルバイトを50人雇う", unlocked: false, check: g => g.facilities[0].owned >= 50 },
        { id: "ach_part_2", name: "人海戦術", desc: "アルバイトを100人雇う", unlocked: false, check: g => g.facilities[0].owned >= 100 },
        { id: "ach_10", name: "自動化推進", desc: "捺印機を50台導入", unlocked: false, check: g => g.facilities[1].owned >= 50 },
        { id: "ach_stamp_2", name: "産業革命", desc: "捺印機を100台導入", unlocked: false, check: g => g.facilities[1].owned >= 100 },
        { id: "ach_vet_1", name: "歴戦の勇士", desc: "ベテランを50人雇う", unlocked: false, check: g => g.facilities[2].owned >= 50 },
        { id: "ach_vet_2", name: "社畜の鑑", desc: "ベテランを100人雇う", unlocked: false, check: g => g.facilities[2].owned >= 100 },
        { id: "ach_cloud_1", name: "サーバー負荷増大", desc: "クラウド50人確保", unlocked: false, check: g => g.facilities[3].owned >= 50 },
        { id: "ach_cloud_2", name: "分散処理NW", desc: "クラウド100人確保", unlocked: false, check: g => g.facilities[3].owned >= 100 },
        { id: "ach_ai_1", name: "シンギュラリティ", desc: "AIを50台稼働", unlocked: false, check: g => g.facilities[4].owned >= 50 },
        { id: "ach_bio_1", name: "マッドサイエンティスト", desc: "養殖場を50箇所建設", unlocked: false, check: g => g.facilities[5].owned >= 50 },
        { id: "ach_11", name: "効率厨", desc: "アップグレードを3つ購入", unlocked: false, check: g => g.upgrades.filter(u => u.purchased).length >= 3 },
        { id: "ach_upg_2", name: "完全武装", desc: "アップグレードを6つ購入", unlocked: false, check: g => g.upgrades.filter(u => u.purchased).length >= 6 },
        { id: "ach_12", name: "伝説の始まり", desc: "初めて栄転を行う", unlocked: false, check: g => g.prestigeCount >= 1 },
        { id: "ach_pres_2", name: "転生中毒", desc: "栄転を3回行う", unlocked: false, check: g => g.prestigeCount >= 3 },
        { id: "ach_pres_3", name: "輪廻の果て", desc: "栄転を5回行う", unlocked: false, check: g => g.prestigeCount >= 5 },
        { id: "ach_sec_1", name: "カチカチ山", desc: "【隠し】1秒間に10回クリック", unlocked: false, check: g => clickRateCheck() },
    ]
};

let lastFrameTime = Date.now();
let clickTimestamps = [];
let buyMode = 1; // 1, 10, 100, "MAX"

/* --- 初期化 --- */
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
            // ★前回セーブ時刻の復元
            game.lastSaveTime = parsed.lastSaveTime || Date.now();

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

            // ★オフライン進行の計算
            processOfflineProgress();

        } catch (e) {
            console.error("Load Error", e);
        }
    }
    createFacilityUI();
    createUpgradeUI();
    createAchievementUI();
    
    // UI更新
    updateBuyModeUI();

    lastFrameTime = Date.now();
    requestAnimationFrame(gameLoop);
}

/* --- ★新機能：オフライン進行処理 --- */
function processOfflineProgress() {
    const now = Date.now();
    // ミリ秒を秒に変換
    const diffSeconds = (now - game.lastSaveTime) / 1000;
    
    // 10秒以上経過していたら計算
    if (diffSeconds > 10) {
        // 現在のCPSを計算（まだgameLoopが回っていないので手動計算）
        const cps = calculateCPS();
        
        // 獲得量
        const earned = cps.times(diffSeconds);
        
        if (earned.gt(0)) {
            game.paper = game.paper.plus(earned);
            game.totalPaper = game.totalPaper.plus(earned);
            
            // モーダル表示
            document.getElementById("offline-time").innerText = formatNumber(diffSeconds);
            document.getElementById("offline-earned").innerText = formatNumber(earned);
            document.getElementById("offline-modal").style.display = "flex";
        }
    }
}

function closeModal() {
    document.getElementById("offline-modal").style.display = "none";
}

/* --- UI生成 --- */
function createFacilityUI() {
    const container = document.getElementById("facilities-container");
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
    container.innerHTML = `<p style="padding:5px; color:#999; font-size:12px;">条件を満たすと出現します</p>`;
    game.upgrades.forEach((u, index) => {
        const div = document.createElement("div");
        div.className = "item-box";
        div.id = `upg-box-${index}`;
        div.style.display = "none";
        let btnHtml = u.purchased ?
            `<button class="buy-btn bought-btn" disabled>済</button>` :
            `<button class="buy-btn" id="upg-btn-${index}" onclick="buyUpgrade(${index})">購入 ${u.cost}</button>`;
        div.innerHTML = `<div class="item-info"><h3>${u.name}</h3><p>${u.desc}</p></div>${btnHtml}`;
        container.appendChild(div);
    });
}

function createAchievementUI() {
    const container = document.getElementById("achievements-container");
    container.innerHTML = "";
    game.achievements.forEach((a, index) => {
        const div = document.createElement("div");
        div.className = "achievement-box";
        div.id = `ach-box-${index}`;
        if (a.unlocked) div.classList.add("unlocked");

        const icon = a.unlocked ? "🏆" : "❓";
        const name = a.unlocked ? a.name : "？？？";
        const desc = a.unlocked ? a.desc : "（条件未達成）";

        div.innerHTML = `
            <div class="ach-icon">${icon}</div>
            <div class="item-info">
                <h3 id="ach-name-${index}">${name}</h3>
                <p id="ach-desc-${index}">${desc}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

/* --- 計算ロジック --- */
// 現在のCPS（秒間生産量）を計算して返す
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

// ★新機能：まとめ買いのコスト計算
// return: { cost: Decimal, amount: Number }
function getBulkCost(facility, mode) {
    const base = new D(facility.baseCost);
    const r = 1.15;
    const k = facility.owned;
    let n = 0;

    if (mode === 'MAX') {
        // 最大購入可能数を計算
        // Cost = base * r^k * (r^n - 1) / (r - 1) <= paper
        // これをnについて解くのは大変なので、break_infinityの対数を使うか、簡易シミュレーション
        // ここでは数学的に解く
        // paper * (r-1) / (base * r^k) + 1 = r^n
        // n = log_r ( ... )
        
        // r=1.15の場合の正確な計算
        if (game.paper.lt(base.times(Math.pow(r, k)))) {
            return { cost: base.times(Math.pow(r, k)), amount: 0 }; // 1個も買えない
        }
        
        // 対数計算 (log(x) / log(1.15))
        let term = game.paper.times(r - 1).div(base.times(Math.pow(r, k))).plus(1);
        n = Math.floor(term.log10() / Math.log10(r));
        
        // 念のためn=0なら、所持金不足
        if (n < 0) n = 0;
        
        // 上限キャップ（処理落ち防止で一度に1000個までとかにしてもいいが、今回は制限なし）
    } else {
        n = mode;
    }

    // 等比数列の和の公式: Sum = a * (r^n - 1) / (r - 1)
    // ここで初項 a = base * r^k
    
    if (n === 0) return { cost: new D(0), amount: 0 };

    let firstTerm = base.times(Math.pow(r, k));
    let totalCost = firstTerm.times(Math.pow(r, n) - 1).div(r - 1);
    
    return { cost: totalCost, amount: n };
}


/* --- メインループ --- */
function gameLoop() {
    const now = Date.now();
    const dt = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // 倍率計算関連
    const prestigeBonus = game.prestigePoints.times(0.1).plus(1);
    const unlockedCount = game.achievements.filter(a => a.unlocked).length;
    const achievementBonus = Math.pow(1.04, unlockedCount);

    document.getElementById("bonus-display").innerText = `実績ボーナス: +${Math.round((achievementBonus - 1) * 100)}% (${unlockedCount}個)`;

    if (game.prestigePoints.gt(0)) {
        const pDisp = document.getElementById("prestige-display");
        pDisp.style.display = "block";
        pDisp.innerText = `★ 社内伝説度: ${formatNumber(game.prestigePoints)} (+${formatNumber(game.prestigePoints.times(10))}%)`;
    }

    let multipliers = {};
    game.facilities.forEach(f => {
        multipliers[f.id] = new D(prestigeBonus).times(achievementBonus);
    });
    game.upgrades.forEach(u => {
        if (u.purchased && u.targetId >= 0) multipliers[u.targetId] = multipliers[u.targetId].times(u.scale);
    });

    // 生産処理
    let cps = new D(0);
    game.facilities.forEach((f, i) => {
        let singleProd = new D(f.baseProd).times(multipliers[f.id]);
        let totalProd = singleProd.times(f.owned);
        cps = cps.plus(totalProd);

        let uiTotal = document.getElementById(`prod-total-${f.id}`);
        let uiSingle = document.getElementById(`prod-single-${f.id}`);
        if (uiTotal) uiTotal.innerText = formatNumber(totalProd);
        if (uiSingle) uiSingle.innerText = formatNumber(singleProd);
    });

    if (dt > 0) {
        const earned = cps.times(dt);
        game.paper = game.paper.plus(earned);
        game.totalPaper = game.totalPaper.plus(earned);
    }

    // UI更新
    document.getElementById("counter").innerText = formatNumber(game.paper);
    document.getElementById("cps-display").innerText = "毎秒処理: " + formatNumber(cps) + " 枚";
    updateButtons();
    checkPrestige();
    checkAchievements();

    if (Math.random() < 0.02) saveGame();
    requestAnimationFrame(gameLoop);
}

/* --- UI更新 --- */
function updateButtons() {
    game.facilities.forEach((f, i) => {
        // ★変更：まとめ買いコストを計算して表示
        const bulk = getBulkCost(f, buyMode);
        
        document.getElementById(`owned-${i}`).innerText = f.owned;
        
        const btn = document.getElementById(`btn-${i}`);
        
        if (buyMode === 'MAX') {
            // MAXモード時の表示: "雇用 +12 (1.5M枚)" みたいな感じ
            if (bulk.amount > 0) {
                btn.innerHTML = `雇用 +${formatNumber(bulk.amount)}<br><span style="font-size:10px">${formatNumber(bulk.cost)}</span>`;
                btn.disabled = false;
            } else {
                // 1個も買えない場合、次の1個の価格を表示
                const nextCost = new D(f.baseCost).times(Math.pow(1.15, f.owned));
                btn.innerHTML = `雇用 (不足)<br><span style="font-size:10px">${formatNumber(nextCost)}</span>`;
                btn.disabled = true;
            }
        } else {
            // 通常モード(x1, x10...)
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
            if (btn && !u.purchased) btn.disabled = game.paper.lt(u.cost);
        }
    });
}

// ★新機能：モード切り替え
function setBuyMode(mode) {
    buyMode = mode;
    updateBuyModeUI();
}

function updateBuyModeUI() {
    // ボタンの色を変える
    ['1', '10', '100', 'max'].forEach(m => {
        const btn = document.getElementById(`mode-${m}`);
        if (btn) btn.className = "mode-btn";
    });
    const activeId = (buyMode === 'MAX') ? 'max' : buyMode;
    document.getElementById(`mode-${activeId}`).className = "mode-btn active";
}

/* --- アクション --- */
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

    game.paper = game.paper.plus(clickPower);
    game.totalPaper = game.totalPaper.plus(clickPower);
    spawnFloatingText(event, "+" + formatNumber(clickPower));
}

function clickRateCheck() {
    return clickTimestamps.length >= 10;
}

// ★変更：まとめ買い対応
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

    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => b.className = 'tab-btn');
    if (tabName === 'facilities') btns[0].className += ' active';
    if (tabName === 'upgrades') btns[1].className += ' active';
    if (tabName === 'achievements') btns[2].className += ' active';
}

/* --- システム --- */
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

function getTotalFacilities(g) {
    return g.facilities.reduce((sum, f) => sum + f.owned, 0);
}

function checkAchievements() {
    game.achievements.forEach((a, index) => {
        if (!a.unlocked && a.check(game)) {
            a.unlocked = true;
            notify(`実績解除！: ${a.name}`);
            const box = document.getElementById(`ach-box-${index}`);
            if (box) {
                box.classList.add("unlocked");
                box.innerHTML = `
                    <div class="ach-icon">🏆</div>
                    <div class="item-info">
                        <h3>${a.name}</h3>
                        <p>${a.desc}</p>
                    </div>
                `;
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

function checkPrestige() {
    const threshold = 1000000;
    let potential = game.totalPaper.div(threshold).pow(1 / 3).floor();
    const gain = potential.minus(game.prestigePoints);
    const btn = document.getElementById("do-prestige-btn");
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
        lastSaveTime: Date.now(), // ★保存時刻を記録
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
            alert("データの読み込みに失敗しました。コードが間違っています。");
        }
    }
}

function hardReset() {
    if (confirm("本当に全てのデータを消去しますか？（復元できません）")) {
        localStorage.removeItem("mugenRingiSave");
        location.reload();
    }
}

window.onload = function() {
    loadGame();
};
