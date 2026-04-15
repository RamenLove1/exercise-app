import { useState, useEffect } from "react";

var EXERCISES = [
  { id: "squat", label: "スクワット", icon: "🦵", baseReps: 20, sets: 2, displaySets: 3, unit: "回", rate: 0.00002 },
  { id: "pushup", label: "腕立て伏せ", icon: "💪", baseReps: 10, sets: 2, displaySets: 3, unit: "回", rate: 0.00002 },
  { id: "towelrow", label: "タオルロウ", icon: "🧱", baseReps: 10, sets: 2, displaySets: 3, unit: "回", rate: 0.000018 },
  { id: "stretch", label: "柔軟", icon: "🧘", baseReps: 10, sets: 2, displaySets: 3, unit: "回", rate: 0.000018 },
  { id: "abs", label: "腹筋", icon: "🔥", baseReps: 10, sets: 2, displaySets: 3, unit: "回", rate: 0.000018 },
  { id: "jogging", label: "ジョギング", icon: "🏃", baseReps: 5, sets: 1, displaySets: 1, unit: "分", weekendOnly: true, rate: 0.00002 },
];

var TOTAL_DAYS = 500;
var STORAGE_KEY = "exercise-mgr-v5";

function calcReps(baseReps, dayNumber, rate) {
  var reps = baseReps;
  for (var n = 1; n < dayNumber; n++) {
    reps = reps * (1 + rate * (500 - n));
  }
  return reps;
}

function getRepsForDay(exerciseId, dayNumber) {
  var ex = EXERCISES.find(function(e) { return e.id === exerciseId; });
  if (!ex) return 0;
  return calcReps(ex.baseReps, dayNumber, ex.rate);
}

function displayReps(reps) {
  return Math.floor(reps);
}

function fmtRepsDetailed(reps) {
  var floored = Math.floor(reps);
  var decimal = Math.round(reps * 10) / 10;
  if (decimal === floored) return String(floored);
  return floored + " (" + decimal + ")";
}

async function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Save failed:", e);
  }
}

var DEFAULT_DATA = {
  currentDay: 1,
  started: false,
  startDate: "",
  completedDays: {},
  dayChecks: {},
};

function dayToDate(startDate, dayNum) {
  if (!startDate) return "";
  var d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + dayNum - 1);
  return (d.getMonth() + 1) + "/" + d.getDate();
}

var DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function dayToDateDow(startDate, dayNum) {
  if (!startDate) return "";
  var d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + dayNum - 1);
  return (d.getMonth() + 1) + "/" + d.getDate() + "(" + DOW_LABELS[d.getDay()] + ")";
}

function dayToDateFull(startDate, dayNum) {
  if (!startDate) return "";
  var d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + dayNum - 1);
  return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
}

function isDayWeekend(startDate, dayNum) {
  if (!startDate) return false;
  var d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + dayNum - 1);
  var dow = d.getDay();
  return dow === 0 || dow === 6;
}

function getExercisesForDay(startDate, dayNum) {
  var weekend = isDayWeekend(startDate, dayNum);
  return EXERCISES.filter(function(ex) {
    if (ex.weekendOnly) return weekend;
    return true;
  });
}

function countDayCategories(data, maxDay) {
  var counts = { full: 0, normal: 0, recovered: 0, total: 0 };
  var dc = data.dayChecks || {};
  for (var d = 1; d < maxDay; d++) {
    var comp = data.completedDays[d];
    if (!comp) continue;
    counts.total++;
    var hasRecovered = !!comp.recovered;
    if (!hasRecovered) {
      var checks = dc[d] || {};
      var dayEx = getExercisesForDay(data.startDate, d);
      dayEx.forEach(function(ex) {
        for (var s = 1; s <= ex.sets; s++) {
          if (checks[ex.id + "_" + s] === "recovered") hasRecovered = true;
        }
      });
    }
    if (hasRecovered) { counts.recovered++; continue; }
    var dayExAll = getExercisesForDay(data.startDate, d);
    var checksAll = dc[d] || {};
    var allBonus = true;
    var hasBonusSets = false;
    dayExAll.forEach(function(ex) {
      var ds = ex.displaySets || ex.sets;
      for (var s = ex.sets + 1; s <= ds; s++) {
        hasBonusSets = true;
        if (!checksAll[ex.id + "_" + s]) allBonus = false;
      }
    });
    if (hasBonusSets && allBonus) { counts.full++; }
    else { counts.normal++; }
  }
  return counts;
}

var C = {
  bg: "#0f1117", card: "#1a1d27", accent: "#4f8cff", accentDim: "#2a4a8a",
  red: "#ff5a5a", redDim: "#6b2a2a", green: "#3dd68c", greenDim: "#1a4a36",
  yellow: "#ffc84f", yellowDim: "#5a4520", text: "#e8eaf0", textDim: "#7a7f8e",
  border: "#2a2d3a", orange: "#ff9f43", orangeDim: "#4a3318",
  purple: "#a78bfa", purpleDim: "#3b2d6b",
};

var S = {
  app: { background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", fontSize: 14, padding: "0 0 80px 0" },
  header: { padding: "16px 20px 8px", fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  tabs: { display: "flex", position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: "1px solid " + C.border, zIndex: 100 },
  tab: function(a) { return { flex: 1, padding: "10px 0 12px", textAlign: "center", fontSize: 10, color: a ? C.accent : C.textDim, background: "none", border: "none", cursor: "pointer", fontWeight: a ? 700 : 400 }; },
  tabIcon: { display: "block", fontSize: 17, marginBottom: 2 },
  card: { background: C.card, borderRadius: 12, margin: "8px 12px", padding: "14px 16px", border: "1px solid " + C.border },
  badge: function(c) { return { display: "inline-block", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: c === "red" ? C.redDim : c === "green" ? C.greenDim : c === "yellow" ? C.yellowDim : c === "purple" ? C.purpleDim : c === "orange" ? C.orangeDim : C.accentDim, color: c === "red" ? C.red : c === "green" ? C.green : c === "yellow" ? C.yellow : c === "purple" ? C.purple : c === "orange" ? C.orange : C.accent, marginLeft: 6 }; },
  btn: function(c) { c = c || C.accent; return { background: c, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%" }; },
  btnSm: function(c) { c = c || C.accent; return { background: c, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }; },
  btnOutline: { background: "none", color: C.accent, border: "1px solid " + C.accent, borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" },
  input: { background: C.bg, color: C.text, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box" },
  section: { color: C.textDim, fontSize: 12, fontWeight: 600, padding: "12px 20px 4px", letterSpacing: 1 },
};

function TabBar(props) {
  var tab = props.tab, setTab = props.setTab;
  var tabs = [
    { id: "home", icon: "🏠", label: "今日" },
    { id: "progress", icon: "📈", label: "推移" },
    { id: "calendar", icon: "📅", label: "履歴" },
    { id: "stats", icon: "🏆", label: "統計" },
  ];
  return (
    <div style={S.tabs}>
      {tabs.map(function(t) {
        return (
          <button key={t.id} style={S.tab(tab === t.id)} onClick={function() { setTab(t.id); }}>
            <span style={S.tabIcon}>{t.icon}</span>{t.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle(props) {
  var title = props.title, children = props.children;
  var defOpen = props.defaultOpen || false;
  var st = useState(defOpen);
  var open = st[0], setOpen = st[1];
  return (
    <div style={Object.assign({}, S.card, { padding: 0, overflow: "hidden" })}>
      <button onClick={function() { setOpen(!open); }} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "none", border: "none", color: C.text, cursor: "pointer" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
        <span style={{ color: C.textDim, fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </button>
      {open && <div style={{ padding: "0 16px 14px", borderTop: "1px solid " + C.border }}>{children}</div>}
    </div>
  );
}

function HomeTab(props) {
  var data = props.data, setData = props.setData, save = props.save;
  var dayNum = data.currentDay;
  var isFinished = dayNum > TOTAL_DAYS;
  var isDayCompleted = !!data.completedDays[dayNum];
  var checkedSets = (data.dayChecks && data.dayChecks[dayNum]) || {};
  var activeExercises = getExercisesForDay(data.startDate, dayNum);

  var requiredSets = 0;
  var requiredChecked = 0;
  var bonusChecked = 0;
  activeExercises.forEach(function(ex) {
    var ds = ex.displaySets || ex.sets;
    for (var s = 1; s <= ds; s++) {
      if (s <= ex.sets) {
        requiredSets++;
        if (isDayCompleted || checkedSets[ex.id + "_" + s]) requiredChecked++;
      } else {
        if (checkedSets[ex.id + "_" + s]) bonusChecked++;
      }
    }
  });
  var allChecked = requiredChecked === requiredSets && requiredSets > 0;

  var st_di = useState("");
  var dateInput = st_di[0], setDateInput = st_di[1];

  var startProgram = function() {
    if (!dateInput) return;
    var n = Object.assign({}, data, { started: true, startDate: dateInput, currentDay: 1, dayChecks: {} });
    setData(n); save(n);
  };

  var toggleSet = function(exId, setNum) {
    var key = exId + "_" + setNum;
    var nc = Object.assign({}, checkedSets);
    var newDayChecks = Object.assign({}, data.dayChecks || {});
    var targetEx = activeExercises.find(function(e) { return e.id === exId; });
    var isBonus = targetEx && setNum > targetEx.sets;

    if (isDayCompleted && isBonus) {
      nc[key] = !nc[key];
      newDayChecks[dayNum] = nc;
      var n3 = Object.assign({}, data, { dayChecks: newDayChecks });
      setData(n3); save(n3);
    } else if (isDayCompleted) {
      activeExercises.forEach(function(ex2) {
        for (var s2 = 1; s2 <= ex2.sets; s2++) {
          nc[ex2.id + "_" + s2] = true;
        }
      });
      nc[key] = false;
      newDayChecks[dayNum] = nc;
      var newComp = Object.assign({}, data.completedDays);
      delete newComp[dayNum];
      var n = Object.assign({}, data, { dayChecks: newDayChecks, completedDays: newComp });
      setData(n); save(n);
    } else {
      nc[key] = !nc[key];
      newDayChecks[dayNum] = nc;
      var n2 = Object.assign({}, data, { dayChecks: newDayChecks });
      setData(n2); save(n2);
    }
  };

  var completedTotal = 0;
  Object.keys(data.completedDays).forEach(function(k) {
    if (parseInt(k) < dayNum) completedTotal++;
  });

  var streakDays = 0;
  var d = dayNum - 1;
  while (d >= 1 && data.completedDays[d]) { streakDays++; d--; }

  var growthA = dayNum <= TOTAL_DAYS ? 0.002 * (500 - dayNum) : 0;
  var growthB = dayNum <= TOTAL_DAYS ? 0.0018 * (500 - dayNum) : 0;
  var dateStr = dayToDateDow(data.startDate, dayNum);
  var endDateStr = dayToDateFull(data.startDate, TOTAL_DAYS);

  return (
    <div>
      <div style={S.header}>運動管理システム</div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>進行状況</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {data.started ? (
                isFinished ? (
                  <span style={{ color: C.green }}>🎉 完了！</span>
                ) : (
                  <span>{dayNum}<span style={{ fontSize: 14, color: C.textDim }}>日目</span><span style={{ fontSize: 14, color: C.textDim }}>{" / " + TOTAL_DAYS + "日"}</span></span>
                )
              ) : (
                <span style={{ color: C.textDim }}>未開始</span>
              )}
            </div>
            {data.started && !isFinished && dateStr && (
              <div style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>{"📅 " + dateStr}</div>
            )}
          </div>
          {data.started && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.textDim }}>完了日数</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{completedTotal}<span style={{ fontSize: 12 }}>日</span></div>
            </div>
          )}
        </div>

        {data.started && !isFinished && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textDim, marginBottom: 4 }}>
              <span>{"進捗 " + ((dayNum / TOTAL_DAYS) * 100).toFixed(1) + "%"}</span>
              <span>{"残り " + (TOTAL_DAYS - dayNum) + "日" + (endDateStr ? "（〜" + endDateStr + "）" : "")}</span>
            </div>
            <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: ((dayNum / TOTAL_DAYS) * 100) + "%", background: "linear-gradient(90deg, " + C.accent + ", " + C.green + ")", borderRadius: 3 }} />
            </div>
          </div>
        )}

        {data.started && (
          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: C.textDim, flexWrap: "wrap" }}>
            <div>{"🔥 連続 "}<span style={{ color: streakDays > 0 ? C.orange : C.textDim, fontWeight: 700 }}>{streakDays}</span>日</div>
            <div>{"📈 成長率 "}<span style={{ color: C.accent, fontWeight: 700 }}>{"+" + growthA.toFixed(3) + "% / +" + growthB.toFixed(3) + "%"}</span>/日</div>
          </div>
        )}
      </div>

      {!data.started && (
        <div style={{ padding: "0 12px" }}>
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📋 プログラム概要</div>
            <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.8 }}>
              500日間の漸進的負荷トレーニング。毎日少しずつ回数が増加します。全種目2セット。ボタンで次の日へ進みます。
            </div>
            <div style={{ marginTop: 12 }}>
              {EXERCISES.map(function(ex) {
                return (
                  <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + C.border, fontSize: 13 }}>
                    <span>{ex.icon} {ex.label}{ex.weekendOnly ? <span style={{ fontSize: 10, color: C.orange, marginLeft: 4 }}>土日</span> : ""}</span>
                    <span style={{ color: C.accent, fontWeight: 600 }}>{ex.baseReps + ex.unit + " × " + ex.sets + "セット"}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={S.card}>
            <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6 }}>開始日を入力</div>
            <input
              type="date"
              style={S.input}
              value={dateInput}
              onChange={function(e) { setDateInput(e.target.value); }}
            />
            {dateInput && (
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
                {"終了予定: " + dayToDateFull(dateInput, TOTAL_DAYS)}
              </div>
            )}
          </div>
          <button style={S.btn(dateInput ? C.accent : C.accentDim)} onClick={startProgram}>{dateInput ? "開始する" : "開始日を選択してください"}</button>
        </div>
      )}

      {data.started && !isFinished && (
        <div>
          <div style={Object.assign({}, S.section, { display: "flex", alignItems: "center", gap: 8 })}>
            <span>{dayNum + "日目のメニュー" + (dateStr ? "（" + dateStr + "）" : "")}</span>
            {isDayCompleted && <span style={S.badge("green")}>✓ 完了済み</span>}
          </div>
          {activeExercises.map(function(ex) {
            var reps = getRepsForDay(ex.id, dayNum);
            var ratio = ((reps / ex.baseReps) * 100).toFixed(1);
            var ds = ex.displaySets || ex.sets;
            var setsArr = [];
            for (var s = 1; s <= ds; s++) setsArr.push(s);
            var exAllDone = isDayCompleted || setsArr.slice(0, ex.sets).every(function(s) { return !!checkedSets[ex.id + "_" + s]; });

            return (
              <div key={ex.id} style={Object.assign({}, S.card, { opacity: exAllDone ? 0.55 : 1, transition: "opacity 0.3s" })}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.icon + " " + ex.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 26, fontWeight: 700, color: exAllDone ? C.green : C.accent }}>{displayReps(reps)}</span>
                      <span style={{ fontSize: 12, color: C.textDim }}>{ex.unit + " × " + ex.sets + "セット"}</span>
                      <span style={{ fontSize: 11, color: C.textDim, marginLeft: 4 }}>{"(" + reps.toFixed(2) + ")"}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: C.textDim }}>初日比</div>
                    <div style={{ fontSize: 13, color: C.yellow, fontWeight: 600 }}>{ratio + "%"}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {setsArr.map(function(s) {
                    var key = ex.id + "_" + s;
                    var val = checkedSets[key];
                    var done = (s <= ex.sets && isDayCompleted) || !!val;
                    var isBonus = s > ex.sets;
                    var isRecovered = val === "recovered";
                    var btnColor = isRecovered ? C.orange : isBonus ? C.purple : C.green;
                    var btnBg = isRecovered ? C.orangeDim : isBonus ? C.purpleDim : C.greenDim;
                    return (
                      <button key={s} onClick={function() { toggleSet(ex.id, s); }}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          padding: "8px 0", borderRadius: 8,
                          border: "1px solid " + (done ? btnColor : C.border),
                          background: done ? btnBg : C.bg,
                          color: done ? btnColor : C.textDim,
                          cursor: "pointer", fontSize: 12, fontWeight: 600,
                          transition: "all 0.2s",
                          borderStyle: isBonus ? "dashed" : "solid",
                        }}>
                        <span style={{ fontSize: 14 }}>{done ? "✓" : "○"}</span>
                        <span>{isBonus ? "追加" : "セット" + s}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div style={{ padding: "8px 12px" }}>
            <div style={{ fontSize: 12, color: C.textDim, textAlign: "center", marginBottom: 8 }}>
              {requiredChecked + " / " + requiredSets + " ノルマ完了" + (bonusChecked > 0 ? "  +" + bonusChecked + "追加" : "")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={Object.assign({}, S.btnOutline, { flex: 1, opacity: dayNum <= 1 ? 0.3 : 1 })}
                onClick={function() {
                  if (dayNum <= 1) return;
                  var n = Object.assign({}, data, { currentDay: dayNum - 1 });
                  setData(n); save(n);
                }}
              >
                {"← " + (dayNum - 1) + "日目" + (data.startDate ? " " + dayToDateDow(data.startDate, dayNum - 1) : "")}
              </button>
              <button
                style={Object.assign({}, S.btn(allChecked ? C.green : C.accent), { flex: 1, opacity: dayNum >= TOTAL_DAYS ? 0.3 : 1 })}
                onClick={function() {
                  if (dayNum >= TOTAL_DAYS) return;
                  if (allChecked && !isDayCompleted) {
                    var nc = Object.assign({}, data.completedDays);
                    nc[dayNum] = { timestamp: Date.now() };
                    var n = Object.assign({}, data, { completedDays: nc, currentDay: dayNum + 1 });
                    setData(n); save(n);
                  } else {
                    var n2 = Object.assign({}, data, { currentDay: dayNum + 1 });
                    setData(n2); save(n2);
                  }
                }}
              >
                {(dayNum + 1) + "日目" + (data.startDate ? " " + dayToDateDow(data.startDate, dayNum + 1) : "") + " →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isFinished && data.started && (
        <div style={S.card}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48 }}>🏆</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.green, marginTop: 10 }}>500日プログラム完了！</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 8 }}>
              {"おめでとうございます。" + completedTotal + "日間の運動を達成しました。"}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ProgressTab(props) {
  var data = props.data;
  var st1 = useState("squat"); var selectedEx = st1[0], setSelectedEx = st1[1];
  var dayNum = data.currentDay;

  var ex = EXERCISES.find(function(e) { return e.id === selectedEx; });
  if (!ex) return null;

  var maxDay = Math.min(dayNum, TOTAL_DAYS);
  var rangeStart = 1, rangeEnd = TOTAL_DAYS;

  var points = [];
  var step = Math.max(1, Math.floor(TOTAL_DAYS / 50));
  for (var dd = rangeStart; dd <= rangeEnd; dd += step) {
    points.push({ day: dd, reps: getRepsForDay(selectedEx, dd) });
  }
  var lastPt = points[points.length - 1];
  if (lastPt && lastPt.day !== rangeEnd) {
    points.push({ day: rangeEnd, reps: getRepsForDay(selectedEx, rangeEnd) });
  }

  var maxReps = 0;
  points.forEach(function(p) { if (p.reps > maxReps) maxReps = p.reps; });
  var minReps = 0;

  var chartW = 320, chartH = 160, padL = 40, padR = 10, padT = 10, padB = 30;
  var plotW = chartW - padL - padR, plotH = chartH - padT - padB;
  var rangeSpan = Math.max(1, rangeEnd - rangeStart);
  var repsSpan = Math.max(0.1, maxReps - minReps);

  function toX(v) { return padL + ((v - rangeStart) / rangeSpan) * plotW; }
  function toY(r) { return padT + plotH - ((r - minReps) / repsSpan) * plotH; }

  var pathD = points.map(function(p, i) { return (i === 0 ? "M" : "L") + toX(p.day).toFixed(1) + "," + toY(p.reps).toFixed(1); }).join(" ");
  var firstP = points[0], lastP2 = points[points.length - 1];
  var areaD = pathD + " L" + toX(lastP2.day).toFixed(1) + "," + (padT + plotH) + " L" + toX(firstP.day).toFixed(1) + "," + (padT + plotH) + " Z";

  var day1Reps = ex.baseReps;
  var day500Reps = getRepsForDay(selectedEx, 500);
  var todayReps = getRepsForDay(selectedEx, maxDay);
  var totalGrowth = ((day500Reps / day1Reps) * 100).toFixed(1);

  return (
    <div>
      <div style={S.header}>回数推移</div>

      <div style={{ padding: "0 12px", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
        {EXERCISES.map(function(e) {
          return (
            <button key={e.id} onClick={function() { setSelectedEx(e.id); }}
              style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, border: "1px solid " + (selectedEx === e.id ? C.accent : C.border), background: selectedEx === e.id ? C.accentDim : C.bg, color: selectedEx === e.id ? C.accent : C.textDim, cursor: "pointer" }}>
              {e.icon + " " + e.label}
            </button>
          );
        })}
      </div>

      <div style={Object.assign({}, S.card, { display: "flex", justifyContent: "space-around", textAlign: "center" })}>
        {[
          { lbl: "1日目", val: String(day1Reps), clr: C.textDim },
          { lbl: maxDay + "日目" + (data.startDate ? " " + dayToDate(data.startDate, maxDay) : ""), val: String(displayReps(todayReps)), clr: C.accent },
          { lbl: "500日目" + (data.startDate ? " " + dayToDate(data.startDate, 500) : ""), val: String(displayReps(day500Reps)), clr: C.green },
          { lbl: "500日目比", val: totalGrowth + "%", clr: C.yellow },
        ].map(function(item, i) {
          return (
            <div key={i}>
              <div style={{ fontSize: 10, color: C.textDim }}>{item.lbl}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: item.clr }}>{item.val}</div>
            </div>
          );
        })}
      </div>

      <div style={S.card}>
        <div style={{ overflowX: "auto" }}>
          <svg viewBox={"0 0 " + chartW + " " + chartH} style={{ width: "100%", maxWidth: chartW }}>
            {[0, 0.25, 0.5, 0.75, 1].map(function(f) {
              var y = padT + plotH * (1 - f);
              var val = minReps + repsSpan * f;
              return (
                <g key={f}>
                  <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke={C.border} strokeWidth={0.5} />
                  <text x={padL - 4} y={y + 3} fill={C.textDim} fontSize={8} textAnchor="end">{displayReps(val)}</text>
                </g>
              );
            })}
            {(function() {
              var labels = [];
              var ls = Math.max(1, Math.floor((rangeEnd - rangeStart) / 5));
              for (var ld = rangeStart; ld <= rangeEnd; ld += ls) {
                labels.push(<text key={ld} x={toX(ld)} y={chartH - 4} fill={C.textDim} fontSize={8} textAnchor="middle">{ld + "日"}</text>);
              }
              return labels;
            })()}
            {maxDay >= rangeStart && maxDay <= rangeEnd && (
              <line x1={toX(maxDay)} y1={padT} x2={toX(maxDay)} y2={padT + plotH} stroke={C.accent} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
            )}
            <path d={areaD} fill={C.accent + "15"} />
            <path d={pathD} fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {maxDay >= rangeStart && maxDay <= rangeEnd && (
              <circle cx={toX(maxDay)} cy={toY(todayReps)} r={4} fill={C.accent} stroke={C.card} strokeWidth={2} />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

function CalendarTab(props) {
  var data = props.data, setData = props.setData, save = props.save;
  var dayNum = data.currentDay;
  var completedDays = data.completedDays;
  var st = useState(-1); var page = st[0], setPage = st[1];
  var stSel = useState(null); var selectedDay = stSel[0], setSelectedDay = stSel[1];
  var perPage = 20;

  var days = [];
  for (var d = 1; d < dayNum; d++) {
    days.push({ day: d, completed: !!completedDays[d] });
  }
  var totalPages = Math.max(1, Math.ceil(days.length / perPage));
  if (page === -1 || page >= totalPages) { page = totalPages - 1; }
  var pageDays = days.slice(page * perPage, (page + 1) * perPage);

  var cats = countDayCategories(data, dayNum);
  var totalPast = dayNum - 1;
  var skipped = totalPast - cats.total;

  var recoverSet = function(dayN, exId, setNum) {
    var key = exId + "_" + setNum;
    var dc = Object.assign({}, data.dayChecks || {});
    var dayCheck = Object.assign({}, dc[dayN] || {});
    var origVal = dayCheck[key];

    if (origVal === "recovered") {
      delete dayCheck[key];
    } else if (origVal) {
      return;
    } else {
      dayCheck[key] = "recovered";
    }
    dc[dayN] = dayCheck;

    var dayExercises = getExercisesForDay(data.startDate, dayN);
    var allReqDone = true;
    dayExercises.forEach(function(ex) {
      for (var s = 1; s <= ex.sets; s++) {
        if (!dayCheck[ex.id + "_" + s]) allReqDone = false;
      }
    });

    var newComp = Object.assign({}, data.completedDays);
    if (allReqDone && !newComp[dayN]) {
      newComp[dayN] = { timestamp: Date.now(), recovered: true };
    } else if (!allReqDone && newComp[dayN] && newComp[dayN].recovered) {
      delete newComp[dayN];
    }
    var n = Object.assign({}, data, { dayChecks: dc, completedDays: newComp });
    setData(n); save(n);
  };

  return (
    <div>
      <div style={S.header}>履歴</div>

      <div style={Object.assign({}, S.card, { display: "flex", flexWrap: "wrap", justifyContent: "space-around", textAlign: "center", gap: 8 })}>
        <div>
          <div style={{ fontSize: 10, color: C.textDim }}>⭐ 全完了</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.purple }}>{cats.full}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim }}>✅ 完了</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{cats.normal}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim }}>🔄 取戻</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.orange }}>{cats.recovered}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim }}>スキップ</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: skipped > 0 ? C.red : C.textDim }}>{skipped}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim }}>現在</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{dayNum}<span style={{ fontSize: 11 }}>日目</span></div>
        </div>
      </div>

      <div style={S.card}>
        {pageDays.length === 0 && (
          <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: 10 }}>まだ履歴がありません</div>
        )}
        {pageDays.map(function(item) {
          var itemDate = dayToDate(data.startDate, item.day);
          var dayCheck = (data.dayChecks && data.dayChecks[item.day]) || {};
          var dayExercises = getExercisesForDay(data.startDate, item.day);
          var setsChecked = 0;
          var setsTotal = 0;
          var bonusTotal = 0;
          var bonusChecked = 0;
          var hasRecovered = false;
          dayExercises.forEach(function(ex) {
            var ds = ex.displaySets || ex.sets;
            for (var s = 1; s <= ds; s++) {
              if (s <= ex.sets) {
                setsTotal++;
                if (dayCheck[ex.id + "_" + s]) {
                  setsChecked++;
                  if (dayCheck[ex.id + "_" + s] === "recovered") hasRecovered = true;
                }
              } else {
                bonusTotal++;
                if (dayCheck[ex.id + "_" + s]) bonusChecked++;
              }
            }
          });
          var allBonusDone = bonusTotal > 0 && bonusChecked === bonusTotal;
          var hasPartial = !item.completed && setsChecked > 0;
          var isSelected = selectedDay === item.day;
          var statusLabel, statusColor, statusIcon;
          if (item.completed && allBonusDone) {
            statusLabel = "全完了"; statusColor = "purple"; statusIcon = "⭐";
          } else if (item.completed && hasRecovered) {
            statusLabel = "取戻完了"; statusColor = "orange"; statusIcon = "🔄";
          } else if (item.completed) {
            statusLabel = "完了"; statusColor = "green"; statusIcon = "✅";
          } else if (hasPartial) {
            statusLabel = setsChecked + "/" + setsTotal; statusColor = "yellow"; statusIcon = "🔶";
          } else {
            statusLabel = "未入力"; statusColor = "red"; statusIcon = "⬜";
          }
          return (
            <div key={item.day}>
              <div onClick={function() { setSelectedDay(isSelected ? null : item.day); }}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + C.border, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{statusIcon}</span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{item.day + "日目"}</span>
                    {itemDate && <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>{itemDate}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={S.badge(statusColor)}>{statusLabel}</span>
                  <span style={{ color: C.textDim, fontSize: 12 }}>{isSelected ? "▲" : "▼"}</span>
                </div>
              </div>
              {isSelected && (
                <div style={{ padding: "8px 0 12px", borderBottom: "1px solid " + C.border }}>
                  {dayExercises.map(function(ex) {
                    var reps = getRepsForDay(ex.id, item.day);
                    var reqArr = [];
                    for (var s = 1; s <= ex.sets; s++) reqArr.push(s);
                    return (
                      <div key={ex.id} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                          {ex.icon + " " + ex.label}
                          <span style={{ fontSize: 11, color: C.textDim, marginLeft: 6 }}>{displayReps(reps) + ex.unit}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {reqArr.map(function(sn) {
                            var key = ex.id + "_" + sn;
                            var val = dayCheck[key];
                            var done = !!val;
                            var isRecovered = val === "recovered";
                            var isOriginal = done && !isRecovered;
                            var canTap = !isOriginal;
                            return (
                              <button key={sn}
                                onClick={function() { if (canTap) recoverSet(item.day, ex.id, sn); }}
                                style={{
                                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                  padding: "6px 0", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  border: "1px solid " + (isRecovered ? C.orange : done ? C.green : C.border),
                                  background: isRecovered ? C.orangeDim : done ? C.greenDim : C.bg,
                                  color: isRecovered ? C.orange : done ? C.green : C.textDim,
                                  cursor: canTap ? "pointer" : "default",
                                  opacity: isOriginal ? 0.7 : 1,
                                }}>
                                <span>{done ? "✓" : "○"}</span>
                                <span>{"S" + sn}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <button style={S.btnSm(page > 0 ? C.accent : C.accentDim)} onClick={function() { if (page > 0) setPage(page - 1); }}>← 前</button>
            <span style={{ fontSize: 12, color: C.textDim }}>{(page + 1) + " / " + totalPages}</span>
            <button style={S.btnSm(page < totalPages - 1 ? C.accent : C.accentDim)} onClick={function() { if (page < totalPages - 1) setPage(page + 1); }}>次 →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsTab(props) {
  var data = props.data, setData = props.setData, save = props.save;
  var dayNum = data.currentDay;
  var cats = countDayCategories(data, dayNum);
  var completedCount = cats.total;
  var totalPast = Math.max(1, dayNum - 1);
  var completionRate = data.started ? ((completedCount / totalPast) * 100).toFixed(1) : "0";

  var maxStreak = 0, cur = 0;
  for (var d = 1; d < dayNum; d++) {
    if (data.completedDays[d]) { cur++; if (cur > maxStreak) maxStreak = cur; }
    else { cur = 0; }
  }

  var totalSets = 0;
  var dc = data.dayChecks || {};
  for (var dd = 1; dd < dayNum; dd++) {
    var isComp = !!data.completedDays[dd];
    var dayEx = getExercisesForDay(data.startDate, dd);
    var checks = dc[dd] || {};
    dayEx.forEach(function(ex) {
      var ds = ex.displaySets || ex.sets;
      for (var s = 1; s <= ds; s++) {
        var done = (s <= ex.sets && isComp) || !!checks[ex.id + "_" + s];
        if (done) totalSets++;
      }
    });
  }

  var st = useState(false); var confirmReset = st[0], setConfirmReset = st[1];
  var resetAll = async function() {
    var n = Object.assign({}, DEFAULT_DATA);
    setData(n); await save(n); setConfirmReset(false);
  };

  return (
    <div>
      <div style={S.header}>統計</div>

      {data.startDate && (
        <div style={Object.assign({}, S.card, { display: "flex", justifyContent: "space-between", fontSize: 12 })}>
          <div>
            <span style={{ color: C.textDim }}>{"開始: "}</span>
            <span style={{ color: C.text }}>{dayToDateFull(data.startDate, 1)}</span>
          </div>
          <div>
            <span style={{ color: C.textDim }}>{"終了予定: "}</span>
            <span style={{ color: C.text }}>{dayToDateFull(data.startDate, TOTAL_DAYS)}</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 12px" }}>
        {[
          { label: "⭐ 全完了", value: cats.full, unit: "日", color: C.purple },
          { label: "✅ 完了", value: cats.normal, unit: "日", color: C.green },
          { label: "🔄 取戻", value: cats.recovered, unit: "日", color: C.orange },
        ].map(function(s, i) {
          return (
            <div key={i} style={Object.assign({}, S.card, { margin: 0, textAlign: "center" })}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}<span style={{ fontSize: 11 }}>{s.unit}</span></div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "4px 12px 0" }}>
        {[
          { label: "完了率", value: completionRate, unit: "%", color: C.accent },
          { label: "最長連続", value: maxStreak, unit: "日", color: C.yellow },
          { label: "総セット数", value: totalSets.toLocaleString(), unit: "セット", color: C.yellow },
        ].map(function(s, i) {
          return (
            <div key={i} style={Object.assign({}, S.card, { margin: 0, textAlign: "center" })}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}<span style={{ fontSize: 11 }}>{s.unit}</span></div>
            </div>
          );
        })}
      </div>

      <Toggle title="🏅 マイルストーン">
        {[7, 14, 30, 50, 100, 150, 200, 250, 300, 365, 400, 450, 500].map(function(m) {
          var reached = completedCount >= m;
          return (
            <div key={m} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + C.border, opacity: reached ? 1 : 0.4 }}>
              <span style={{ fontSize: 13 }}>{(reached ? "🏅 " : "⬜ ") + m + "日達成"}</span>
              {reached
                ? <span style={S.badge("green")}>達成！</span>
                : <span style={{ fontSize: 11, color: C.textDim }}>{"あと" + (m - completedCount) + "日"}</span>
              }
            </div>
          );
        })}
      </Toggle>

      <div style={Object.assign({}, S.card, { marginTop: 16 })}>
        {!confirmReset ? (
          <button style={S.btn(C.red)} onClick={function() { setConfirmReset(true); }}>データをリセット</button>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: C.red, marginBottom: 10, fontWeight: 600 }}>⚠️ すべてのデータが削除されます。元に戻せません。</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={Object.assign({}, S.btn(C.red), { flex: 1 })} onClick={resetAll}>リセットする</button>
              <button style={Object.assign({}, S.btnOutline, { flex: 1 })} onClick={function() { setConfirmReset(false); }}>やめる</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  var st1 = useState("home"); var tab = st1[0], setTab = st1[1];
  var st2 = useState(DEFAULT_DATA); var data = st2[0], setData = st2[1];
  var st3 = useState(false); var loaded = st3[0], setLoaded = st3[1];

  useEffect(function() {
    loadData().then(function(saved) {
      if (saved) setData(Object.assign({}, DEFAULT_DATA, saved));
      setLoaded(true);
    });
  }, []);

  var saveFn = async function(d) { await saveData(d); };

  if (!loaded) return <div style={Object.assign({}, S.app, { display: "flex", alignItems: "center", justifyContent: "center" })}>読込中...</div>;

  return (
    <div style={S.app}>
      {tab === "home" && <HomeTab data={data} setData={setData} save={saveFn} />}
      {tab === "progress" && <ProgressTab data={data} />}
      {tab === "calendar" && <CalendarTab data={data} setData={setData} save={saveFn} />}
      {tab === "stats" && <StatsTab data={data} setData={setData} save={saveFn} />}
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}
