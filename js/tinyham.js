/* wave.radio · js/tinyham.js · Tiny Ham: tune a ham radio to the hidden signal faster than your friends. */
const HAM = {ctx:null, osc:null, gain:null};
function hamTone(s){
  if (!HAM.ctx){
    HAM.ctx = new (window.AudioContext || window.webkitAudioContext)(); HAM.osc = HAM.ctx.createOscillator(); HAM.gain = HAM.ctx.createGain();
    HAM.osc.type = 'triangle'; HAM.gain.gain.value = 0; HAM.osc.connect(HAM.gain); HAM.gain.connect(HAM.ctx.destination); HAM.osc.start();
  }
  HAM.ctx.resume(); const t = HAM.ctx.currentTime;
  HAM.osc.frequency.setTargetAtTime(220 + s * 7, t, .05); HAM.gain.gain.setTargetAtTime(.02 + s * .0016, t, .05);
}
window.hamStop = () => { if (HAM.ctx) HAM.gain.gain.setTargetAtTime(0, HAM.ctx.currentTime, .05); };

function hamStart(el, p){
  const r = mpRng(p ? p.seed : Math.random() * 1e9), N = 3, targets = Array.from({length:N}, () => 10 + Math.floor(r() * 80));
  let i = 0, total = 0, t0 = performance.now(), pos = 50;
  const rank = (a, b) => b.round - a.round || a.ms - b.ms, fmt = x => x.done ? (x.ms / 1000).toFixed(1) + ' s' : 'round ' + (x.round + 1) + ' of ' + N;
  const show = () => {
    el.innerHTML = `<div class="msg">Round ${i + 1} of ${N} · penalties add 3 s</div><div class="meter"><i id="hm" style="width:0%"></i></div>
      <div class="msg" id="hs">Turn the dial to find the signal.</div>
      <input type="range" id="hd" min="0" max="100" step="0.5" value="50" aria-label="Tuning dial">
      <div class="scale" style="display:flex;justify-content:space-between;color:var(--mute);font-size:12px"><span>88</span><span>98</span><span>108</span></div>
      <button class="btn" id="hl" style="width:100%;margin-top:12px">Lock in</button><div id="mpB"></div>`;
    MP.onBoard = () => { const b = $('mpB'); if (b) b.innerHTML = MP.ch ? mpBoardHTML(rank, fmt) : ''; }; MP.onBoard();
    $('hd').oninput = () => {
      pos = +$('hd').value; const s = Math.max(0, 100 - Math.abs(pos - targets[i]) * 4);
      $('hm').style.width = s + '%'; $('hs').textContent = s > 90 ? 'Very strong signal! Lock in now.' : s > 60 ? 'Getting warmer.' : s > 30 ? 'Weak signal.' : 'Mostly static.'; hamTone(s);
    };
    $('hl').onclick = () => {
      if (Math.abs(pos - targets[i]) <= 1.5){
        total += performance.now() - t0; i++; t0 = performance.now(); window.hamStop();
        mpProg({round:i, ms:Math.round(total), done:i >= N});
        if (i >= N){ const nb = setBest('ham', Math.round(total), true); mpEnd(el, `Done in ${(total / 1000).toFixed(1)} s${nb ? ' · new best!' : ''}`, rank, fmt); } else { pos = 50; show(); }
      } else { total += 3000; $('hs').textContent = 'Missed. +3 s penalty. Keep tuning.'; }
    };
  };
  show();
}
addMP({id:'ham', n:'Tiny Ham', d:'Tune your little ham radio to the hidden signal. Three rounds, fastest total time wins.', i:'ham', c:'#ff8a5c', start:hamStart, f:v => (v / 1000).toFixed(1) + ' s'});
