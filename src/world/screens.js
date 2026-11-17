// What is on the screens: dashboards for monitors, wall displays and control desks, and the printed exhibition panels.
// Everything is drawn on two canvases (one atlas each), so all the screens of a building are one draw call.
// The figures are examples, like the readings in the item cards.
import * as THREE from 'three';

const TW = 512, TH = 320, COLS = 4, ROWS = 4;          // dashboards
const PW = 512, PH = 640, PCOLS = 4, PROWS = 2;        // exhibition panels (tile ids 100 + k)
const INK = '#0b2b3c', TEAL = '#35c4c0', ORANGE = '#e8862e', PAPER = '#f6f8f8', LINE = 'rgba(11,43,60,.14)', MUTE = '#5b7684';
const FONT = '"IBM Plex Sans", Helvetica, Arial, sans-serif', AR = '"Geeza Pro", "Noto Sans Arabic", Tahoma, sans-serif';
export const TILE = { kpi: 0, trend: 1, sheet: 2, bars: 3, scada: 4, gauges: 5, plan: 6, gantt: 7, micro: 8, pcr: 9, doc: 10, cctv: 11, alarms: 12, orders: 13, growth: 14, brand: 15 };
/** a sensible mix for a row of office monitors */
export const OFFICE = [2, 0, 13, 3, 10, 7, 1, 14, 2, 6, 0, 12], CONTROL = [4, 1, 12, 5, 11, 4], LAB = [9, 8, 1, 14];

let R = 1; const rnd = () => { R = (R * 16807) % 2147483647; return R / 2147483647; };
function frame(g, title, sub, dark = false) {
  g.fillStyle = dark ? '#0d2533' : PAPER; g.fillRect(0, 0, TW, TH);
  g.fillStyle = dark ? '#123448' : INK; g.fillRect(0, 0, TW, 40);
  g.fillStyle = ORANGE; g.fillRect(0, 40, TW, 3);
  g.fillStyle = '#fff'; g.font = `600 19px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(title, 14, 21);
  if (sub) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `400 14px ${FONT}`; g.textAlign = 'right'; g.fillText(sub, TW - 14, 21); }
  g.fillStyle = dark ? 'rgba(255,255,255,.4)' : MUTE; g.font = `400 11px ${FONT}`; g.textAlign = 'right'; g.fillText('example data', TW - 10, TH - 9); g.textAlign = 'left';
}
function line(g, x, y, w, h, col, n = 28, amp = 0.3, base = 0.5, wdt = 2.5) {
  g.strokeStyle = col; g.lineWidth = wdt; g.lineJoin = 'round'; g.beginPath(); let v = base;
  for (let i = 0; i <= n; i++) { v = Math.min(0.95, Math.max(0.05, v + (rnd() - 0.5) * amp)); const px = x + (w * i) / n, py = y + h - v * h; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.stroke();
}
function grid(g, x, y, w, h, n = 4, dark = false) { g.strokeStyle = dark ? 'rgba(255,255,255,.12)' : LINE; g.lineWidth = 1; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(x, y + (h * i) / n); g.lineTo(x + w, y + (h * i) / n); g.stroke(); } }
const text = (g, s, x, y, font, col, align = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); };

const DRAW = [
  (g) => { // production KPIs
    frame(g, 'Production today', 'Hatchery');
    [['Larvae in tanks', '3.42 M', TEAL], ['Fry ready', '412,000', ORANGE], ['Survival, avg', '64 %', '#3d8f5f'], ['Feed used', '186 kg', '#4a6fa5']].forEach(([k, v, c], i) => {
      const x = 14 + (i % 2) * 246, y = 56 + Math.floor(i / 2) * 118; g.fillStyle = '#fff'; g.fillRect(x, y, 236, 106); g.fillStyle = c; g.fillRect(x, y, 5, 106);
      text(g, k, x + 16, y + 22, `400 15px ${FONT}`, MUTE); text(g, v, x + 16, y + 60, `600 34px ${FONT}`, INK); line(g, x + 130, y + 62, 92, 30, c, 14, 0.4, 0.5, 2);
    });
  },
  (g) => { // 24 h trends
    frame(g, 'Water quality, last 24 hours', 'Larval hall');
    grid(g, 46, 62, 440, 200); ['28', '27', '26', '25', '24'].forEach((s, i) => text(g, s, 38, 66 + i * 50, `400 12px ${FONT}`, MUTE, 'right'));
    line(g, 46, 62, 440, 200, TEAL, 40, 0.1, 0.66); line(g, 46, 62, 440, 200, ORANGE, 40, 0.14, 0.42); line(g, 46, 62, 440, 200, '#4a6fa5', 40, 0.08, 0.25);
    [['Temperature °C', TEAL], ['Oxygen mg/L', ORANGE], ['pH', '#4a6fa5']].forEach(([k, c], i) => { g.fillStyle = c; g.fillRect(52 + i * 150, 282, 14, 4); text(g, k, 72 + i * 150, 285, `400 13px ${FONT}`, INK); });
  },
  (g) => { // accounts sheet
    frame(g, 'Cost centres, November', 'Accounts');
    const cols = [14, 190, 280, 370, 452], heads = ['Cost centre', 'Budget', 'Actual', 'Var.', '%'];
    g.fillStyle = '#e3f1ee'; g.fillRect(8, 50, TW - 16, 26); heads.forEach((s, i) => text(g, s, cols[i] + (i ? 62 : 0), 63, `600 13px ${FONT}`, INK, i ? 'right' : 'left'));
    ['Live feed', 'Fish feed', 'Energy', 'Sea water treatment', 'Laboratory', 'Staff', 'Maintenance', 'Transport'].forEach((k, r) => {
      const y = 92 + r * 25, bud = 40 + Math.floor(rnd() * 260), act = Math.round(bud * (0.86 + rnd() * 0.26)), v = act - bud;
      if (r % 2) { g.fillStyle = 'rgba(11,43,60,.035)'; g.fillRect(8, y - 13, TW - 16, 25); }
      text(g, k, cols[0], y, `400 13.5px ${FONT}`, INK); text(g, `${bud},000`, cols[1] + 62, y, `400 13.5px ${FONT}`, INK, 'right'); text(g, `${act},000`, cols[2] + 62, y, `400 13.5px ${FONT}`, INK, 'right');
      text(g, `${v > 0 ? '+' : ''}${v},000`, cols[3] + 62, y, `500 13.5px ${FONT}`, v > 0 ? '#c2531a' : '#2f7d55', 'right'); text(g, `${Math.round((act / bud) * 100)}`, cols[4] + 46, y, `400 13.5px ${FONT}`, MUTE, 'right');
    });
  },
  (g) => { // deliveries by month
    frame(g, 'Fry delivered, by month', 'thousand');
    grid(g, 40, 60, 450, 200); const m = 'JFMAMJJASOND';
    for (let i = 0; i < 12; i++) { const h = 40 + rnd() * 150 + (i > 5 ? 20 : 0), x = 50 + i * 37; g.fillStyle = i === 10 ? ORANGE : TEAL; g.fillRect(x, 260 - h, 24, h); text(g, m[i], x + 12, 278, `400 12px ${FONT}`, MUTE, 'center'); }
  },
  (g) => { // life-support mimic
    frame(g, 'Life support, loop 2', 'RUNNING', true);
    g.strokeStyle = '#3aa0c8'; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 110); g.lineTo(470, 110); g.lineTo(470, 250); g.lineTo(40, 250); g.closePath(); g.stroke();
    [[70, 'Tanks'], [180, 'Drum filter'], [290, 'Biofilter'], [400, 'UV']].forEach(([x, k], i) => { g.fillStyle = '#16425a'; g.strokeStyle = '#6fd0e6'; g.lineWidth = 2; g.fillRect(x - 34, 84, 68, 52); g.strokeRect(x - 34, 84, 68, 52); text(g, k, x, 111, `500 13px ${FONT}`, '#dff5fb', 'center'); g.fillStyle = i === 2 ? '#f2b84b' : '#43d08a'; g.beginPath(); g.arc(x + 24, 92, 5, 0, 7); g.fill(); });
    [[120, 'Pumps 2 of 3'], [260, 'Oxygen cone'], [390, 'Degasser']].forEach(([x, k]) => { g.fillStyle = '#16425a'; g.strokeStyle = '#6fd0e6'; g.beginPath(); g.arc(x, 250, 22, 0, 7); g.fill(); g.stroke(); text(g, k, x, 292, `400 12.5px ${FONT}`, '#bfe6f0', 'center'); });
    [['Flow', '412 m³/h'], ['O₂', '7.4 mg/L'], ['Temp', '26.1 °C'], ['ORP', '318 mV']].forEach(([k, v], i) => { text(g, k, 28 + i * 120, 168, `400 12px ${FONT}`, '#8fb9c8'); text(g, v, 28 + i * 120, 192, `600 20px ${FONT}`, '#fff'); });
  },
  (g) => { // three gauges
    frame(g, 'Tank L2T3', 'Day 10');
    [['Oxygen', '7.2', 'mg/L', 0.72, TEAL], ['Temperature', '26.0', '°C', 0.58, ORANGE], ['pH', '8.1', '', 0.66, '#4a6fa5']].forEach(([k, v, u, f, c], i) => {
      const x = 90 + i * 166, y = 170; g.lineWidth = 16; g.lineCap = 'round'; g.strokeStyle = 'rgba(11,43,60,.1)'; g.beginPath(); g.arc(x, y, 58, Math.PI * 0.8, Math.PI * 2.2); g.stroke();
      g.strokeStyle = c; g.beginPath(); g.arc(x, y, 58, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * f)); g.stroke(); g.lineCap = 'butt';
      text(g, v, x, y + 2, `600 32px ${FONT}`, INK, 'center'); text(g, u, x, y + 28, `400 13px ${FONT}`, MUTE, 'center'); text(g, k, x, y + 92, `500 15px ${FONT}`, INK, 'center');
    });
  },
  (g) => { // site plan
    frame(g, 'Site', 'Umm Al Quwain');
    g.fillStyle = '#bfe3ea'; g.fillRect(8, 50, TW - 16, 246); g.fillStyle = '#efe7d6'; g.beginPath(); g.moveTo(8, 296); g.lineTo(8, 120); g.lineTo(300, 70); g.lineTo(470, 190); g.lineTo(470, 296); g.fill();
    g.fillStyle = '#fff'; [[60, 170, 150, 40], [230, 150, 60, 34], [300, 170, 46, 30], [100, 232, 30, 20], [150, 232, 30, 20], [200, 232, 30, 20]].forEach(([x, y, w, h]) => { g.fillRect(x, y, w, h); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(x, y, w, h); });
    g.strokeStyle = '#1a96ab'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(330 + (i % 5) * 30, 84 + Math.floor(i / 5) * 30 - (i % 5) * 4, 10, 0, 7); g.stroke(); }
    g.fillStyle = ORANGE; [[135, 190], [260, 166], [360, 92]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); });
  },
  (g) => { // schedule
    frame(g, 'Stocking and delivery plan', 'Weeks 46 to 51');
    for (let i = 0; i < 6; i++) { text(g, `W${46 + i}`, 150 + i * 58 + 29, 64, `500 12.5px ${FONT}`, MUTE, 'center'); g.strokeStyle = LINE; g.beginPath(); g.moveTo(150 + i * 58, 74); g.lineTo(150 + i * 58, 292); g.stroke(); }
    ['Hamour batch 14', 'Shaari batch 9', 'Hamra batch 6', 'Seabream batch 3', 'Broodstock checks', 'Cage transfers', 'Deliveries'].forEach((k, r) => {
      const y = 92 + r * 29; text(g, k, 14, y, `400 13.5px ${FONT}`, INK); const a = Math.floor(rnd() * 3), b = 2 + Math.floor(rnd() * 3); g.fillStyle = [TEAL, ORANGE, '#4a6fa5', '#3d8f5f'][r % 4]; g.fillRect(150 + a * 58 + 4, y - 9, b * 58 - 8, 18);
    });
  },
  (g) => { // microscope
    g.fillStyle = '#0a1a22'; g.fillRect(0, 0, TW, TH); const gr = g.createRadialGradient(256, 160, 20, 256, 160, 150); gr.addColorStop(0, '#f2f6e6'); gr.addColorStop(1, '#c9d6b8'); g.fillStyle = gr; g.beginPath(); g.arc(256, 160, 146, 0, 7); g.fill();
    g.save(); g.beginPath(); g.arc(256, 160, 146, 0, 7); g.clip();
    for (let i = 0; i < 5; i++) { const x = 150 + rnd() * 210, y = 80 + rnd() * 160, a = rnd() * 6.3, l = 60 + rnd() * 40; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(120,140,110,.55)'; g.beginPath(); g.ellipse(0, 0, l / 2, 7, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(40,50,40,.8)'; g.beginPath(); g.arc(l / 2 - 10, -2, 5, 0, 7); g.fill(); g.fillStyle = 'rgba(230,190,90,.7)'; g.beginPath(); g.ellipse(l / 6, 6, 12, 8, 0, 0, 7); g.fill(); g.restore(); }
    g.restore(); text(g, 'Hamour larva, day 6 · 4×', 14, 22, `500 15px ${FONT}`, '#dfeee6'); g.fillStyle = '#fff'; g.fillRect(380, 290, 90, 3); text(g, '1 mm', 425, 280, `400 12px ${FONT}`, '#fff', 'center');
  },
  (g) => { // PCR
    frame(g, 'qPCR run 2211-A', 'Cycle 31 of 40', true); grid(g, 46, 62, 440, 210, 5, true);
    for (let k = 0; k < 9; k++) { const c0 = 14 + rnd() * 18, top = k < 6 ? 0.7 + rnd() * 0.25 : 0.03; g.strokeStyle = k < 6 ? ['#43d08a', '#6fd0e6', '#f2b84b'][k % 3] : '#8fa7b3'; g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i <= 40; i++) { const v = top / (1 + Math.exp(-(i - c0) * 0.55)), x = 46 + i * 11, y = 272 - v * 210; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
    text(g, 'Cycle', 266, 292, `400 12px ${FONT}`, '#8fb9c8', 'center'); text(g, '6 positive controls · 3 clear', 46, 292, `400 12px ${FONT}`, '#8fb9c8');
  },
  (g) => { // document
    frame(g, 'Batch record H-14', 'Draft'); g.fillStyle = '#fff'; g.fillRect(60, 54, 392, 250);
    text(g, 'Hamour, batch 14', 84, 84, `600 18px ${FONT}`, INK); for (let r = 0; r < 9; r++) { g.fillStyle = 'rgba(11,43,60,.16)'; g.fillRect(84, 106 + r * 20, 220 + rnd() * 130, 7); }
    g.fillStyle = TEAL; g.fillRect(84, 290 - 6, 80, 4);
  },
  (g) => { // cameras
    g.fillStyle = '#081620'; g.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 4; i++) { const x = 6 + (i % 2) * 253, y = 6 + Math.floor(i / 2) * 157; const gr = g.createLinearGradient(x, y, x, y + 151); gr.addColorStop(0, ['#1d5870', '#27606a', '#1b4a66', '#245a52'][i]); gr.addColorStop(1, '#0d2f3f'); g.fillStyle = gr; g.fillRect(x, y, 247, 151);
      g.strokeStyle = 'rgba(190,230,240,.5)'; g.lineWidth = 2; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x + 50 + k * 72, y + 96, 30, 12, 0, 0, 7); g.stroke(); }
      text(g, ['CAM 1  Larval hall', 'CAM 2  Nursery', 'CAM 3  Broodstock', 'CAM 4  Cage SC-05'][i], x + 8, y + 16, `500 12.5px ${FONT}`, '#dff5fb'); g.fillStyle = '#e5484d'; g.beginPath(); g.arc(x + 234, y + 14, 4, 0, 7); g.fill(); }
  },
  (g) => { // alarms
    frame(g, 'Alarms and events', '2 open', true);
    [['11:02', 'Biofilter BF-2 ammonia high', 1], ['10:47', 'Oxygen low, tank L4T2', 2], ['10:15', 'Intake pump P3 started', 0], ['09:58', 'Drum filter backwash done', 0], ['09:30', 'UV-1 lamp hours 7,900', 1], ['08:44', 'Generator weekly test passed', 0], ['08:10', 'Sea water intake open', 0], ['07:52', 'Night shift handover logged', 0]].forEach(([t, k, lv], r) => {
      const y = 66 + r * 29; if (r % 2 === 0) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(8, y - 13, TW - 16, 27); }
      g.fillStyle = ['#43d08a', '#f2b84b', '#e5484d'][lv]; g.beginPath(); g.arc(24, y, 6, 0, 7); g.fill(); text(g, t, 42, y, `500 13.5px ${FONT}`, '#9fc4d1'); text(g, k, 100, y, `400 14px ${FONT}`, '#eef7f9');
    });
  },
  (g) => { // orders
    frame(g, 'Fry orders', 'This week');
    g.fillStyle = '#e3f1ee'; g.fillRect(8, 50, TW - 16, 26); ['Order', 'Species', 'Fry', 'Size', 'Status'].forEach((s, i) => text(g, s, [14, 96, 230, 318, 400][i], 63, `600 13px ${FONT}`, INK));
    [['A-1182', 'Hamour', '120,000', '5 g', 'Loading', ORANGE], ['A-1183', 'Shaari', '80,000', '3 g', 'Packed', '#3d8f5f'], ['A-1184', 'Hamra', '60,000', '4 g', 'Grading', '#4a6fa5'], ['A-1185', 'Seabream', '150,000', '2 g', 'Scheduled', MUTE], ['A-1186', 'Hamour', '40,000', '10 g', 'Scheduled', MUTE], ['A-1187', 'Shaari', '90,000', '3 g', 'Health check', '#4a6fa5'], ['A-1188', 'Hamra', '30,000', '5 g', 'Scheduled', MUTE]].forEach((row, r) => {
      const y = 94 + r * 28; if (r % 2) { g.fillStyle = 'rgba(11,43,60,.035)'; g.fillRect(8, y - 14, TW - 16, 28); }
      row.slice(0, 4).forEach((s, i) => text(g, s, [14, 96, 230, 318][i], y, `400 13.5px ${FONT}`, INK)); g.fillStyle = row[5]; g.fillRect(400, y - 10, 96, 20); text(g, row[4], 448, y + 1, `500 12px ${FONT}`, '#fff', 'center');
    });
  },
  (g) => { // growth
    frame(g, 'Growth, Hamour batch 14', 'weight, g'); grid(g, 46, 62, 440, 200);
    g.strokeStyle = TEAL; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 40; i++) { const v = 1 / (1 + Math.exp(-(i - 22) * 0.2)), x = 46 + i * 11, y = 262 - v * 190; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    g.fillStyle = ORANGE; for (let i = 2; i <= 30; i += 4) { const v = 1 / (1 + Math.exp(-(i - 22) * 0.2)) + (rnd() - 0.5) * 0.05; g.beginPath(); g.arc(46 + i * 11, 262 - v * 190, 5, 0, 7); g.fill(); }
    text(g, 'target', 420, 80, `400 12.5px ${FONT}`, TEAL); text(g, 'sampled', 360, 250, `400 12.5px ${FONT}`, ORANGE);
  },
  (g) => { // welcome
    const gr = g.createLinearGradient(0, 0, TW, TH); gr.addColorStop(0, '#0b2b3c'); gr.addColorStop(1, '#0e6e7e'); g.fillStyle = gr; g.fillRect(0, 0, TW, TH);
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 230 + i * 18); g.bezierCurveTo(130, 210 + i * 18, 260, 250 + i * 18, 512, 222 + i * 18); g.stroke(); }
    text(g, 'Sheikh Khalifa', 256, 96, `600 34px ${FONT}`, '#fff', 'center'); text(g, 'Marine Research Centre', 256, 136, `400 26px ${FONT}`, '#dff5fb', 'center');
    g.direction = 'rtl'; text(g, 'مركز الشيخ خليفة للأبحاث البحرية', 256, 184, `600 24px ${AR}`, '#f6c58c', 'center'); g.direction = 'ltr';
  },
];

/* ───── exhibition panels ───── */
export const PANELS = [
  { t: 'Hamour', ar: 'الهامور', sub: 'Orange-spotted grouper', hex: '#e8862e', fish: 'hamour', facts: [['From egg to market size', '14 to 18 months'], ['Lives', 'Reefs and rocky seabed'], ['Bred here since', 'The first hatchery']] },
  { t: 'Shaari', ar: 'الشعري', sub: 'Spangled emperor', hex: '#3a9ec4', draw: 'fish', facts: [['A Gulf favourite', 'Firm white flesh'], ['Lives', 'Seagrass and coral sand'], ['Raised', 'From our own breeders']] },
  { t: 'Red snappers', ar: 'الحمرا', sub: 'Hamra and Shiqra', hex: '#c9503c', fish: 'hamra', facts: [['Two species', 'Malabar and mangrove'], ['Lives', 'Reefs and mangrove creeks'], ['Colour', 'From diet and light']] },
  { t: 'Seabream', ar: 'السبيطي', sub: 'Silver seabream', hex: '#7f97a8', draw: 'fish', facts: [['Fast growing', 'A reliable farm fish'], ['Lives', 'Shallow coastal water'], ['Spawns', 'In the cool months']] },
  { t: 'From egg to sea', ar: 'من البيضة إلى البحر', sub: 'The production cycle', hex: '#1fa3a0', draw: 'cycle', facts: [['Egg', '1 mm, hatches in a day'], ['Larva to fry', '45 to 60 days'], ['Then', 'Nursery, then the sea']] },
  { t: 'Live feed', ar: 'الغذاء الحي', sub: 'Food you need a microscope to see', hex: '#69a95a', draw: 'plankton', facts: [['Algae', 'Green water for the tanks'], ['Rotifers', 'The first meal'], ['Artemia', 'From day 12']] },
  { t: 'Clean water', ar: 'مياه نظيفة', sub: 'Filtered, cleaned and used again', hex: '#2f86ab', draw: 'water', facts: [['Drum filter', 'Takes out solids'], ['Biofilter', 'Bacteria remove ammonia'], ['UV and ozone', 'Stop disease']] },
  { t: 'Restocking the Gulf', ar: 'إثراء مخزون الخليج', sub: 'Giving fish back to the sea', hex: '#2a5c7d', draw: 'gulf', facts: [['Released', 'Hatchery-raised juveniles'], ['Why', 'Wild stocks are under pressure'], ['With', 'Schools and fishermen']] },
];
function fishShape(g, x, y, l, col) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x - l * 0.5, y); g.bezierCurveTo(x - l * 0.3, y - l * 0.24, x + l * 0.15, y - l * 0.22, x + l * 0.32, y - l * 0.04); g.lineTo(x + l * 0.5, y - l * 0.18); g.lineTo(x + l * 0.46, y); g.lineTo(x + l * 0.5, y + l * 0.18); g.lineTo(x + l * 0.32, y + l * 0.04);
  g.bezierCurveTo(x + l * 0.15, y + l * 0.2, x - l * 0.3, y + l * 0.2, x - l * 0.5, y); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - l * 0.36, y - l * 0.03, l * 0.022, 0, 7); g.fill(); g.fillStyle = '#122'; g.beginPath(); g.arc(x - l * 0.36, y - l * 0.03, l * 0.011, 0, 7); g.fill();
}
function drawPanel(g, p, k, img) {
  const W = PW, H = PH; g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H);
  g.fillStyle = p.hex; g.fillRect(0, 0, W, 150); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 144, W, 6);
  g.textBaseline = 'alphabetic'; text(g, `0${k + 1}`, 30, 52, `600 26px ${FONT}`, 'rgba(255,255,255,.75)');
  const fs = p.t.length > 14 ? 40 : 52; text(g, p.t, 30, 108, `600 ${fs}px ${FONT}`, '#fff'); text(g, p.sub, 30, 134, `400 19px ${FONT}`, 'rgba(255,255,255,.88)');
  g.direction = 'rtl'; text(g, p.ar, W - 30, 56, `600 ${p.ar.length > 12 ? 30 : 40}px ${AR}`, '#fff', 'right'); g.direction = 'ltr';
  // picture
  const px = 30, py = 172, pw = W - 60, ph = 236; const gr = g.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, '#d9eef2'); gr.addColorStop(1, '#a9d6de'); g.fillStyle = gr; g.fillRect(px, py, pw, ph);
  g.save(); g.beginPath(); g.rect(px, py, pw, ph); g.clip();
  if (img) { const s = Math.min((pw - 30) / img.width, (ph - 30) / img.height); g.drawImage(img, px + (pw - img.width * s) / 2, py + (ph - img.height * s) / 2, img.width * s, img.height * s); }
  else if (p.draw === 'fish') { fishShape(g, W / 2, py + ph / 2, 300, p.hex); g.fillStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(W / 2 - 90 + (i % 9) * 26, py + ph / 2 - 20 + Math.floor(i / 9) * 20, 3, 0, 7); g.fill(); } }
  else if (p.draw === 'cycle') { const cx = W / 2, cy = py + ph / 2, names = ['Egg', 'Larva', 'Fry', 'Nursery', 'Sea cage', 'Breeder']; g.strokeStyle = p.hex; g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, 82, 0, 7); g.stroke(); names.forEach((nm, i) => { const a = -Math.PI / 2 + (i / 6) * 6.283, x = cx + Math.cos(a) * 82, y = cy + Math.sin(a) * 82; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 21, 0, 7); g.fill(); g.strokeStyle = p.hex; g.lineWidth = 3; g.stroke(); if (i > 1) fishShape(g, x, y, 14 + i * 4, p.hex); else { g.fillStyle = p.hex; g.beginPath(); g.arc(x, y, 5 + i * 2, 0, 7); g.fill(); } text(g, nm, cx + Math.cos(a) * 138, cy + Math.sin(a) * 104 + 6, `500 15px ${FONT}`, INK, 'center'); }); }
  else if (p.draw === 'plankton') { for (let i = 0; i < 40; i++) { const x = px + rnd() * pw, y = py + rnd() * ph, r = 4 + rnd() * 16; g.fillStyle = ['rgba(90,160,80,.55)', 'rgba(60,130,60,.45)', 'rgba(220,150,70,.5)'][i % 3]; g.beginPath(); if (i % 3 === 2) g.ellipse(x, y, r * 1.3, r * 0.5, rnd() * 3, 0, 7); else g.arc(x, y, r, 0, 7); g.fill(); } }
  else if (p.draw === 'water') { const st = ['Tank', 'Drum filter', 'Biofilter', 'UV', 'Oxygen']; st.forEach((nm, i) => { const x = px + 46 + i * 98, y = py + 96; g.fillStyle = '#fff'; g.strokeStyle = p.hex; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 34, 0, 7); g.fill(); g.stroke(); text(g, String(i + 1), x, y + 9, `600 26px ${FONT}`, p.hex, 'center'); text(g, nm, x, y + 62, `500 14px ${FONT}`, INK, 'center'); if (i < 4) { g.beginPath(); g.moveTo(x + 38, y); g.lineTo(x + 60, y); g.stroke(); } }); g.strokeStyle = p.hex; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(px + 46 + 4 * 98, py + 172); g.lineTo(px + 46, py + 172); g.stroke(); g.setLineDash([]); text(g, 'and back to the tank', W / 2, py + 204, `400 15px ${FONT}`, INK, 'center'); }
  else { g.fillStyle = '#efe7d6'; g.beginPath(); g.moveTo(px, py + ph); g.lineTo(px, py + 70); g.bezierCurveTo(px + 120, py + 40, px + 200, py + 130, px + 300, py + 150); g.lineTo(px + pw, py + 200); g.lineTo(px + pw, py + ph); g.fill(); for (let i = 0; i < 9; i++) fishShape(g, px + 250 + (i % 3) * 62 + rnd() * 20, py + 40 + Math.floor(i / 3) * 36 + rnd() * 12, 44, p.hex); }
  g.restore();
  p.facts.forEach(([k2, v], i) => { const y = 444 + i * 52; g.fillStyle = p.hex; g.fillRect(30, y - 20, 6, 38); text(g, k2, 50, y - 2, `600 20px ${FONT}`, INK); text(g, v, 50, y + 21, `400 17px ${FONT}`, MUTE); });
  g.fillStyle = INK; g.fillRect(0, H - 44, W, 44); text(g, 'Sheikh Khalifa Marine Research Centre', 30, H - 17, `500 15px ${FONT}`, '#dfeef1'); text(g, 'Touch the screen', W - 30, H - 17, `400 14px ${FONT}`, '#f6c58c', 'right');
}

let dash = null, panels = null;
/** set to the renderer (build.js): a picture redrawn after the fonts or the fish photos arrive is sent to the graphics card at once,
 *  not on the first frame it is seen (for these big atlases that frame would stall) */
export const uploadNow = { renderer: null };
const upload = (t) => { if (uploadNow.renderer) try { uploadNow.renderer.initTexture(t); } catch (e) { /* uploaded on first use instead */ } };
function atlas(w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); paint(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function dashTex() {
  return dash || (dash = atlas(TW * COLS, TH * ROWS, (g) => { DRAW.forEach((fn, i) => { R = 97 + i * 131; g.save(); g.translate((i % COLS) * TW, Math.floor(i / COLS) * TH); g.beginPath(); g.rect(0, 0, TW, TH); g.clip(); g.textBaseline = 'middle'; fn(g); g.restore(); }); }));
}
function panelTex() {
  if (panels) return panels;
  const paint = (g, imgs = {}) => PANELS.forEach((p, k) => { R = 211 + k * 37; g.save(); g.translate((k % PCOLS) * PW, Math.floor(k / PCOLS) * PH); g.beginPath(); g.rect(0, 0, PW, PH); g.clip(); drawPanel(g, p, k, imgs[p.fish]); g.restore(); });
  panels = atlas(PW * PCOLS, PH * PROWS, paint);
  // the client's fish pictures arrive a moment later
  const want = [...new Set(PANELS.map((p) => p.fish).filter(Boolean))], imgs = {}; let left = want.length;
  for (const id of want) { const im = new Image(); im.onload = im.onerror = () => { if (im.naturalWidth) imgs[id] = im; if (--left === 0) { paint(panels.image.getContext('2d'), imgs); panels.needsUpdate = true; upload(panels); } }; im.src = `${import.meta.env.BASE_URL}fish/${id}.webp`; }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { paint(panels.image.getContext('2d'), imgs); panels.needsUpdate = true; upload(panels); if (dash) { const g = dash.image.getContext('2d'); DRAW.forEach((fn, i) => { R = 97 + i * 131; g.save(); g.translate((i % COLS) * TW, Math.floor(i / COLS) * TH); g.beginPath(); g.rect(0, 0, TW, TH); g.clip(); g.textBaseline = 'middle'; fn(g); g.restore(); }); dash.needsUpdate = true; upload(dash); } });
  return panels;
}

/** quads recorded by Builder.screen → at most two meshes (dashboards, exhibition panels) */
export function buildScreens(list) {
  const out = new THREE.Group(); out.name = 'screens';
  for (const ex of [false, true]) {
    const qs = list.filter((q) => (q.tile >= 100) === ex); if (!qs.length) continue;
    const pos = new Float32Array(qs.length * 12), uv = new Float32Array(qs.length * 8), idx = [], cols = ex ? PCOLS : COLS, rows = ex ? PROWS : ROWS;
    qs.forEach((q, i) => {
      pos.set(q.p, i * 12); const t = ex ? q.tile - 100 : q.tile % (COLS * ROWS), u0 = (t % cols) / cols, top = 1 - Math.floor(t / cols) / rows, u1 = u0 + 1 / cols, c = q.crop || [0, 1], v1 = top - c[0] / rows, v0 = top - c[1] / rows, e = 0.004;
      uv.set([u0 + e, v0 + e, u1 - e, v0 + e, u1 - e, v1 - e, u0 + e, v1 - e], i * 8); idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: ex ? panelTex() : dashTex(), toneMapped: false, color: ex ? 0xe9e6e0 : 0xffffff })); m.name = ex ? 'panels' : 'dashboards'; m.matrixAutoUpdate = false; out.add(m);
  }
  return out;
}
