const state = {
    amox: { unit: 'mL', freq: 2, revFreq: 2, wtUnit: 'kg', revWtUnit: 'kg', fwdConc: 50, revConc: 50 },
    ceph: { unit: 'mL', freq: 2, revFreq: 2, wtUnit: 'kg', revWtUnit: 'kg' }
  };



  function setUnit(drug, unit) {
    state[drug].unit = unit;
    document.getElementById(`${drug}-unit-ml`).classList.toggle('active', unit === 'mL');
    document.getElementById(`${drug}-unit-mg`).classList.toggle('active', unit === 'mg');
  }

  function setFreq(drug, freq) {
    state[drug].freq = freq;
    [1, 2, 3, 4].forEach(f => {
      const btn = document.getElementById(`${drug}-freq-${f}`);
      if (btn) btn.classList.toggle('active', f === freq);
    });
  }

  function setRevFreq(drug, freq) {
    state[drug].revFreq = freq;
    [2, 3, 4].forEach(f => {
      const btn = document.getElementById(`${drug}-rev-freq-${f}`);
      if (btn) btn.classList.toggle('active', f === freq);
    });
  }

  function setWtUnit(drug, side, unit) {
    const key = side === 'fwd' ? 'wtUnit' : 'revWtUnit';
    state[drug][key] = unit;
    document.getElementById(`${drug}-${side}-wt-kg`).classList.toggle('active', unit === 'kg');
    document.getElementById(`${drug}-${side}-wt-lb`).classList.toggle('active', unit === 'lb');
    const inputId = side === 'fwd' ? `${drug}-weight` : `${drug}-rev-weight`;
    updateWtHint(drug, side, parseFloat(document.getElementById(inputId).value));
  }

  function setAmoxConc(side, mgPerMl) {
    const key = side === 'fwd' ? 'fwdConc' : 'revConc';
    state.amox[key] = mgPerMl;
    const is250 = mgPerMl === 50;
    document.getElementById(`amox-${side === 'fwd' ? '' : 'rev-'}conc-250`).classList.toggle('active',  is250);
    document.getElementById(`amox-${side === 'fwd' ? '' : 'rev-'}conc-125`).classList.toggle('active', !is250);
    document.getElementById(`amox-${side === 'fwd' ? '' : 'rev-'}conc-info`).textContent =
      is250 ? '= 50 mg/mL' : '= 25 mg/mL';
  }

  /* LIVE HINTS — show the equivalent value in the other unit as the user types */

  function updateWtHint(drug, side, val) {
    const hintId = side === 'fwd' ? `${drug}-wt-hint` : `${drug}-rev-wt-hint`;
    const unit   = side === 'fwd' ? state[drug].wtUnit : state[drug].revWtUnit;
    const el     = document.getElementById(hintId);
    if (!el) return;
    if (isNaN(val) || val <= 0) { el.textContent = ''; return; }
    el.textContent = unit === 'lb'
      ? `= ${(val / 2.20462).toFixed(2)} kg`
      : `= ${(val * 2.20462).toFixed(1)} lb`;
  }

  function updateConcHint(hintId, val) {
    const el = document.getElementById(hintId);
    if (el && !isNaN(val) && val > 0)
      el.textContent = `${(val * 5).toFixed(0)} mg/5 mL = ${val} mg/mL`;
  }

  ['ceph-conc', 'ceph-rev-conc'].forEach(id => {
    document.getElementById(id).addEventListener('input', function () {
      updateConcHint(id + '-info', parseFloat(this.value));
    });
  });

  [['amox','fwd','amox-weight'],    ['amox','rev','amox-rev-weight'],
   ['ceph','fwd','ceph-weight'],    ['ceph','rev','ceph-rev-weight']
  ].forEach(([drug, side, inputId]) => {
    document.getElementById(inputId).addEventListener('input', function () {
      updateWtHint(drug, side, parseFloat(this.value));
    });
  });

  function getWeightKg(drug, side) {
    const inputId = side === 'fwd' ? `${drug}-weight` : `${drug}-rev-weight`;
    const key     = side === 'fwd' ? 'wtUnit' : 'revWtUnit';
    const raw     = parseFloat(document.getElementById(inputId).value);
    if (isNaN(raw) || raw <= 0) return NaN;
    return state[drug][key] === 'lb' ? raw / 2.20462 : raw;
  }


  function calcForward(drug) {
    const weightKg = getWeightKg(drug, 'fwd');
    const dose     = parseFloat(document.getElementById(`${drug}-dose`).value);
    const conc     = drug === 'amox'
      ? state.amox.fwdConc
      : parseFloat(document.getElementById(`${drug}-conc`).value);
    const { unit, freq, wtUnit } = state[drug];
    const box      = document.getElementById(`${drug}-fwd-result`);

    box.classList.remove('error-box');

    if (isNaN(weightKg) || weightKg <= 0) return showErr(box, `${drug}-fwd-value`, 'Enter a valid weight.');
    if (isNaN(dose)     || dose     <= 0) return showErr(box, `${drug}-fwd-value`, 'Enter a valid dose.');
    if (isNaN(conc)     || conc     <= 0) return showErr(box, `${drug}-fwd-value`, 'Enter a valid concentration.');

    const doseMg   = unit === 'mL' ? dose * conc : dose;
    const mgKgDay  = (doseMg * freq) / weightKg;
    const mgKgDose = doseMg / weightKg;

    const freqLabel = { 1:'QD', 2:'BID', 3:'TID', 4:'QID' }[freq];
    const doseDisp  = unit === 'mL' ? `${dose} mL → ${doseMg.toFixed(1)} mg` : `${dose} mg`;
    const rawWt     = parseFloat(document.getElementById(`${drug}-weight`).value);
    const wtDisp    = wtUnit === 'lb' ? `${rawWt} lb (${weightKg.toFixed(2)} kg)` : `${weightKg.toFixed(2)} kg`;

    document.getElementById(`${drug}-fwd-value`).textContent = `${mgKgDay.toFixed(2)} mg/kg/day`;
    document.getElementById(`${drug}-fwd-breakdown`).innerHTML =
      `Dose: ${doseDisp}<br>Per dose: ${mgKgDose.toFixed(2)} mg/kg · ${freqLabel} · ${wtDisp}`;
    box.classList.add('show');
    box.style.display = 'block';
  }

  function calcReverse(drug) {
    const weightKg = getWeightKg(drug, 'rev');
    const target   = parseFloat(document.getElementById(`${drug}-rev-target`).value);
    const conc     = drug === 'amox'
      ? state.amox.revConc
      : parseFloat(document.getElementById(`${drug}-rev-conc`).value);
    const revFreq  = state[drug].revFreq;
    const box      = document.getElementById(`${drug}-rev-result`);

    box.classList.remove('error-box');

    if (isNaN(weightKg) || weightKg <= 0) return showRevErr(box, drug, 'Enter a valid weight.');
    if (isNaN(target)   || target   <= 0) return showRevErr(box, drug, 'Enter a target mg/kg/day.');
    if (isNaN(conc)     || conc     <= 0) return showRevErr(box, drug, 'Enter a valid concentration.');

    const totalMgDay = target * weightKg;
    const freqLabel  = { 2: 'BID', 3: 'TID', 4: 'QID' }[revFreq];
    const mgPerDose  = totalMgDay / revFreq;
    const mLPerDose  = mgPerDose / conc;

    const rawWt  = parseFloat(document.getElementById(`${drug}-rev-weight`).value);
    const wtDisp = state[drug].revWtUnit === 'lb'
      ? `${rawWt} lb (${weightKg.toFixed(2)} kg)`
      : `${weightKg.toFixed(2)} kg`;

    const labelEl = document.getElementById(`${drug}-rev-result-label`);
    if (labelEl) labelEl.textContent = `Per-dose · ${freqLabel}`;

    document.getElementById(`${drug}-rev-rows`).innerHTML = `
      <div class="rev-row">
        <span class="rev-row-label">${freqLabel} (${revFreq}×/day)</span>
        <span class="rev-row-value">${mLPerDose.toFixed(2)} mL &nbsp;/&nbsp; ${mgPerDose.toFixed(1)} mg</span>
      </div>`;
    document.getElementById(`${drug}-rev-breakdown`).innerHTML =
      `Total/day: ${totalMgDay.toFixed(1)} mg · Conc: ${conc} mg/mL · Wt: ${wtDisp}`;
    box.classList.add('show');
    box.style.display = 'block';
  }

  function showErr(box, valueId, msg) {
    box.classList.add('show', 'error-box');
    box.style.display = 'block';
    document.getElementById(valueId).textContent = msg;
    const bd = box.querySelector('.result-breakdown');
    if (bd) bd.innerHTML = '';
  }

  function showRevErr(box, drug, msg) {
    box.classList.add('show', 'error-box');
    box.style.display = 'block';
    document.getElementById(`${drug}-rev-rows`).innerHTML =
      `<div style="font-family:'DM Mono',monospace;font-size:0.82rem;color:var(--error);padding:4px 0">${msg}</div>`;
    document.getElementById(`${drug}-rev-breakdown`).innerHTML = '';
  }