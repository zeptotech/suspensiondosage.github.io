

  /* ──────────────────────────────────────────────────────────
     STATE
     Tracks the selected toggle values for each drug:
       unit      — dose input unit: 'mL' or 'mg'
       freq      — doses per day: 2 (BID), 3 (TID), 4 (QID)
       wtUnit    — forward calc weight unit: 'kg' or 'lb'
       revWtUnit — reverse calc weight unit: 'kg' or 'lb'
       amoxConc  — amox concentration in mg/mL (25 or 50); stored in state
                   because amox uses a preset toggle instead of a free input
  ────────────────────────────────────────────────────────── */
  const state = {
    amox: { unit: 'mL', freq: 2, wtUnit: 'kg', revWtUnit: 'kg', fwdConc: 50, revConc: 50 },
    ceph: { unit: 'mL', freq: 2, wtUnit: 'kg', revWtUnit: 'kg' }
  };

  /* Typical therapeutic ranges used for the range badge */
  const ranges = {
    amox: { low: 20, high: 90  },
    ceph: { low: 25, high: 100 }
  };

  /* ──────────────────────────────────────────────────────────
     TOGGLE HANDLERS
     Each function updates state and refreshes the active
     button styling on the corresponding toggle group.
  ────────────────────────────────────────────────────────── */

  /* Dose unit toggle (mL / mg) */
  function setUnit(drug, unit) {
    state[drug].unit = unit;
    document.getElementById(`${drug}-unit-ml`).classList.toggle('active', unit === 'mL');
    document.getElementById(`${drug}-unit-mg`).classList.toggle('active', unit === 'mg');
  }

  /* Frequency toggle (QD / BID / TID / QID) */
  function setFreq(drug, freq) {
    state[drug].freq = freq;
    [1, 2, 3, 4].forEach(f => {
      const btn = document.getElementById(`${drug}-freq-${f}`);
      if (btn) btn.classList.toggle('active', f === freq);
    });
  }

  /* Weight unit toggle (kg / lb) — side is 'fwd' or 'rev' */
  function setWtUnit(drug, side, unit) {
    const key = side === 'fwd' ? 'wtUnit' : 'revWtUnit';
    state[drug][key] = unit;
    document.getElementById(`${drug}-${side}-wt-kg`).classList.toggle('active', unit === 'kg');
    document.getElementById(`${drug}-${side}-wt-lb`).classList.toggle('active', unit === 'lb');
    // Refresh the conversion hint with the current input value
    const inputId = side === 'fwd' ? `${drug}-weight` : `${drug}-rev-weight`;
    updateWtHint(drug, side, parseFloat(document.getElementById(inputId).value));
  }

  /* Amoxicillin concentration preset toggle (250 mg/5mL = 50 mg/mL  |  125 mg/5mL = 25 mg/mL)
     side is 'fwd' or 'rev' — each panel has its own independent toggle */
  function setAmoxConc(side, mgPerMl) {
    const key = side === 'fwd' ? 'fwdConc' : 'revConc';
    state.amox[key] = mgPerMl;
    const is250 = mgPerMl === 50;
    document.getElementById(`amox-${side === 'fwd' ? '' : 'rev-'}conc-250`).classList.toggle('active',  is250);
    document.getElementById(`amox-${side === 'fwd' ? '' : 'rev-'}conc-125`).classList.toggle('active', !is250);
    document.getElementById(`amox-${side === 'fwd' ? '' : 'rev-'}conc-info`).textContent =
      is250 ? '= 50 mg/mL' : '= 25 mg/mL';
  }


     Show the equivalent value in the other unit as the user types.
  ────────────────────────────────────────────────────────── */

  /* Shows "= X kg" or "= X lb" below the weight input */
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

  /* Shows "X mg/5 mL = Y mg/mL" below the concentration input */
  function updateConcHint(hintId, val) {
    const el = document.getElementById(hintId);
    if (el && !isNaN(val) && val > 0)
      el.textContent = `${(val * 5).toFixed(0)} mg/5 mL = ${val} mg/mL`;
  }

  /* Attach live listeners to ceph concentration inputs only
     (amox concentration is a preset toggle — no free input to listen to) */
  ['ceph-conc', 'ceph-rev-conc'].forEach(id => {
    document.getElementById(id).addEventListener('input', function () {
      updateConcHint(id + '-info', parseFloat(this.value));
    });
  });

  /* Attach live listeners to weight inputs */
  [['amox','fwd','amox-weight'],    ['amox','rev','amox-rev-weight'],
   ['ceph','fwd','ceph-weight'],    ['ceph','rev','ceph-rev-weight']
  ].forEach(([drug, side, inputId]) => {
    document.getElementById(inputId).addEventListener('input', function () {
      updateWtHint(drug, side, parseFloat(this.value));
    });
  });

  /* ──────────────────────────────────────────────────────────
     HELPERS
  ────────────────────────────────────────────────────────── */

  /* Read the weight input and always return kg, converting from lb if needed */
  function getWeightKg(drug, side) {
    const inputId = side === 'fwd' ? `${drug}-weight` : `${drug}-rev-weight`;
    const key     = side === 'fwd' ? 'wtUnit' : 'revWtUnit';
    const raw     = parseFloat(document.getElementById(inputId).value);
    if (isNaN(raw) || raw <= 0) return NaN;
    return state[drug][key] === 'lb' ? raw / 2.20462 : raw;
  }

  /* Returns a range badge label and CSS class for a given mg/kg/day value */
  function rangeTag(drug, mgKgDay) {
    const r = ranges[drug];
    if (mgKgDay < r.low)  return { label: `Below typical range (${r.low}–${r.high} mg/kg/day)`, cls: 'range-low'  };
    if (mgKgDay > r.high) return { label: `Above typical range (${r.low}–${r.high} mg/kg/day)`, cls: 'range-high' };
    return                       { label: `Within typical range (${r.low}–${r.high} mg/kg/day)`, cls: 'range-ok'   };
  }

  /* ──────────────────────────────────────────────────────────
     FORWARD CALCULATOR
     Given: dose (mL or mg), concentration, frequency, weight
     Output: mg/kg/day and mg/kg/dose
  ────────────────────────────────────────────────────────── */
  function calcForward(drug) {
    const weightKg = getWeightKg(drug, 'fwd');
    const dose     = parseFloat(document.getElementById(`${drug}-dose`).value);
    /* Amox uses a preset toggle stored in state; ceph uses a free number input */
    const conc     = drug === 'amox'
      ? state.amox.fwdConc
      : parseFloat(document.getElementById(`${drug}-conc`).value);
    const { unit, freq, wtUnit } = state[drug];
    const box      = document.getElementById(`${drug}-fwd-result`);

    box.classList.remove('error-box');

    // Validate inputs before calculating
    if (isNaN(weightKg) || weightKg <= 0) return showErr(box, `${drug}-fwd-value`, 'Enter a valid weight.');
    if (isNaN(dose)     || dose     <= 0) return showErr(box, `${drug}-fwd-value`, 'Enter a valid dose.');
    if (isNaN(conc)     || conc     <= 0) return showErr(box, `${drug}-fwd-value`, 'Enter a valid concentration.');

    // Convert mL → mg if needed, then calculate rates
    const doseMg   = unit === 'mL' ? dose * conc : dose;
    const mgKgDay  = (doseMg * freq) / weightKg;
    const mgKgDose = doseMg / weightKg;

    const { label, cls } = rangeTag(drug, mgKgDay);
    const freqLabel = { 1:'QD', 2:'BID', 3:'TID', 4:'QID' }[freq];
    const doseDisp  = unit === 'mL' ? `${dose} mL → ${doseMg.toFixed(1)} mg` : `${dose} mg`;
    const rawWt     = parseFloat(document.getElementById(`${drug}-weight`).value);
    const wtDisp    = wtUnit === 'lb' ? `${rawWt} lb (${weightKg.toFixed(2)} kg)` : `${weightKg.toFixed(2)} kg`;

    document.getElementById(`${drug}-fwd-value`).textContent = `${mgKgDay.toFixed(2)} mg/kg/day`;
    document.getElementById(`${drug}-fwd-breakdown`).innerHTML =
      `Dose: ${doseDisp}<br>Per dose: ${mgKgDose.toFixed(2)} mg/kg · ${freqLabel} · ${wtDisp}<br>
       <span class="range-indicator ${cls}">${label}</span>`;
    box.classList.add('show');
    box.style.display = 'block';
  }

  /* ──────────────────────────────────────────────────────────
     REVERSE CALCULATOR
     Given: target mg/kg/day, weight, concentration
     Output: mL and mg per dose for each frequency option (BID/TID/QID)
  ────────────────────────────────────────────────────────── */
  function calcReverse(drug) {
    const weightKg = getWeightKg(drug, 'rev');
    const target   = parseFloat(document.getElementById(`${drug}-rev-target`).value);
    /* Amox uses a preset toggle stored in state; ceph uses a free number input */
    const conc     = drug === 'amox'
      ? state.amox.revConc
      : parseFloat(document.getElementById(`${drug}-rev-conc`).value);
    const box      = document.getElementById(`${drug}-rev-result`);

    box.classList.remove('error-box');

    if (isNaN(weightKg) || weightKg <= 0) return showRevErr(box, drug, 'Enter a valid weight.');
    if (isNaN(target)   || target   <= 0) return showRevErr(box, drug, 'Enter a target mg/kg/day.');
    if (isNaN(conc)     || conc     <= 0) return showRevErr(box, drug, 'Enter a valid concentration.');

    const totalMgDay = target * weightKg; // total daily mg needed

    // Cephalexin supports QID; Amoxicillin goes up to TID
    const freqs = drug === 'ceph'
      ? [{ label: 'BID', n: 2 }, { label: 'TID', n: 3 }, { label: 'QID', n: 4 }]
      : [{ label: 'BID', n: 2 }, { label: 'TID', n: 3 }];

    // Build one result row per frequency
    let rowsHTML = '';
    freqs.forEach(({ label, n }) => {
      const mgPerDose = totalMgDay / n;
      const mLPerDose = mgPerDose / conc;
      rowsHTML += `
        <div class="rev-row">
          <span class="rev-row-label">${label} (${n}×/day)</span>
          <span class="rev-row-value">${mLPerDose.toFixed(2)} mL &nbsp;/&nbsp; ${mgPerDose.toFixed(1)} mg</span>
        </div>`;
    });

    const rawWt  = parseFloat(document.getElementById(`${drug}-rev-weight`).value);
    const wtDisp = state[drug].revWtUnit === 'lb'
      ? `${rawWt} lb (${weightKg.toFixed(2)} kg)`
      : `${weightKg.toFixed(2)} kg`;
    const { label: rLabel, cls: rCls } = rangeTag(drug, target);

    document.getElementById(`${drug}-rev-rows`).innerHTML = rowsHTML;
    document.getElementById(`${drug}-rev-breakdown`).innerHTML =
      `Total/day: ${totalMgDay.toFixed(1)} mg · Conc: ${conc} mg/mL · Wt: ${wtDisp}<br>
       <span class="range-indicator ${rCls}">${rLabel}</span>`;
    box.classList.add('show');
    box.style.display = 'block';
  }

  /* ──────────────────────────────────────────────────────────
     ERROR DISPLAY HELPERS
  ────────────────────────────────────────────────────────── */

  /* Used by the forward calculator */
  function showErr(box, valueId, msg) {
    box.classList.add('show', 'error-box');
    box.style.display = 'block';
    document.getElementById(valueId).textContent = msg;
    const bd = box.querySelector('.result-breakdown');
    if (bd) bd.innerHTML = '';
  }

  /* Used by the reverse calculator (no single result-value element) */
  function showRevErr(box, drug, msg) {
    box.classList.add('show', 'error-box');
    box.style.display = 'block';
    document.getElementById(`${drug}-rev-rows`).innerHTML =
      `<div style="font-family:'DM Mono',monospace;font-size:0.82rem;color:var(--error);padding:4px 0">${msg}</div>`;
    document.getElementById(`${drug}-rev-breakdown`).innerHTML = '';
  }

