/* =====================================================================
   7) UI — render. Consume STATE/PLAN/ENGINE, no decide nada por su cuenta.
===================================================================== */
const CATEGORY_LABEL = {running:'Running', test:'Test', carrera:'Carrera', rest:'Descanso', complementary:'Actividad complementaria'};
const CATEGORY_ICON = {running:'🏃', test:'⏱️', carrera:'🏁', rest:'😴', complementary:'🏋️'};
const READINESS_CLASS = {READY:'readiness-green', CAUTION:'readiness-yellow', DELOAD:'readiness-orange', STOP:'readiness-red'};

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(()=>t.classList.remove('show'), 1800);
}

function showConfirm(title, body, onConfirm){
  const overlay = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmBody').textContent = body;
  overlay.classList.add('show');
  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');
  const cleanup = ()=>{ overlay.classList.remove('show'); okBtn.removeEventListener('click', okHandler); cancelBtn.removeEventListener('click', cancelHandler); };
  const okHandler = ()=>{ cleanup(); onConfirm(); };
  const cancelHandler = ()=>{ cleanup(); };
  okBtn.addEventListener('click', okHandler);
  cancelBtn.addEventListener('click', cancelHandler);
}

function allSessions(){ return flattenPlan(state.planCurrent); }
function sessionForDate(iso){ return allSessions().find(s=>s.date===iso); }
function nextUpcomingRunning(fromIso){
  return allSessions().find(s=> s.date>fromIso && (s.category==='running'||s.category==='test'||s.category==='carrera'));
}

/* ---- 7a) Tarjeta de sesión (reutilizada en Hoy y Plan) ---- */
function renderSessionCard(s, opts){
  opts = opts||{};
  const loggable = (s.category==='running'||s.category==='test'||s.category==='carrera');
  const result = loggable ? getResult(s.id) : null;
  const done = !!(result && result.status);

  const wrap = document.createElement('div');
  wrap.className = 'km-post';
  const stick = document.createElement('div');
  stick.className = 'post-stick type-'+(s.category==='complementary'?'hipertrofia':s.category);
  wrap.appendChild(stick);

  const card = document.createElement('div');
  card.className = 'sess'+(done?' done':'')+(s.category==='complementary'?' strength':'')+(s.category==='rest'?' restday':'');
  card.style.flex='1';

  const title = s.title || (s.category==='complementary' ? 'Día libre' : 'Descanso');

  const head = document.createElement('div');
  head.className='sesshead';
  head.innerHTML = `
    <div>
      <span class="tag type-${s.category==='complementary'?'hipertrofia':s.category}">${CATEGORY_ICON[s.category]} ${CATEGORY_LABEL[s.category]}</span>
      <div class="sesstitle">${title}${s.deloadWeek?' <span style="color:var(--gold);font-size:11px;">· descarga</span>':''}</div>
      <div class="sessdate">${DOW_LABEL[parseISO(s.date).getDay()]} · ${fmtDateShort(s.date)}${opts.showWeek?(' · Semana '+s.week):''}</div>
    </div>
  `;
  if(loggable){
    const statusDot = document.createElement('div');
    if(done){
      const map = {completed:'✓', partial:'½', missed:'✕'};
      statusDot.className = 'checkbtn checked';
      statusDot.textContent = map[result.status]||'✓';
    } else {
      statusDot.className = 'checkbtn';
    }
    head.appendChild(statusDot);
  }
  card.appendChild(head);

  if(s.category==='complementary'){
    const mb = document.createElement('div');
    mb.className='sessblock';
    mb.innerHTML = `<b>Recomendación:</b> ${complementRecommendation(s)}`;
    card.appendChild(mb);
    wrap.appendChild(card);
    return wrap;
  }
  if(s.category==='rest'){
    const mb = document.createElement('div');
    mb.className='sessblock';
    mb.innerHTML = 'Descanso completo. Es parte del plan, no un extra.';
    card.appendChild(mb);
    wrap.appendChild(card);
    return wrap;
  }

  const p = s.planned || {};
  const meta = document.createElement('div');
  meta.className='sessmeta';
  const displayedDuration=p.totalDurationMin||p.duration;
  if(displayedDuration) meta.innerHTML += `<span class="chip">⏱ <b>${displayedDuration} min total</b></span>`;
  if(p.rpe&&state.profile.trainingKnowledge==='tecnico') meta.innerHTML += `<span class="chip">RPE <b>${p.rpe}</b></span>`;
  if(p.surface) meta.innerHTML += `<span class="chip">${p.surface}</span>`;
  card.appendChild(meta);

  if(Array.isArray(p.blocks)&&p.blocks.length){
    const grid=document.createElement('div');grid.className='workout-grid';
    p.blocks.forEach(block=>{const el=document.createElement('div');el.className='workout-block '+(block.role==='main'?'main':'');const label=document.createElement('div');label.className='workout-label';label.textContent=block.label;const txt=document.createElement('div');txt.className='workout-text';txt.textContent=block.text;el.append(label,txt);grid.appendChild(el);});
    card.appendChild(grid);
  }else if(p.main){
    const mb = document.createElement('div');mb.className='sessblock';mb.innerHTML = `<b>Qué vas a hacer:</b> ${p.main}`;card.appendChild(mb);
  }
  if(p.how||p.feel||p.fallback){
    const guide=document.createElement('div');guide.className='workout-guide';
    [['Cómo hacerlo',p.how],['Qué deberías sentir',p.feel],['Si te cuesta',p.fallback]].forEach(([label,value])=>{if(!value)return;const row=document.createElement('div'),b=document.createElement('b');b.textContent=label;row.appendChild(b);row.appendChild(document.createTextNode(value));guide.appendChild(row);});
    card.appendChild(guide);
  }
  if(p.condition){
    const cb = document.createElement('div');
    cb.className='condition-banner';
    cb.innerHTML = '⚠ Condicionado: '+p.condition;
    card.appendChild(cb);
  }
  if(s.adapted && s.adaptedReason){
    const ab = document.createElement('div');
    ab.className='adapted-badge';
    ab.textContent = '🔧 Sesión adaptada';
    card.appendChild(ab);
    const dl = document.createElement('div');
    dl.className='diffline';
    dl.textContent = s.adaptedReason + (s.plannedOriginal && s.plannedOriginal.duration ? ' (planificado originalmente: '+s.plannedOriginal.duration+' min)' : '');
    card.appendChild(dl);
  }

  if(p.goal || p.why || p.notes || (!p.blocks&&(p.warmup||p.cooldown))){
    const det = document.createElement('details');
    det.className='details';
    det.innerHTML = `<summary>Ver más detalles</summary>`;
    const db = document.createElement('div');
    db.className='sessblock';
    let html='';
    if(!p.blocks&&p.warmup) html += `<p><b>Calentamiento:</b> ${p.warmup}</p>`;
    if(!p.blocks&&p.cooldown) html += `<p><b>Enfriamiento:</b> ${p.cooldown}</p>`;
    if(p.goal) html += `<p><b>Objetivo de la sesión:</b> ${p.goal}</p>`;
    if(p.why) html += `<p><b>Por qué está en tu plan:</b> ${p.why}</p>`;
    db.innerHTML = html;
    det.appendChild(db);
    if(p.notes){
      const nb = document.createElement('div');
      nb.className='sessnote';
      nb.textContent = p.notes;
      det.appendChild(nb);
    }
    card.appendChild(det);
  }

  card.appendChild(buildQuickLog(s, result));
  wrap.appendChild(card);
  return wrap;
}

/* ---- 7b) Recomendación genérica para días complementarios ---- */
function complementRecommendation(session){
  const all = allSessions();
  const idx = all.findIndex(s=>s.id===session.id);
  let prevRun=null, nextRun=null;
  for(let i=idx-1;i>=0 && i>idx-4;i--){ if(['running','test','carrera'].includes(all[i].category)){ prevRun=all[i]; break; } }
  for(let i=idx+1;i<all.length && i<idx+4;i++){ if(['running','test','carrera'].includes(all[i].category)){ nextRun=all[i]; break; } }
  const HARD = ['LONG_EASY','FARTLEK','PROGRESSION','HILLS','TEMPO','THRESHOLD','INTERVALS','SHORT_INTERVALS','LONG_INTERVALS','RACE_PACE','TEST','RACE'];
  const actLabel = (state.activities&&state.activities.length) ? state.activities.map(a=>a.type).join(', ') : 'tus actividades complementarias';

  if(nextRun && daysBetween(session.date, nextRun.date)<=1 && HARD.includes(nextRun.subtype)){
    return `Mañana tienes "${nextRun.title}", una sesión de running exigente. Si vas a entrenar (${actLabel}), evita tren inferior pesado hoy.`;
  }
  if(prevRun && HARD.includes(prevRun.subtype)){
    return `Tu última sesión exigente de running ("${prevRun.title}") ya quedó atrás. Buen momento para tren inferior si te encuentras recuperado.`;
  }
  return `Día flexible para ${actLabel}: no hay ninguna sesión de running exigente cerca.`;
}

function f14DifficultyToRpe(value){return ({muy_facil:2,bien:4,dificil:7,demasiado:9})[value]||null}

/* ---- 7c) Registro rápido: ¿Completaste? Sí / Parcial / No ---- */
function buildQuickLog(s, result){
  const wrap = document.createElement('div');
  wrap.className = 'logbox';
  wrap.style.marginTop='12px';
  wrap.style.paddingTop='12px';
  wrap.style.borderTop='1px dashed var(--line)';

  const status = result ? result.status : null;
  const qHead = document.createElement('div');
  qHead.innerHTML = '<label style="font-size:10.5px;color:var(--chalk-dim);text-transform:uppercase;display:block;margin-bottom:6px;">¿Completaste esta sesión?</label>';
  wrap.appendChild(qHead);

  const btnRow = document.createElement('div');
  btnRow.className='quickbtns';
  const options = [['completed','Sí','sel-yes'],['partial','Parcial','sel-partial'],['missed','No','sel-no']];
  options.forEach(([val,label,cls])=>{
    const b = document.createElement('button');
    b.className = 'quickbtn '+cls+(status===val?' active':'');
    b.textContent = label;
    b.onclick = ()=>{
      renderDetailFields(s, val, result);
    };
    btnRow.appendChild(b);
  });
  wrap.appendChild(btnRow);

  const detailHolder = document.createElement('div');
  detailHolder.className = 'quickDetailHolder';
  wrap.appendChild(detailHolder);

  function renderDetailFields(session, selStatus, prevResult){
    // refresca los estilos de los botones activos
    Array.from(btnRow.children).forEach((b,i)=> b.classList.toggle('active', options[i][0]===selStatus));
    detailHolder.innerHTML = '';
    const r = prevResult || {};
    if(selStatus==='missed'){
      detailHolder.innerHTML = `
        <div class="field">
          <label>Motivo</label>
          <select class="inReason">
            <option value="falta_tiempo" ${r.missedReason==='falta_tiempo'?'selected':''}>Falta de tiempo</option>
            <option value="fatiga" ${r.missedReason==='fatiga'?'selected':''}>Fatiga</option>
            <option value="molestias" ${r.missedReason==='molestias'?'selected':''}>Molestias</option>
            <option value="clima" ${r.missedReason==='clima'?'selected':''}>Clima</option>
            <option value="motivacion" ${r.missedReason==='motivacion'?'selected':''}>Motivación</option>
            <option value="otro" ${r.missedReason==='otro'?'selected':''}>Otro</option>
          </select>
        </div>
        <div class="field"><label>Notas (opcional)</label><textarea class="inNotes">${r.notes||''}</textarea></div>
        <button class="bigbtn secondary saveBtn">Guardar</button>
      `;
    } else {
      detailHolder.innerHTML = `
        <div class="formrow2">
          <div class="field"><label>Distancia (km)</label><input type="number" step="0.01" inputmode="decimal" class="inDist" value="${r.distance??''}"></div>
          <div class="field"><label>Tiempo (min)</label><input type="number" step="0.1" inputmode="decimal" class="inTime" value="${r.duration??''}"></div>
        </div>
        <div class="paceOut">Ritmo calculado: <span class="paceCalc">--</span> /km</div>
        <div class="formrow2">
          <div class="field"><label>¿Cómo te ha resultado?</label><select class="inDifficulty"><option value="">--</option><option value="muy_facil" ${r.perceivedDifficulty==='muy_facil'?'selected':''}>Muy fácil</option><option value="bien" ${r.perceivedDifficulty==='bien'?'selected':''}>Bien</option><option value="dificil" ${r.perceivedDifficulty==='dificil'?'selected':''}>Difícil</option><option value="demasiado" ${r.perceivedDifficulty==='demasiado'?'selected':''}>Demasiado difícil</option></select></div>
          <div class="field"><label>¿Podrías haber seguido un poco más?</label><select class="inContinue"><option value="">--</option><option value="si" ${r.couldContinue==='si'?'selected':''}>Sí</option><option value="no" ${r.couldContinue==='no'?'selected':''}>No</option></select></div>
        </div>
        <div class="formrow2">
          ${state.profile.trainingKnowledge==='tecnico'?`<div class="field"><label>RPE (1-10, opcional)</label><input type="number" min="1" max="10" class="inRpe" value="${r.rpe??''}"></div>`:''}
          <div class="field"><label>¿Has tenido molestias?</label><select class="inPain"><option value="no" ${!r.hadPain?'selected':''}>No</option><option value="si" ${r.hadPain?'selected':''}>Sí</option></select></div>
          <div class="field"><label>Molestia (0-10, opcional)</label><input type="number" min="0" max="10" class="inDiscomfort" value="${r.discomfort??0}"></div>
        </div>
        <div class="formrow2">
          <div class="field"><label>Sensaciones</label>
            <select class="inFeel">
              <option value="">--</option>
              <option ${r.sensations==='genial'?'selected':''} value="genial">Genial</option>
              <option ${r.sensations==='bien'?'selected':''} value="bien">Bien</option>
              <option ${r.sensations==='normal'?'selected':''} value="normal">Normal</option>
              <option ${r.sensations==='duro'?'selected':''} value="duro">Duro</option>
            </select>
          </div>
          <div class="field"><label>Fatiga</label>
            <select class="inFatiga">
              <option value="baja" ${r.fatigue==='baja'?'selected':''}>Baja</option>
              <option value="media" ${r.fatigue==='media'?'selected':''}>Media</option>
              <option value="alta" ${r.fatigue==='alta'?'selected':''}>Alta</option>
            </select>
          </div>
        </div>
        <div class="field"><label>Notas (opcional)</label><textarea class="inNotes">${r.notes||''}</textarea></div>
        <button class="bigbtn saveBtn">${selStatus==='completed'?'Guardar como completada':'Guardar como parcial'}</button>
      `;
      const inDist = detailHolder.querySelector('.inDist');
      const inTime = detailHolder.querySelector('.inTime');
      const paceCalc = detailHolder.querySelector('.paceCalc');
      function upd(){
        const d=parseFloat(inDist.value), t=parseFloat(inTime.value);
        paceCalc.textContent = (d>0&&t>0)? minToPaceStr(t/d) : '--';
      }
      upd();
      inDist.addEventListener('input', upd);
      inTime.addEventListener('input', upd);
    }

    detailHolder.querySelector('.saveBtn').onclick = ()=>{
      let patch = { status: selStatus };
      if(selStatus==='missed'){
        patch.missedReason = detailHolder.querySelector('.inReason').value;
        patch.notes = detailHolder.querySelector('.inNotes').value;
      } else {
        const d = parseFloat(detailHolder.querySelector('.inDist').value)||null;
        const t = parseFloat(detailHolder.querySelector('.inTime').value)||null;
        patch.distance = d; patch.duration = t;
        patch.pace = (d>0&&t>0) ? minToPaceStr(t/d) : null;
        patch.perceivedDifficulty=detailHolder.querySelector('.inDifficulty').value||null;
        patch.couldContinue=detailHolder.querySelector('.inContinue').value||null;
        patch.hadPain=detailHolder.querySelector('.inPain').value==='si';
        patch.rpe = detailHolder.querySelector('.inRpe')?.value || f14DifficultyToRpe(patch.perceivedDifficulty);
        patch.discomfort = patch.hadPain ? (parseInt(detailHolder.querySelector('.inDiscomfort').value)||0) : 0;
        patch.sensations = detailHolder.querySelector('.inFeel').value;
        patch.fatigue = detailHolder.querySelector('.inFatiga').value;
        patch.notes = detailHolder.querySelector('.inNotes').value;
      }
      setResult(session, patch);
      toast('Registro guardado');
      renderAll();
    };
  }

  if(status) renderDetailFields(s, status, result);
  return wrap;
}

/* ---- 7d) Pestaña HOY ---- */
function f12StatusLabel(status){return ({planned:'Planificada',active:'En preparación',completed:'Completada',archived:'Archivada'})[status]||status}
function f12CycleLabel(status){return ({preparation:'Preparación',race_week:'Semana de carrera',post_race:'Post-carrera',recovery:'Recuperación',completed:'Completado'})[status]||status}
function f12RaceTarget(r){if(r.targetPaceMinKm)return minToPaceStr(r.targetPaceMinKm)+'/km';if(r.targetTimeSec){const total=Math.round(r.targetTimeSec),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=String(total%60).padStart(2,'0');return h?h+':'+String(m).padStart(2,'0')+':'+s:m+':'+s;}return 'Completar'}
function f13_2_openRaceForm(){
  document.querySelector('.tabbtn[data-tab="carreras"]').click();
  document.getElementById('r_name').focus();
}
function renderActiveRace(){
  const box=document.getElementById('activeRaceCard'); if(!box)return;
  const r=f12ActiveRace(), c=f12ActiveCycle(); if(!r){box.innerHTML='<h2>Bienvenido a Made2Run</h2><p>Crea tu primera carrera para empezar.</p><button class="smallbtn primary" id="firstRaceBtn">Crear mi primera carrera</button>';document.getElementById('firstRaceBtn').onclick=f13_2_openRaceForm;return;}
  const feasibility=state.planCurrent?.meta?.feasibility;
  const feasibilityNotice=feasibility&&feasibility.status!=='viable'?`<div class="condition-banner">⚠ ${escapeHtml(feasibility.reason)} El plan prioriza construir base y propone una estrategia conservadora; revisa la fecha o el objetivo si quieres llegar con más margen.</div>`:'';
  box.innerHTML=`<h2>Carrera activa</h2><div class="race-active-main"><div><div class="race-title">${escapeHtml(r.name)}</div><div class="race-meta">${formatDistanceKm(r.distanceKm)} · ${r.date?fmtDateShort(r.date)+' '+parseISO(r.date).getFullYear():'Sin fecha'}<br>Objetivo: ${f12RaceTarget(r)} · ${r.priority==='primary'?'Principal':'Secundaria'}<br>Ciclo: ${f12CycleLabel(c&&c.status||'preparation')}</div></div><span class="race-status">${f12StatusLabel(r.status)}</span></div>${feasibilityNotice}<button class="smallbtn" id="openRacesBtn" style="margin-top:12px;">Cambiar o gestionar carreras</button>`;
  document.getElementById('openRacesBtn').onclick=()=>document.querySelector('.tabbtn[data-tab="carreras"]').click();
}
function renderRaces(){
  const list=document.getElementById('raceList'), form=document.getElementById('raceForm'); if(!list||!form)return;
  f12EnsureState();
  list.innerHTML=state.races.map(r=>{const c=state.raceCycles[r.id]||f12NewCycle(r);const active=r.id===state.activeRaceId;return `<div class="race-list-item ${active?'active':''}"><div class="race-list-head"><div><div class="race-list-name">${escapeHtml(r.name)}</div><div class="race-list-meta">${formatDistanceKm(r.distanceKm)} · ${r.date?fmtDateShort(r.date):'Sin fecha'} · ${f12RaceTarget(r)}<br>${r.priority==='primary'?'Principal':'Secundaria'} · ${f12StatusLabel(r.status)} · ${f12CycleLabel(c.status)}</div></div>${active?'<span class="race-status">Activa</span>':''}</div><div class="race-actions">${!active?`<button class="smallbtn primary" data-race-select="${escapeHtml(r.id)}">Seleccionar</button>`:'<button class="smallbtn" disabled>Seleccionada</button>'}${r.status!=='completed'?`<button class="smallbtn" data-race-complete="${escapeHtml(r.id)}">Completar</button>`:`<button class="smallbtn" data-race-restart="${escapeHtml(r.id)}">Nuevo ciclo</button>`}</div></div>`;}).join('');
  list.querySelectorAll('[data-race-select]').forEach(b=>b.onclick=()=>{f12SetActiveRace(b.dataset.raceSelect);ensurePlan();saveState();toast('Carrera activa actualizada');renderAll();});
  list.querySelectorAll('[data-race-complete]').forEach(b=>b.onclick=()=>{f12CompleteRace(b.dataset.raceComplete);saveState();toast('Carrera marcada como completada');renderAll();});
  list.querySelectorAll('[data-race-restart]').forEach(b=>b.onclick=()=>{f12StartNewCycle(b.dataset.raceRestart);ensurePlan();saveState();toast('Nuevo ciclo iniciado');renderAll();});
  form.innerHTML=`<div class="formrow2"><div class="field"><label>Nombre</label><input id="r_name" placeholder="Ej. 15 km primavera"></div><div class="field"><label>Distancia (km)</label><input type="number" min="0.5" max="200" step="0.001" id="r_distance" value="10"></div></div><div class="field"><label>Fecha</label><input type="date" id="r_date"></div><div class="formrow2"><div class="field"><label>Ritmo objetivo (mm:ss/km)</label><input type="text" inputmode="numeric" pattern="\\d{1,2}:\\d{2}" id="r_pace" placeholder="05:45"><div class="fieldhint">Usa mm:ss, por ejemplo 05:45. Los valores decimales antiguos se siguen leyendo (5.45 equivale a 5:27).</div></div><div class="field"><label>Tiempo objetivo (min)</label><input type="number" min="1" step="1" id="r_time" placeholder="55"></div></div><div class="field"><label>Prioridad</label><select id="r_priority"><option value="primary">Principal</option><option value="secondary" selected>Secundaria</option></select><div class="fieldhint">La carrera se crea con su propio ciclo y plan. El historial del atleta sigue siendo común.</div></div><button class="smallbtn primary" id="addRaceBtn">Añadir y seleccionar carrera</button>`;
  document.getElementById('addRaceBtn').onclick=()=>{const distance=normalizeDistanceKm(document.getElementById('r_distance').value,null),date=document.getElementById('r_date').value,paceText=document.getElementById('r_pace').value.trim(),timeMin=Number(document.getElementById('r_time').value)||null;if(distance==null||!f12ValidDate(date)){toast('Indica una distancia entre 0,5 y 200 km y una fecha válida');return;}const paceSec=f12ParsePace(paceText);if(paceText&&!paceSec){toast('Introduce el ritmo como mm:ss, por ejemplo 05:45');return;}if(timeMin!=null&&(!Number.isFinite(timeMin)||timeMin<=0)){toast('El tiempo objetivo debe ser positivo');return;}const r=f12CreateRace({name:document.getElementById('r_name').value.trim()||formatDistanceKm(distance),distanceKm:distance,date,targetPaceSecPerKm:paceSec,targetTimeSec:timeMin?Math.round(timeMin*60):null,priority:document.getElementById('r_priority').value});f12SetActiveRace(r.id);ensurePlan();saveState();toast('Carrera creada con un ciclo independiente');renderAll();};
}
function renderStatusBar(){
  const iso = todayISO();
  const bar = document.getElementById('statusBar');
  bar.innerHTML = '';
  const s = sessionForDate(iso);
  const w = s ? state.planCurrent.weeks.find(w=>w.n===s.week) : null;
  if(w){
    const p = document.createElement('span');
    p.className='pill phase';
    p.textContent = w.phaseLabel;
    bar.appendChild(p);
    if(w.deload){
      const d = document.createElement('span');
      d.className='pill deload';
      d.textContent = '🟡 Semana de descarga';
      bar.appendChild(d);
    }
  }
  const readiness = computeReadiness(allSessions(), state.results, iso, getCheckin(iso));
  const rp = document.createElement('span');
  rp.className = 'readiness-pill '+READINESS_CLASS[readiness.level];
  rp.innerHTML = readiness.emoji+' '+readiness.label;
  rp.title = readiness.reason;
  bar.appendChild(rp);
}

function renderRing(){
  const iso = todayISO();
  let daysLeft = daysBetween(iso, state.goal.date);
  const totalDays = daysBetween(state.goal.startDate, state.goal.date);
  if(daysLeft<0) daysLeft=0;
  document.getElementById('daysLeft').textContent = daysLeft;
  const elapsed = Math.min(Math.max(daysBetween(state.goal.startDate, iso),0), totalDays);
  const frac = totalDays>0 ? elapsed/totalDays : 0;
  const circumference = 2*Math.PI*42;
  const ring = document.getElementById('ringProg');
  ring.setAttribute('stroke-dasharray', circumference.toFixed(1));
  ring.setAttribute('stroke-dashoffset', (circumference*(1-frac)).toFixed(1));
  document.getElementById('goalLine').innerHTML = 'Meta: <b>'+formatDistanceKm(state.goal.distanceKm)+' · '+fmtDateShort(state.goal.date)+' '+parseISO(state.goal.date).getFullYear()+'</b>';
}

function renderEstimate(){
  const iso = todayISO();
  const est = estimateCapacity(allSessions(), state.results, state.goal, iso);
  document.getElementById('estHeadline').textContent = 'Capacidad estimada: '+est.headline;
  let statusLine = '';
  if(state.goal.type!=='completar'){
    statusLine = 'Objetivo: '+state.goal.targetPaceLabel+'/km — Estado: '+(est.status||'--');
  } else {
    statusLine = 'Objetivo: completar '+formatDistanceKm(state.goal.distanceKm)+' (sin marca exigida).';
  }
  document.getElementById('estConfidence').textContent = statusLine+' · '+(est.confidence||'');
  document.getElementById('estRationale').textContent = est.rationale||'';

  const row = document.getElementById('scenarioRow');
  row.innerHTML = '';
  const scenarios = [
    {key:'A', emoji:'🟢', label:'Objetivo A', sub: state.goal.targetPaceLabel+'/km'},
    {key:'B', emoji:'🟡', label:'Objetivo B', sub:'ritmo conservador'},
    {key:'C', emoji:'🔴', label:'Objetivo C', sub:'terminar seguro'},
  ];
  scenarios.forEach(sc=>{
    const chip = document.createElement('div');
    chip.className = 'scenariochip'+(est.scenario===sc.key?' active':'');
    chip.innerHTML = `<b>${sc.emoji} ${sc.label}</b>${sc.sub}`;
    row.appendChild(chip);
  });
}

/* ---- 7d-bis) Check-in diario (Fase 9) ---- */
const CHECKIN_SLEEP = [['mal','😴 Mal'],['regular','😐 Regular'],['bien','😊 Bien']];
const CHECKIN_FATIGUE = [['baja','Baja'],['media','Media'],['alta','Alta']];
const CHECKIN_FEELING = [['mal','Mal'],['regular','Regular'],['bien','Bien']];

function readinessAdvice(readiness, todaySession){
  const hasRunToday = todaySession && ['running','test','carrera'].includes(todaySession.category);
  const base = {
    READY:   'Buen estado para entrenar hoy.',
    CAUTION: 'Puedes entrenar, pero con cautela.',
    DELOAD:  'Mejor reduce la carga de hoy.',
    STOP:    'No fuerces la sesión de hoy.',
  }[readiness.level];
  let extra = '';
  if(hasRunToday){
    extra = {
      READY:   ' Sigue tu sesión de hoy ("'+todaySession.title+'") tal como está planificada.',
      CAUTION: ' Si tu sesión de hoy ("'+todaySession.title+'") es exigente, considera bajarla a esfuerzo fácil o acortarla.',
      DELOAD:  ' Sustituye "'+todaySession.title+'" por un rodaje suave, bici/elíptica, o acórtala bastante.',
      STOP:    ' Aplaza la sesión "'+todaySession.title+'" y prioriza el descanso; si las molestias persisten, valora consultar con un profesional.',
    }[readiness.level];
  } else {
    extra = ' Hoy no tienes running programado, pero esto también te sirve de referencia para el resto del día.';
  }
  return base+extra;
}

function renderCheckin(){
  const card = document.getElementById('checkinCard');
  if(!card) return;
  const iso = todayISO();
  const existing = getCheckin(iso);
  const todaySession = sessionForDate(iso);

  function currentReadiness(draft){
    return computeReadiness(allSessions(), state.results, iso, draft || existing);
  }

  function renderBanner(readiness){
    return `
      <div class="readiness-banner ${readiness.level}">
        <div class="rb-title">${readiness.emoji} ${readiness.label}</div>
        <div class="rb-text">${readinessAdvice(readiness, todaySession)}</div>
      </div>`;
  }

  if(existing){
    const labelOf = (arr,v)=> (arr.find(x=>x[0]===v)||[,v])[1];
    card.innerHTML = `
      <h2>Check-in de hoy</h2>
      <div class="checkin-summary">
        Sueño ${labelOf(CHECKIN_SLEEP, existing.sleep)} · Fatiga ${labelOf(CHECKIN_FATIGUE, existing.fatigue)} ·
        Molestias ${existing.discomfort}/10 · Sensación general ${labelOf(CHECKIN_FEELING, existing.feeling)}
      </div>
      ${renderBanner(currentReadiness())}
      <button class="smallbtn" id="editCheckinBtn" style="margin-top:10px;">Editar check-in</button>
    `;
    document.getElementById('editCheckinBtn').onclick = ()=>{ renderCheckinForm(card, iso, existing, todaySession); };
  } else {
    renderCheckinForm(card, iso, null, todaySession);
  }
}

function renderCheckinForm(card, iso, existing, todaySession){
  const draft = Object.assign({sleep:'regular', fatigue:'baja', discomfort:0, feeling:'bien'}, existing||{});
  card.innerHTML = `
    <h2>Check-in de hoy</h2>
    <div class="field"><label>¿Cómo has dormido?</label>
      <div class="checkin-row" id="ci_sleep">
        ${CHECKIN_SLEEP.map(([v,l])=>`<div class="checkin-chip ${draft.sleep===v?'active':''}" data-v="${v}">${l}</div>`).join('')}
      </div>
    </div>
    <div class="field"><label>Fatiga acumulada</label>
      <div class="checkin-row" id="ci_fatigue">
        ${CHECKIN_FATIGUE.map(([v,l])=>`<div class="checkin-chip ${draft.fatigue===v?'active':''}" data-v="${v}">${l}</div>`).join('')}
      </div>
    </div>
    <div class="field"><label>Molestias / dolor (0-10)</label>
      <input type="number" min="0" max="10" id="ci_discomfort" value="${draft.discomfort}">
    </div>
    <div class="field"><label>Sensación general de preparación</label>
      <div class="checkin-row" id="ci_feeling">
        ${CHECKIN_FEELING.map(([v,l])=>`<div class="checkin-chip ${draft.feeling===v?'active':''}" data-v="${v}">${l}</div>`).join('')}
      </div>
    </div>
    <button class="bigbtn" id="saveCheckinBtn">Guardar check-in</button>
  `;
  function wireGroup(id, key){
    card.querySelectorAll('#'+id+' .checkin-chip').forEach(chip=>{
      chip.onclick = ()=>{
        draft[key] = chip.dataset.v;
        card.querySelectorAll('#'+id+' .checkin-chip').forEach(c=>c.classList.toggle('active', c===chip));
      };
    });
  }
  wireGroup('ci_sleep','sleep');
  wireGroup('ci_fatigue','fatigue');
  wireGroup('ci_feeling','feeling');

  document.getElementById('saveCheckinBtn').onclick = ()=>{
    draft.discomfort = Math.max(0, Math.min(10, parseInt(document.getElementById('ci_discomfort').value)||0));
    setCheckin(iso, draft);
    toast('Check-in guardado');
    renderCheckin();
    renderStatusBar();
  };
}

function renderTodayNext(){
  const iso = todayISO();
  const todayCard = document.getElementById('todayCard');
  const nextCard = document.getElementById('nextCard');
  todayCard.innerHTML=''; nextCard.innerHTML='';

  const h1 = document.createElement('h2');
  h1.style.cssText='font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--chalk-dim);margin:4px 0 8px;';
  h1.textContent='Hoy';
  todayCard.appendChild(h1);

  const sToday = sessionForDate(iso);
  if(sToday){
    todayCard.appendChild(renderSessionCard(sToday));
  } else {
    const box=document.createElement('div');
    box.className='card empty';
    box.textContent = iso<state.goal.startDate ? 'El plan empieza el '+fmtDateShort(state.goal.startDate)+'.' :
                       iso>state.goal.date ? '¡El plan ha terminado! Espero que la carrera fuera genial 🏁' :
                       'Hoy no hay sesión programada.';
    todayCard.appendChild(box);
  }
  const sNext = nextUpcomingRunning(iso);
  if(sNext){
    const h2=document.createElement('h2');
    h2.style.cssText='font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--chalk-dim);margin:16px 0 8px;';
    h2.textContent='Próximo entrenamiento';
    nextCard.appendChild(h2);
    nextCard.appendChild(renderSessionCard(sNext));
  }
}

function renderAdherence(){
  const iso = todayISO();
  const adh = computeAdherence(allSessions(), state.results, iso);
  const box = document.getElementById('adherenceBox');
  if(!box) return;
  const rate = adh.rate!=null ? Math.round(adh.rate*100)+'%' : '--';
  const total = adh.completed+adh.partial+adh.missed || 1;
  box.innerHTML = `
    <div class="statgrid" style="margin-bottom:8px;">
      <div class="stat"><div class="v">${rate}</div><div class="l">Adherencia</div></div>
      <div class="stat"><div class="v">${adh.completed}/${adh.planned}</div><div class="l">Completadas</div></div>
    </div>
    <div class="adhbar-row">
      <div class="adhbar-seg" style="width:${adh.completed/total*100}%;background:var(--moss);"></div>
      <div class="adhbar-seg" style="width:${adh.partial/total*100}%;background:var(--gold);"></div>
      <div class="adhbar-seg" style="width:${adh.missed/total*100}%;background:var(--race);"></div>
    </div>
    <div class="adhlegend">
      <span><i class="dot2" style="background:var(--moss);"></i>Completadas (${adh.completed})</span>
      <span><i class="dot2" style="background:var(--gold);"></i>Parciales (${adh.partial})</span>
      <span><i class="dot2" style="background:var(--race);"></i>Omitidas (${adh.missed})</span>
    </div>
  `;
}

function renderWeight(){
  const input = document.getElementById('weightInput');
  const last = state.weights[state.weights.length-1];
  input.value = last?.weight ?? ''; 
  document.getElementById('weightInitial').textContent = state.profile.weightKg?state.profile.weightKg+' kg':'--';
  document.getElementById('weightGoal').textContent = state.profile.weightGoalKg?'~'+state.profile.weightGoalKg+' kg':'--';
  input.onchange = ()=>{
    const v = parseFloat(input.value);
    if(!v||v<30||v>300) return;
    setWeight(v);
    toast('Peso actualizado');
    renderCharts();
  };
}

/* ---- 7e) Pestaña PLAN ---- */
function renderDirtyBanner(){
  const el = document.getElementById('dirtyBanner');
  if(!el) return;
  if(state.configDirty){
    el.innerHTML = `<div class="dirty-banner">Tu configuración ha cambiado. ¿Quieres recalcular el plan futuro? <button id="recalcBtn">Recalcular</button></div>`;
    document.getElementById('recalcBtn').onclick = ()=>{
      showConfirm('Recalcular plan futuro', 'Se conservará todo tu historial y las sesiones ya realizadas. Solo se regenerarán las sesiones futuras según tu nueva configuración.', ()=>{
        recalcFuture('Recalculado manualmente tras cambios en Perfil/Objetivo/Disponibilidad/Actividades/Limitaciones.');
        toast('Plan futuro recalculado');
        renderAll();
      });
    };
  } else {
    el.innerHTML='';
  }
}

function renderCalendar(){
  const list = document.getElementById('calendarList');
  if(!list) return;
  list.innerHTML='';
  if(!state.planCurrent){ list.innerHTML = '<div class="empty">Genera un plan desde la pestaña Perfil.</div>'; return; }
  state.planCurrent.weeks.forEach(w=>{
    const head = document.createElement('div');
    head.className='weekhead';
    head.innerHTML = `
      <div>
        <div class="wk">Semana ${w.n} · ${w.phaseLabel}${w.deload?' · 🟡 descarga':''}</div>
        <div class="wf">${w.sessionsNote||''}</div>
      </div>
      <div class="wd">${fmtDateShort(w.start)} – ${fmtDateShort(w.end)}</div>
    `;
    list.appendChild(head);
    const sessions = flattenPlan({weeks:[w]});
    sessions.forEach(s=> list.appendChild(renderSessionCard(s)));
  });
}

/* ---- 7f) Pestaña PROGRESO (Fase 8) ---- */
const PERIODS = {
  '7d':  { label:'7 días', days:7 },
  '4w':  { label:'4 semanas', days:28 },
  '8w':  { label:'8 semanas', days:56 },
  'all': { label:'Todo', days:null },
};
let progressPeriod = 'all';
const MIN_TREND = 2, MIN_COMPARE = 2;

function periodRange(key, todayIso){
  const p = PERIODS[key];
  const toIso = todayIso;
  const fromIso = p.days ? addDays(toIso, -(p.days-1)) : state.goal.startDate;
  let prevFromIso=null, prevToIso=null;
  if(p.days){
    prevToIso = addDays(fromIso, -1);
    prevFromIso = addDays(prevToIso, -(p.days-1));
  }
  return { fromIso, toIso, prevFromIso, prevToIso };
}

/* Agregación de un rango de fechas a partir de SESSIONS + STATE.results.
   Solo lee datos ya existentes; no introduce ninguna decisión nueva del motor. */
function periodMetrics(fromIso, toIso){
  const out = { planned:0, completed:0, partial:0, missed:0, rate:null,
    rpeVals:[], fatigueCounts:{baja:0,media:0,alta:0}, discVals:[],
    kmSum:0, timeMin:0, paceEntries:[] };
  if(!fromIso || !toIso) return out;
  allSessions().forEach(s=>{
    if(!['running','test','carrera'].includes(s.category)) return;
    if(s.date<fromIso || s.date>toIso) return;
    out.planned++;
    const r = getResult(s.id);
    if(!r || !r.status) return;
    if(r.status==='completed') out.completed++;
    else if(r.status==='partial') out.partial++;
    else if(r.status==='missed') out.missed++;
    if(r.status!=='missed'){
      if(r.rpe!=null && r.rpe!=='') out.rpeVals.push(Number(r.rpe));
      if(r.fatigue && out.fatigueCounts[r.fatigue]!=null) out.fatigueCounts[r.fatigue]++;
      if(r.discomfort!=null) out.discVals.push(Number(r.discomfort));
      if(r.distance) out.kmSum += r.distance;
      if(r.duration) out.timeMin += r.duration;
      if(r.distance && r.duration) out.paceEntries.push({date:s.date, pace:r.duration/r.distance});
    }
  });
  const scored = out.completed+out.partial+out.missed;
  out.rate = scored>0 ? (out.completed+out.partial*0.5)/scored : null;
  out.rpeAvg = out.rpeVals.length ? out.rpeVals.reduce((a,b)=>a+b,0)/out.rpeVals.length : null;
  out.discAvg = out.discVals.length ? out.discVals.reduce((a,b)=>a+b,0)/out.discVals.length : null;
  return out;
}

function weeklyBucketsForPeriod(fromIso, toIso){
  if(!state.planCurrent) return [];
  return state.planCurrent.weeks
    .filter(w=> w.end>=fromIso && w.start<=toIso)
    .map(w=>{
      let km=0,time=0,paces=[],completed=0,partial=0,missed=0,planned=0;
      flattenPlan({weeks:[w]}).forEach(s=>{
        if(!['running','test','carrera'].includes(s.category)) return;
        if(s.date<fromIso || s.date>toIso) return;
        planned++;
        const r = getResult(s.id);
        if(!r || !r.status) return;
        if(r.status==='completed') completed++;
        else if(r.status==='partial') partial++;
        else if(r.status==='missed') missed++;
        if(r.distance) km+=r.distance;
        if(r.duration) time+=r.duration;
        if(r.distance && r.duration) paces.push(r.duration/r.distance);
      });
      return { week:w.n, km, time, planned, completed, partial, missed,
        avgPace: paces.length? paces.reduce((a,b)=>a+b,0)/paces.length : null };
    });
}

function fmtDelta(curr, prev, {decimals=1, unit='', goodDir='up', colorCoded=true}={}){
  if(curr==null || prev==null) return null;
  const diff = curr-prev;
  if(Math.abs(diff)<Math.pow(10,-decimals)/2) {
    return { text:'sin cambios vs periodo anterior', cls:'neutral' };
  }
  const sign = diff>0 ? '+' : '';
  const text = sign+diff.toFixed(decimals)+unit+' vs periodo anterior';
  if(!colorCoded) return { text, cls:'neutral' };
  const isUp = diff>0;
  const good = goodDir==='up' ? isUp : !isUp;
  return { text, cls: good?'up':'down' };
}

function renderPeriodSelector(){
  const el = document.getElementById('periodRow');
  if(!el) return;
  el.innerHTML = Object.entries(PERIODS).map(([k,p])=>
    `<div class="themechip ${progressPeriod===k?'active':''}" data-period="${k}">${p.label}</div>`
  ).join('');
  el.querySelectorAll('.themechip').forEach(chip=>{
    chip.onclick = ()=>{
      progressPeriod = chip.dataset.period;
      renderCharts();
    };
  });
}

function renderProgressKpis(fromIso, toIso, prevFromIso, prevToIso){
  const grid = document.getElementById('kpiGrid');
  if(!grid) return;
  const cur = periodMetrics(fromIso, toIso);
  const prev = prevFromIso ? periodMetrics(prevFromIso, prevToIso) : null;
  const cap = estimateCapacity(allSessions(), state.results, state.goal, todayISO());

  const scoredCur = cur.completed+cur.partial+cur.missed;
  const scoredPrev = prev ? prev.completed+prev.partial+prev.missed : 0;
  const canCompare = prev!=null && scoredCur>=MIN_COMPARE && scoredPrev>=MIN_COMPARE;

  function kpi(value, label, delta){
    const d = canCompare ? delta : null;
    return `<div class="stat"><div class="v">${value}</div><div class="l">${label}</div>${d?`<div class="kpi-compare ${d.cls}">${d.text}</div>`:''}</div>`;
  }

  let html = '';
  html += kpi(scoredCur+'/'+cur.planned, 'Sesiones (completadas/planificadas)',
    canCompare ? fmtDelta(cur.completed+cur.partial, prev.completed+prev.partial, {decimals:0, goodDir:'up'}) : null);
  html += kpi(cur.rate!=null? Math.round(cur.rate*100)+'%':'--', 'Adherencia',
    canCompare && cur.rate!=null && prev.rate!=null ? fmtDelta(cur.rate*100, prev.rate*100, {decimals:0, unit:'pp', goodDir:'up'}) : null);
  html += kpi(cur.rpeAvg!=null? cur.rpeAvg.toFixed(1):'--', 'RPE medio',
    canCompare && cur.rpeAvg!=null && prev.rpeAvg!=null ? fmtDelta(cur.rpeAvg, prev.rpeAvg, {decimals:1, colorCoded:false}) : null);
  html += kpi(cur.discAvg!=null? cur.discAvg.toFixed(1):'--', 'Molestias medias',
    canCompare && cur.discAvg!=null && prev.discAvg!=null ? fmtDelta(cur.discAvg, prev.discAvg, {decimals:1, goodDir:'down'}) : null);
  html += kpi(cap.pace? minToPaceStr(cap.pace)+'/km':'--', 'Capacidad estimada actual', null);
  html += kpi(cur.kmSum.toFixed(1)+' km', 'Volumen del periodo',
    canCompare ? fmtDelta(cur.kmSum, prev.kmSum, {decimals:1, unit:' km', goodDir:'up'}) : null);

  grid.innerHTML = html;
}

/* ---- Charts (canvas), con thinning de etiquetas, formateo de eje Y opcional
   e interacción táctil/click para revelar el valor exacto ---- */
function drawBarChart(canvas, labels, data, color){
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio||1;
  const w = canvas.clientWidth, h=150;
  canvas.width=w*dpr; canvas.height=h*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const max = Math.max(1,...data);
  const padL=8,padB=18,padT=8,padR=8;
  const cw=w-padL-padR, ch=h-padT-padB;
  const bw=cw/data.length*0.6, gap=cw/data.length;
  const step = Math.max(1, Math.ceil(labels.length/6));
  ctx.font='9px -apple-system,sans-serif';
  const dimColor = getComputedStyle(document.documentElement).getPropertyValue('--chalk-dim').trim();
  const points = [];
  data.forEach((v,i)=>{
    const bh=(v/max)*ch, x=padL+i*gap+(gap-bw)/2, y=padT+ch-bh;
    ctx.fillStyle=color; ctx.globalAlpha=v>0?1:0.15;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,y,bw,Math.max(bh,2),3); else ctx.rect(x,y,bw,Math.max(bh,2));
    ctx.fill(); ctx.globalAlpha=1;
    if(i%step===0){
      ctx.fillStyle=dimColor; ctx.textAlign='center';
      ctx.fillText(labels[i], x+bw/2, h-4);
    }
    points.push({x:x+bw/2, y, label:labels[i], value:v});
  });
  return points;
}
function drawStackedBarChart(canvas, labels, series, colors){
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio||1;
  const w = canvas.clientWidth, h=150;
  canvas.width=w*dpr; canvas.height=h*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const totals = labels.map((_,i)=> series.reduce((a,s)=>a+(s[i]||0),0));
  const max = Math.max(1,...totals);
  const padL=8,padB=18,padT=8,padR=8;
  const cw=w-padL-padR, ch=h-padT-padB;
  const bw=cw/labels.length*0.6, gap=cw/labels.length;
  const step = Math.max(1, Math.ceil(labels.length/6));
  ctx.font='9px -apple-system,sans-serif';
  const dimColor = getComputedStyle(document.documentElement).getPropertyValue('--chalk-dim').trim();
  const points = [];
  labels.forEach((lab,i)=>{
    let yCursor = padT+ch;
    const x = padL+i*gap+(gap-bw)/2;
    series.forEach((s,si)=>{
      const v = s[i]||0;
      const bh = (v/max)*ch;
      if(bh>0){
        ctx.fillStyle = colors[si];
        ctx.fillRect(x, yCursor-bh, bw, bh);
      }
      yCursor -= bh;
    });
    if(i%step===0){
      ctx.fillStyle=dimColor; ctx.textAlign='center';
      ctx.fillText(lab, x+bw/2, h-4);
    }
    points.push({x:x+bw/2, y:padT, label:lab, value: series.map((s,si)=>s[i]).join('/')});
  });
  return points;
}
function drawLineChart(canvas, labels, data, color, opts){
  opts = opts||{};
  const ctx=canvas.getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const w=canvas.clientWidth,h=150;
  canvas.width=w*dpr; canvas.height=h*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const pts=data.map((v,i)=>({v,i})).filter(p=>p.v!=null);
  const padL= opts.yFormat? 30:8, padB=18,padT=10,padR=8;
  const cw=w-padL-padR, ch=h-padT-padB;
  const dimColor = getComputedStyle(document.documentElement).getPropertyValue('--chalk-dim').trim();
  ctx.font='9px -apple-system,sans-serif'; ctx.fillStyle=dimColor; ctx.textAlign='center';
  const step = Math.max(1, Math.ceil(labels.length/6));
  labels.forEach((l,i)=>{ if(i%step===0){ const x=padL+(cw/(labels.length-1||1))*i; ctx.fillText(l,x,h-4); } });
  if(pts.length<1){ ctx.fillText('Sin datos en este periodo', w/2, h/2); return []; }
  const vals=pts.map(p=>p.v), max=Math.max(...vals), min=Math.min(...vals), range=(max-min)||1;
  if(opts.yFormat){
    ctx.textAlign='right';
    ctx.fillText(opts.yFormat(max), padL-6, padT+8);
    ctx.fillText(opts.yFormat(min), padL-6, padT+ch);
  }
  if(pts.length>=2){
    ctx.beginPath();
    pts.forEach((p,idx)=>{
      const x=padL+(cw/(labels.length-1||1))*p.i, y=padT+ch-((p.v-min)/range)*ch;
      if(idx===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.strokeStyle=color; ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.stroke();
  }
  const points = [];
  pts.forEach(p=>{
    const x=padL+(cw/(labels.length-1||1))*p.i, y=padT+ch-((p.v-min)/range)*ch;
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fillStyle=color; ctx.fill();
    points.push({x,y,label:labels[p.i],value:p.v});
  });
  return points;
}
function wireChartTap(canvas, points, captionEl, formatFn){
  if(!canvas || !captionEl) return;
  if(!points || !points.length){ captionEl.textContent=''; captionEl.classList.remove('filled'); canvas.onpointerdown=null; return; }
  canvas.onpointerdown = (e)=>{
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX-rect.left;
    let nearest = points[0], bestD = Infinity;
    points.forEach(p=>{ const d=Math.abs(p.x-x); if(d<bestD){ bestD=d; nearest=p; } });
    captionEl.textContent = formatFn(nearest);
    captionEl.classList.add('filled');
  };
}

function emptyState(msg){ return `<div class="chart-empty">${msg}</div>`; }
function needMore(current, min){ const n = Math.max(0, min-current); return n>0 ? n : 0; }

function renderFatigueDist(fromIso, toIso){
  const box = document.getElementById('fatigueDistBox');
  if(!box) return;
  const m = periodMetrics(fromIso, toIso);
  const total = m.fatigueCounts.baja+m.fatigueCounts.media+m.fatigueCounts.alta;
  if(total<1){
    box.innerHTML = emptyState('No hay suficientes datos todavía. Registra al menos 1 sesión con fatiga indicada para ver esta distribución.');
    return;
  }
  const css = getComputedStyle(document.documentElement);
  box.innerHTML = `
    <div class="fatiguebar-row">
      <div class="fatiguebar-seg" style="width:${m.fatigueCounts.baja/total*100}%;background:var(--moss);"></div>
      <div class="fatiguebar-seg" style="width:${m.fatigueCounts.media/total*100}%;background:var(--gold);"></div>
      <div class="fatiguebar-seg" style="width:${m.fatigueCounts.alta/total*100}%;background:var(--race);"></div>
    </div>
    <div class="adhlegend">
      <span><i class="dot2" style="background:var(--moss);"></i>Baja (${m.fatigueCounts.baja})</span>
      <span><i class="dot2" style="background:var(--gold);"></i>Media (${m.fatigueCounts.media})</span>
      <span><i class="dot2" style="background:var(--race);"></i>Alta (${m.fatigueCounts.alta})</span>
    </div>
  `;
}

function renderCharts(){
  if(!f12ActiveRace()) return;
  renderPeriodSelector();
  if(!state.planCurrent) return;
  const todayIso = todayISO();
  const { fromIso, toIso, prevFromIso, prevToIso } = periodRange(progressPeriod, todayIso);

  renderProgressKpis(fromIso, toIso, prevFromIso, prevToIso);

  const css = getComputedStyle(document.documentElement);
  const buckets = weeklyBucketsForPeriod(fromIso, toIso);
  const wLabels = buckets.map(b=>'S'+b.week);

  // Volumen semanal (km)
  const kmEmpty = document.getElementById('chartKmEmpty');
  const kmCanvas = document.getElementById('chartKm');
  const hasVolume = buckets.some(b=>b.km>0);
  kmCanvas.style.display = hasVolume ? '' : 'none';
  kmEmpty.innerHTML = hasVolume ? '' : emptyState('No hay suficientes datos todavía. Registra tu primera sesión con distancia para ver esta gráfica.');
  if(hasVolume){
    const pts = drawBarChart(kmCanvas, wLabels, buckets.map(b=>+b.km.toFixed(1)), css.getPropertyValue('--ember').trim());
    wireChartTap(kmCanvas, pts, document.getElementById('chartKmCaption'), p=>`Semana ${p.label.replace('S','')}: ${p.value} km`);
  }

  // Minutos semanales
  const timeEmpty = document.getElementById('chartTimeEmpty');
  const timeCanvas = document.getElementById('chartTime');
  const hasTime = buckets.some(b=>b.time>0);
  timeCanvas.style.display = hasTime ? '' : 'none';
  timeEmpty.innerHTML = hasTime ? '' : emptyState('No hay suficientes datos todavía. Registra tu primera sesión con tiempo para ver esta gráfica.');
  if(hasTime){
    const pts = drawBarChart(timeCanvas, wLabels, buckets.map(b=>b.time), css.getPropertyValue('--sky').trim());
    wireChartTap(timeCanvas, pts, document.getElementById('chartTimeCaption'), p=>`Semana ${p.label.replace('S','')}: ${p.value} min`);
  }

  // Adherencia semanal (stacked)
  const adhEmpty = document.getElementById('chartAdherenceEmpty');
  const adhCanvas = document.getElementById('chartAdherence');
  const hasAdh = buckets.some(b=>b.planned>0);
  adhCanvas.style.display = hasAdh ? '' : 'none';
  adhEmpty.innerHTML = hasAdh ? '' : emptyState('No hay suficientes datos todavía. Necesitas al menos 1 semana con sesiones planificadas.');
  if(hasAdh){
    drawStackedBarChart(adhCanvas, wLabels,
      [buckets.map(b=>b.completed), buckets.map(b=>b.partial), buckets.map(b=>b.missed)],
      [css.getPropertyValue('--moss').trim(), css.getPropertyValue('--gold').trim(), css.getPropertyValue('--race').trim()]);
  }

  // Ritmo registrado
  const m = periodMetrics(fromIso, toIso);
  const paceEmpty = document.getElementById('chartPaceEmpty');
  const paceCanvas = document.getElementById('chartPace');
  const hasPace = m.paceEntries.length>=MIN_TREND;
  paceCanvas.style.display = hasPace ? '' : 'none';
  paceEmpty.innerHTML = hasPace ? '' : emptyState(m.paceEntries.length===0
    ? 'No hay suficientes datos todavía. Registra distancia y tiempo en al menos '+MIN_TREND+' sesiones para ver esta gráfica.'
    : 'Registra '+needMore(m.paceEntries.length, MIN_TREND)+' sesión(es) más con distancia y tiempo para desbloquear esta gráfica.');
  if(hasPace){
    const pLabels = m.paceEntries.map(e=>fmtDateShort(e.date));
    const pts = drawLineChart(paceCanvas, pLabels, m.paceEntries.map(e=>e.pace), css.getPropertyValue('--gold').trim(), {yFormat:v=>minToPaceStr(v)});
    wireChartTap(paceCanvas, pts, document.getElementById('chartPaceCaption'), p=>`${p.label}: ${minToPaceStr(p.value)}/km`);
  }

  // RPE por sesión
  const rpeEntries = [];
  allSessions().forEach(s=>{
    if(!['running','test','carrera'].includes(s.category)) return;
    if(s.date<fromIso || s.date>toIso) return;
    const r = getResult(s.id);
    if(r && r.status && r.status!=='missed' && r.rpe!=null && r.rpe!=='') rpeEntries.push({date:s.date, rpe:Number(r.rpe)});
  });
  const rpeEmpty = document.getElementById('chartRpeEmpty');
  const rpeCanvas = document.getElementById('chartRpe');
  const hasRpe = rpeEntries.length>=MIN_TREND;
  rpeCanvas.style.display = hasRpe ? '' : 'none';
  rpeEmpty.innerHTML = hasRpe ? '' : emptyState(rpeEntries.length===0
    ? 'No hay suficientes datos todavía. Registra el RPE en al menos '+MIN_TREND+' sesiones para ver esta gráfica.'
    : 'Registra '+needMore(rpeEntries.length, MIN_TREND)+' sesión(es) más con RPE para desbloquear esta gráfica.');
  if(hasRpe){
    const pts = drawLineChart(rpeCanvas, rpeEntries.map(e=>fmtDateShort(e.date)), rpeEntries.map(e=>e.rpe), css.getPropertyValue('--race').trim());
    wireChartTap(rpeCanvas, pts, document.getElementById('chartRpeCaption'), p=>`${p.label}: RPE ${p.value}`);
  }

  // Fatiga (distribución)
  renderFatigueDist(fromIso, toIso);

  // Molestias por sesión
  const discEntries = [];
  allSessions().forEach(s=>{
    if(!['running','test','carrera'].includes(s.category)) return;
    if(s.date<fromIso || s.date>toIso) return;
    const r = getResult(s.id);
    if(r && r.status && r.status!=='missed' && r.discomfort!=null) discEntries.push({date:s.date, disc:Number(r.discomfort)});
  });
  const discEmpty = document.getElementById('chartDiscomfortEmpty');
  const discCanvas = document.getElementById('chartDiscomfort');
  const hasDisc = discEntries.length>=MIN_TREND;
  discCanvas.style.display = hasDisc ? '' : 'none';
  discEmpty.innerHTML = hasDisc ? '' : emptyState(discEntries.length===0
    ? 'No hay suficientes datos todavía. Registra al menos '+MIN_TREND+' sesiones para ver esta gráfica.'
    : 'Registra '+needMore(discEntries.length, MIN_TREND)+' sesión(es) más para desbloquear esta gráfica.');
  if(hasDisc){
    const pts = drawLineChart(discCanvas, discEntries.map(e=>fmtDateShort(e.date)), discEntries.map(e=>e.disc), css.getPropertyValue('--orange').trim());
    wireChartTap(discCanvas, pts, document.getElementById('chartDiscomfortCaption'), p=>`${p.label}: ${p.value}/10`);
  }

  // Peso (histórico completo, no filtrado por periodo)
  const wLabels2 = state.weights.map(w=>fmtDateShort(w.date));
  const wVals = state.weights.map(w=>w.weight);
  drawLineChart(document.getElementById('chartWeight'), wLabels2, wVals, css.getPropertyValue('--moss').trim());
}


function renderAdaptationLog(){
  const box = document.getElementById('adaptationLogBox');
  if(!box) return;
  if(!state.adaptationLog.length){ box.innerHTML='<div class="empty">Todavía no hay decisiones registradas.</div>'; return; }
  box.innerHTML = state.adaptationLog.slice(0,20).map(e=>{
    const cls = e.decision==='PROGRESS'?'progress': e.decision==='DELOAD'?'deload': e.decision==='REPLACE'?'replace':'maintain';
    return `<div class="logentry"><span class="logtag ${cls}">${e.decision}</span> ${e.reason}<div class="ldate">${e.date}</div></div>`;
  }).join('');
}

function renderLegacyHistory(){
  const card = document.getElementById('legacyHistoryCard');
  const box = document.getElementById('legacyHistoryBox');
  if(!card || !box) return;
  if(!state.legacyV1_1Results || !Object.keys(state.legacyV1_1Results).length){
    card.style.display='none';
    return;
  }
  card.style.display='';
  const entries = Object.entries(state.legacyV1_1Results).filter(([,r])=>r && r.completed);
  box.innerHTML = `
    <div class="fieldhint" style="margin-bottom:8px;">${entries.length} entrenamiento(s) registrados en la V1.1, conservados como referencia. No están vinculados a las sesiones del plan actual de V2 (los IDs y fechas cambiaron al generar el nuevo plan).</div>
    ${entries.slice(0,10).map(([id,r])=>`<div class="logentry">${id}${r.distance?' · '+r.distance+' km':''}${r.duration?' · '+r.duration+' min':''}</div>`).join('')}
  `;
}

/* ---- 7g) Pestaña PERFIL — formularios ---- */
const DOW_SHORT = ['D','L','M','X','J','V','S'];

function applyTheme(mode, palette){
  document.documentElement.setAttribute('data-mode', mode);
  document.documentElement.setAttribute('data-palette', palette);
}

const PALETTE_SWATCH = {
  running: ['#ff6a3d','#8fae7a','#5fa8d3','#f0b429'],
  ocean: ['#14b8a6','#34d399','#38bdf8','#f2b134'],
  performance: ['#c6f135','#31e17c','#33c3ff','#ffcc33'],
  minimal: ['#9aa2b1','#8bb094','#89aac2','#c7a468'],
};

/* Muestra/oculta la puerta de autenticación vs. la app real. Nunca se
   muestran ambas a la vez, así que no hay forma de que datos de
   entrenamiento se "vean" antes de identificar al usuario. */
function hideApp(){
  document.getElementById('appRoot').style.display = 'none';
  document.getElementById('authGate').style.display = 'flex';
}
function showApp(){
  document.getElementById('authGate').style.display = 'none';
  document.getElementById('appRoot').style.display = '';
}

/* Cierre de sesión: revoca la sesión remota, limpia el estado EN MEMORIA
   (para que nada pueda seguir mostrando los datos de la cuenta anterior si
   algún render se disparase por error) y vuelve a la puerta de acceso. */
async function logout(){
  ++f13_2_syncAfterAuth.generation;
  const revokePromise=remoteAuth.signOut().catch(()=>{});
  remoteAuth.session=null;
  remoteAuth.persistSession();
  state = f13_2_blankAthleteState();
  f12EnsureState();
  usersStore = { schemaVersion:1, activeUserId:null, users:[], migratedAt:f12Now() };
  hideApp();
  renderAuthGate();
  void revokePromise;
}

function renderAccountForm(){
  const el = document.getElementById('accountForm');
  if(!el) return;
  const session = remoteAuth.session;
  if(session && session.user){
    el.innerHTML = `
      <div class="fieldhint">Sesión iniciada como <b>${session.user.email}</b>. Tus datos se guardan también en la nube (Supabase) además de en este dispositivo.</div>
      <button class="smallbtn" id="signOutBtn" style="margin-top:8px;">Cerrar sesión</button>
    `;
    document.getElementById('signOutBtn').onclick = async ()=>{
      await logout();
      toast('Sesión cerrada');
    };
    return;
  }
  // No debería poder llegarse aquí (la puerta bloquea el resto de la app sin
  // sesión), pero se deja un estado defensivo por si acaso.
  el.innerHTML = `<div class="fieldhint">No has iniciado sesión.</div>`;
}

/* Puerta de autenticación (pantalla completa, previa a toda la app).
   Tres vistas dentro del mismo formulario: login (por defecto), registro,
   y recuperación de contraseña. */
function renderAuthGate(view){
  view = view || 'signin';
  const el = document.getElementById('authGateForm');
  if(!el) return;

  if(view==='recovery'){
    el.innerHTML = `
      <div class="fieldhint" style="margin-bottom:10px;">Establece tu nueva contraseña.</div>
      <div class="field"><label>Nueva contraseña</label><input type="password" id="gateNewPassword" placeholder="••••••••"></div>
      <button class="bigbtn" id="gateSetPasswordBtn">Guardar nueva contraseña</button>
      <div class="fieldhint" id="gateStatus"></div>
    `;
    const status = document.getElementById('gateStatus');
    document.getElementById('gateSetPasswordBtn').onclick = async ()=>{
      const pw = document.getElementById('gateNewPassword').value;
      if(!pw || pw.length<6){ status.textContent='La contraseña debe tener al menos 6 caracteres.'; return; }
      status.textContent = 'Guardando…';
      try{
        const recoveryToken = f13_2_pendingRecovery.access_token;
        const user = await remoteAuth.updatePassword(recoveryToken, pw);
        // El access_token de recuperación ya es válido como sesión: la persistimos igual que un login normal.
        remoteAuth.session = { access_token: recoveryToken, refresh_token: f13_2_pendingRecovery.refresh_token, expires_at: f13_2_pendingRecovery.expires_at, user };
        remoteAuth.persistSession();
        history.replaceState(null, '', window.location.pathname+window.location.search); // limpiar el hash de recuperación
        toast('Contraseña actualizada');
        await f13_2_syncAfterAuth(user, {isNewSignup:false});
      }catch(e){
        status.textContent = 'No se pudo actualizar la contraseña: '+e.message;
      }
    };
    return;
  }

  if(view==='forgot'){
    el.innerHTML = `
      <div class="field"><label>Email</label><input type="email" id="gateEmail" placeholder="tucorreo@ejemplo.com"></div>
      <button class="bigbtn" id="gateResetBtn">Enviar enlace de recuperación</button>
      <div class="fieldhint" id="gateStatus"></div>
      <button class="authgate-link" id="gateBackBtn">← Volver a iniciar sesión</button>
    `;
    const status = document.getElementById('gateStatus');
    document.getElementById('gateResetBtn').onclick = async ()=>{
      const email = document.getElementById('gateEmail').value.trim();
      if(!email){ status.textContent='Indica tu email.'; return; }
      status.textContent = 'Enviando…';
      try{
        await remoteAuth.resetPassword(email);
      }catch(e){ /* mensaje genérico igualmente: no revelar si el email existe */ }
      status.textContent = 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.';
    };
    document.getElementById('gateBackBtn').onclick = ()=>renderAuthGate('signin');
    return;
  }

  const isSignup = view==='signup';
  el.innerHTML = `
    <div class="field"><label>Email</label><input type="email" id="gateEmail" placeholder="tucorreo@ejemplo.com"></div>
    <div class="field"><label>Contraseña</label><input type="password" id="gatePassword" placeholder="••••••••"></div>
    <button class="bigbtn" id="gateSubmitBtn">${isSignup?'Crear cuenta':'Iniciar sesión'}</button>
    <div class="fieldhint" id="gateStatus"></div>
    <button class="authgate-link" id="gateToggleBtn">${isSignup?'← Ya tengo cuenta, iniciar sesión':'Crear una cuenta nueva'}</button>
    ${isSignup?'':'<div><button class="authgate-link" id="gateForgotBtn">¿Has olvidado tu contraseña?</button></div>'}
  `;
  const status = document.getElementById('gateStatus');
  document.getElementById('gateToggleBtn').onclick = ()=>renderAuthGate(isSignup?'signin':'signup');
  if(!isSignup) document.getElementById('gateForgotBtn').onclick = ()=>renderAuthGate('forgot');

  document.getElementById('gateSubmitBtn').onclick = async ()=>{
    const email = document.getElementById('gateEmail').value.trim();
    const password = document.getElementById('gatePassword').value;
    if(!email||!password){ status.textContent='Indica email y contraseña.'; return; }
    status.textContent = isSignup ? 'Creando cuenta…' : 'Iniciando sesión…';
    try{
      if(isSignup){
        const result = await remoteAuth.signUp(email, password);
        if(result.confirmed){
          await f13_2_syncAfterAuth(result.user, {isNewSignup:true});
          toast('Cuenta creada');
        } else {
          status.textContent = 'Cuenta creada. Revisa tu email para confirmarla y después inicia sesión.';
        }
      } else {
        const user = await remoteAuth.signIn(email, password);
        await f13_2_syncAfterAuth(user, {isNewSignup:false});
        toast('Sesión iniciada');
      }
    }catch(e){
      status.textContent = (isSignup?'No se pudo crear la cuenta: ':'No se pudo iniciar sesión: ')+e.message;
    }
  };
}

function renderUsersForm(){
  const el = document.getElementById('usersForm');
  if(!el) return;
  el.innerHTML = `
    <div class="field"><label>Usuario activo</label>
      <div class="themerow" id="userRow">
        ${usersStore.users.map(u=>`<div class="themechip ${u.id===usersStore.activeUserId?'active':''}" data-user="${escapeHtml(u.id)}">${escapeHtml(u.name)}</div>`).join('')}
      </div>
    </div>
    <div class="formrow2">
      <div class="field"><label>Nuevo usuario</label><input type="text" id="newUserName" placeholder="Nombre"></div>
    </div>
    <button class="smallbtn" id="addUserBtn">Crear usuario</button>
    <div class="fieldhint">Cada usuario tiene su propio perfil, carreras, ciclos, historial y adaptaciones — completamente independientes entre sí.</div>
  `;
  el.querySelectorAll('#userRow .themechip').forEach(chip=>{
    chip.onclick = ()=>{
      if(chip.dataset.user===usersStore.activeUserId) return;
      switchUser(chip.dataset.user);
      toast('Usuario cambiado');
    };
  });
  document.getElementById('addUserBtn').onclick = ()=>{
    const name = document.getElementById('newUserName').value;
    createUser(name);
    toast('Usuario creado');
  };
}

function renderAppearanceForm(){
  const el = document.getElementById('appearanceForm');
  if(!el) return;
  const theme = state.theme;
  const modes = [['light','☀️ Light'],['dark','🌙 Dark'],['amoled','⚫ AMOLED']];
  const palettes = [['running','Running'],['ocean','Ocean'],['performance','Performance'],['minimal','Minimal']];

  el.innerHTML = `
    <div class="field"><label>Modo</label>
      <div class="themerow" id="modeRow">
        ${modes.map(([v,l])=>`<div class="themechip ${theme.mode===v?'active':''}" data-mode="${v}">${l}</div>`).join('')}
      </div>
    </div>
    <div class="field"><label>Paleta</label>
      <div class="themerow" id="paletteRow">
        ${palettes.map(([v,l])=>`
          <div class="themechip ${theme.palette===v?'active':''}" data-palette="${v}">
            <div class="swatchrow">${PALETTE_SWATCH[v].map(c=>`<span class="swatchdot" style="background:${c};"></span>`).join('')}</div>
            ${l}
          </div>`).join('')}
      </div>
    </div>
    <div class="fieldhint">El tema se guarda en este dispositivo y se aplica automáticamente la próxima vez que abras la app.</div>
  `;
  el.querySelectorAll('#modeRow .themechip').forEach(chip=>{
    chip.onclick = ()=>{
      state.theme.mode = chip.dataset.mode;
      applyTheme(state.theme.mode, state.theme.palette);
      saveState();
      el.querySelectorAll('#modeRow .themechip').forEach(c=>c.classList.toggle('active', c===chip));
      renderCharts();
    };
  });
  el.querySelectorAll('#paletteRow .themechip').forEach(chip=>{
    chip.onclick = ()=>{
      state.theme.palette = chip.dataset.palette;
      applyTheme(state.theme.mode, state.theme.palette);
      saveState();
      el.querySelectorAll('#paletteRow .themechip').forEach(c=>c.classList.toggle('active', c===chip));
      renderCharts();
    };
  });
}

function renderProfileForm(){
  const el = document.getElementById('profileForm');
  const p = state.profile;
  el.innerHTML = `
    <div class="field"><label>Nombre (opcional)</label><input type="text" id="f_name" value="${escapeHtml(p.name||'')}"></div>
    <div class="formrow2">
      <div class="field"><label>Edad</label><input type="number" id="f_age" value="${p.age}"></div>
      <div class="field"><label>Altura (cm)</label><input type="number" id="f_height" value="${p.heightCm}"></div>
    </div>
    <div class="formrow2">
      <div class="field"><label>Peso actual (kg)</label><input type="number" step="0.05" id="f_weight" value="${p.weightKg}"></div>
      <div class="field"><label>Peso objetivo (kg)</label><input type="number" step="0.5" id="f_weightgoal" value="${p.weightGoalKg}"></div>
    </div>
    <div class="field"><label>Nivel</label>
      <select id="f_level">
        <option value="principiante" ${p.level==='principiante'?'selected':''}>Principiante</option>
        <option value="intermedio" ${p.level==='intermedio'?'selected':''}>Intermedio</option>
        <option value="avanzado" ${p.level==='avanzado'?'selected':''}>Avanzado</option>
      </select>
      <div class="fieldhint">Si no lo sabes, elige "Principiante": el plan será más conservador.</div>
    </div>
    <div class="field"><label>Cómo prefieres las explicaciones</label>
      <select id="f_knowledge">
        <option value="basico" ${p.trainingKnowledge==='basico'||!p.trainingKnowledge?'selected':''}>Lenguaje sencillo</option>
        <option value="familiar" ${p.trainingKnowledge==='familiar'?'selected':''}>Conozco algunos conceptos</option>
        <option value="tecnico" ${p.trainingKnowledge==='tecnico'?'selected':''}>Quiero también datos técnicos</option>
      </select>
      <div class="fieldhint">Esto cambia cómo se explica el entrenamiento, no la dificultad del plan.</div>
    </div>
    <div class="field"><label>Minutos corriendo de forma continua actualmente</label>
      <input type="number" step="0.5" id="f_capability" value="${p.currentCapabilityMinutes}">
      <div class="fieldhint">Un principiante absoluto puede dejarlo tal cual (7-8 min).</div>
    </div>
    <details class="details"><summary>Base de entrenamiento reciente (recomendado)</summary>
      <div class="formrow2">
        <div class="field"><label>Días de running por semana</label><input type="number" min="0" max="7" step="1" id="f_recentdays" value="${p.recentRunDaysPerWeek??''}"></div>
        <div class="field"><label>Minutos semanales aproximados</label><input type="number" min="0" step="5" id="f_weeklyminutes" value="${p.currentWeeklyMinutes??''}"></div>
      </div>
      <div class="formrow2">
        <div class="field"><label>Tirada/sesión más larga habitual (min)</label><input type="number" min="0" step="5" id="f_longminutes" value="${p.usualLongSessionMinutes??''}"></div>
        <div class="field"><label>Años entrenando running</label><input type="number" min="0" max="60" step="0.5" id="f_years" value="${p.trainingYears??''}"></div>
      </div>
      <div class="field"><label><input type="checkbox" id="f_consecutive" ${p.toleratesConsecutiveDays?'checked':''}> Tolero bien correr en días consecutivos</label></div>
      <div class="fieldhint">Estos datos permiten ajustar volumen, frecuencia y tirada larga. Si faltan, Made2Run usa una estimación conservadora.</div>
    </details>
    <div class="formrow2">
      <div class="field"><label>Ritmo habitual (min/km, si lo conoces)</label><input type="number" step="0.1" id="f_knownpace" value="${p.knownRecentPaceMinKm??''}" placeholder="Desconocido"></div>
      <div class="field"><label>Ritmo caminando (min/km)</label><input type="number" step="0.5" id="f_walkpace" value="${p.walkingPaceMinKm}"></div>
    </div>
    <button class="smallbtn primary" id="saveProfileBtn">Guardar perfil</button>
  `;
  document.getElementById('saveProfileBtn').onclick = ()=>{
    state.profile.name = document.getElementById('f_name').value;
    state.profile.age = parseInt(document.getElementById('f_age').value)||state.profile.age;
    state.profile.heightCm = parseInt(document.getElementById('f_height').value)||state.profile.heightCm;
    state.profile.weightKg = parseFloat(document.getElementById('f_weight').value)||state.profile.weightKg;
    state.profile.weightGoalKg = parseFloat(document.getElementById('f_weightgoal').value)||state.profile.weightGoalKg;
    state.profile.level = document.getElementById('f_level').value;
    state.profile.trainingKnowledge = document.getElementById('f_knowledge').value;
    const capability=Number(document.getElementById('f_capability').value);
    if(Number.isFinite(capability)&&capability>=0)state.profile.currentCapabilityMinutes=capability;
    state.profile.recentRunDaysPerWeek=Math.max(0,Math.min(7,Number(document.getElementById('f_recentdays').value)||0));
    state.profile.currentWeeklyMinutes=Math.max(0,Number(document.getElementById('f_weeklyminutes').value)||0);
    state.profile.usualLongSessionMinutes=Math.max(0,Number(document.getElementById('f_longminutes').value)||0);
    state.profile.trainingYears=Math.max(0,Number(document.getElementById('f_years').value)||0);
    state.profile.toleratesConsecutiveDays=document.getElementById('f_consecutive').checked;
    const kp = document.getElementById('f_knownpace').value;
    state.profile.knownRecentPaceMinKm = kp? parseFloat(kp) : null;
    state.profile.walkingPaceMinKm = parseFloat(document.getElementById('f_walkpace').value)||state.profile.walkingPaceMinKm;
    markConfigDirty();
    toast('Perfil guardado');
    renderAll();
  };
}

function renderGoalForm(){
  if(!f12ActiveRace()){document.getElementById('goalForm').textContent='Crea tu primera carrera para configurar su objetivo.';return;}
  const el = document.getElementById('goalForm');
  const g = state.goal;
  el.innerHTML = `
    <div class="field"><label>Distancia (km)</label>
      <input type="number" id="g_dist" min="0.5" max="200" step="0.001" list="distanceOptions" value="${normalizeDistanceKm(g.distanceKm,5)}">
      <datalist id="distanceOptions"><option value="3"><option value="5"><option value="7"><option value="10"><option value="12"><option value="15"><option value="21.097"><option value="42.195"></datalist>
      <div class="fieldhint">Elige una distancia habitual o escribe cualquier valor entre 0,5 y 200 km.</div>
    </div>
    <div class="field"><label>Fecha de la carrera</label><input type="date" id="g_date" value="${g.date}"></div>
    <div class="field"><label>Tipo de objetivo</label>
      <div class="radiogroup">
        <label><input type="radio" name="g_type" value="completar" ${g.type==='completar'?'checked':''}> Completar (sin marca exigida)</label>
        <label><input type="radio" name="g_type" value="tiempo_objetivo" ${g.type==='tiempo_objetivo'?'checked':''}> Tiempo objetivo</label>
        <label><input type="radio" name="g_type" value="mejorar_rendimiento" ${g.type==='mejorar_rendimiento'?'checked':''}> Mejorar rendimiento</label>
      </div>
    </div>
    <div class="field" id="g_pace_field" style="${g.type==='completar'?'display:none;':''}">
      <label>Ritmo objetivo (mm:ss/km)</label>
      <input type="text" inputmode="numeric" pattern="\\d{1,2}:\\d{2}" id="g_pace" value="${g.targetPaceSecPerKm?f12PaceInputValue(g.targetPaceSecPerKm,true):f12PaceInputValue(g.targetPaceMinKm)}" placeholder="05:45">
      <div class="fieldhint">Usa mm:ss, por ejemplo 05:45. Los valores decimales guardados de versiones anteriores se conservan (5.45 equivale a 5:27).</div>
    </div>
    <button class="smallbtn primary" id="saveGoalBtn">Guardar objetivo</button>
  `;
  document.querySelectorAll('input[name="g_type"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      document.getElementById('g_pace_field').style.display = r.value==='completar' ? 'none':'';
    });
  });
  document.getElementById('saveGoalBtn').onclick = ()=>{
    const distance=normalizeDistanceKm(document.getElementById('g_dist').value,null);
    if(distance==null){toast('La distancia debe estar entre 0,5 y 200 km');return;}
    state.goal.distanceKm = distance;
    state.goal.date = document.getElementById('g_date').value || state.goal.date;
    state.goal.type = document.querySelector('input[name="g_type"]:checked').value;
    if(state.goal.type!=='completar'){
      const paceSec = f12ParsePace(document.getElementById('g_pace').value);
      if(document.getElementById('g_pace').value.trim()&&!paceSec){toast('Introduce el ritmo como mm:ss, por ejemplo 05:45');return;}
      if(paceSec){ state.goal.targetPaceMinKm = paceSec/60; state.goal.targetPaceSecPerKm = paceSec; state.goal.targetPaceLabel = minToPaceStr(state.goal.targetPaceMinKm); }
    } else { state.goal.targetPaceMinKm=null; state.goal.targetPaceSecPerKm=null; state.goal.targetPaceLabel=''; state.goal.targetTimeSec=null; }
    const race=f12ActiveRace();
    if(race){race.distanceKm=state.goal.distanceKm;race.date=state.goal.date;race.targetPaceMinKm=state.goal.targetPaceMinKm||null;race.targetPaceSecPerKm=state.goal.targetPaceSecPerKm||(race.targetPaceMinKm?Math.round(race.targetPaceMinKm*60):null);race.targetTimeSec=state.goal.targetTimeSec||null;race.updatedAt=f12Now();}
    markConfigDirty('active');
    toast('Objetivo guardado');
    renderAll();
  };
}

function renderAvailabilityForm(){
  const el = document.getElementById('availabilityForm');
  const a = state.availability;
  const dayRow = [1,2,3,4,5,6,0].map(dow=>{
    const active = a.days.includes(dow);
    return `<div class="daychip ${active?'active':''}" data-dow="${dow}">${DOW_SHORT[dow]}</div>`;
  }).join('');
  el.innerHTML = `
    <div class="field"><label>Días disponibles</label><div class="dayrow" id="dayPicker">${dayRow}</div></div>
    <div class="formrow2">
      <div class="field"><label>Máximo de sesiones/semana</label><input type="number" min="1" max="7" id="a_max" value="${a.maxSessionsPerWeek}"></div>
      <div class="field"><label>Duración disponible por sesión (min)</label><input type="number" id="a_dur" value="${a.sessionDurationAvailMin}"></div>
    </div>
    <div class="fieldhint">El 4º día solo se activa si el motor comprueba que hay evidencia suficiente (ver Guía en Progreso), aunque lo permitas aquí.</div>
    <button class="smallbtn primary" id="saveAvailBtn" style="margin-top:10px;">Guardar disponibilidad</button>
  `;
  const picked = new Set(a.days);
  el.querySelectorAll('.daychip').forEach(chip=>{
    chip.onclick = ()=>{
      const dow = parseInt(chip.dataset.dow);
      if(picked.has(dow)) picked.delete(dow); else picked.add(dow);
      chip.classList.toggle('active');
    };
  });
  document.getElementById('saveAvailBtn').onclick = ()=>{
    state.availability.days = Array.from(picked);
    state.availability.maxSessionsPerWeek = parseInt(document.getElementById('a_max').value)||3;
    state.availability.sessionDurationAvailMin = parseInt(document.getElementById('a_dur').value)||40;
    markConfigDirty();
    saveState();
    toast('Disponibilidad guardada');
    renderAll();
  };
}

function renderActivitiesForm(){
  const el = document.getElementById('activitiesForm');
  el.innerHTML = `
    <div class="actlist" id="actList"></div>
    <div class="formrow2">
      <div class="field"><label>Tipo</label>
        <select id="act_type">
          <option value="hipertrofia">Hipertrofia</option>
          <option value="fuerza">Fuerza</option>
          <option value="crossfit">CrossFit</option>
          <option value="ciclismo">Ciclismo</option>
          <option value="natacion">Natación</option>
          <option value="futbol">Fútbol</option>
          <option value="otra">Otra</option>
        </select>
      </div>
      <div class="field"><label>Frecuencia (días/semana)</label><input type="number" min="0" max="7" id="act_freq" value="4"></div>
    </div>
    <div class="field"><label>Intensidad aproximada</label>
      <select id="act_int"><option value="baja">Baja</option><option value="media">Media</option><option value="alta" selected>Alta</option></select>
    </div>
    <button class="smallbtn" id="addActBtn">Añadir actividad</button>
  `;
  function renderList(){
    const box = document.getElementById('actList');
    if(!state.activities.length){ box.innerHTML='<div class="fieldhint">Ninguna actividad complementaria registrada.</div>'; return; }
    box.innerHTML = state.activities.map(a=>`
      <div class="actitem">
        <div><b>${a.type}</b><div class="meta">${a.frequency}x/semana · intensidad ${a.intensity}</div></div>
        <button data-id="${a.id}">✕</button>
      </div>`).join('');
    box.querySelectorAll('button[data-id]').forEach(b=>{
      b.onclick = ()=>{
        state.activities = state.activities.filter(a=>a.id!==b.dataset.id);
        markConfigDirty(); saveState(); renderList();
      };
    });
  }
  renderList();
  document.getElementById('addActBtn').onclick = ()=>{
    state.activities.push({
      id:'act-'+Date.now(),
      type: document.getElementById('act_type').value,
      frequency: parseInt(document.getElementById('act_freq').value)||0,
      intensity: document.getElementById('act_int').value,
    });
    markConfigDirty(); saveState(); renderList();
    toast('Actividad añadida');
  };
}

function renderLimitationsForm(){
  const el = document.getElementById('limitationsForm');
  el.innerHTML = `
    <div class="limlist" id="limList"></div>
    <div class="formrow2">
      <div class="field"><label>Zona</label>
        <select id="lim_area">
          <option value="ninguna">Ninguna</option>
          <option value="rodilla">Rodilla</option>
          <option value="tobillo">Tobillo</option>
          <option value="cadera">Cadera</option>
          <option value="espalda">Espalda</option>
          <option value="otra">Otra</option>
        </select>
      </div>
      <div class="field"><label>Molestia actual (0-10)</label><input type="number" min="0" max="10" id="lim_disc" value="0"></div>
    </div>
    <button class="smallbtn" id="addLimBtn">Añadir / actualizar</button>
    <div class="fieldhint" style="margin-top:8px;">0 = sin molestia (sigue igual). 1-2 = monitorizar. 3-4 = se reduce/ajusta la carga. Más de 4 = el motor detiene la progresión hasta comprobar evolución. Esto no es un diagnóstico ni sustituye la valoración de un profesional.</div>
  `;
  function renderList(){
    const box = document.getElementById('limList');
    if(!state.limitations.length){ box.innerHTML='<div class="fieldhint">Ninguna limitación registrada.</div>'; return; }
    box.innerHTML = state.limitations.map(l=>`
      <div class="limitem">
        <div><b>${l.label||l.area}</b><div class="meta">Molestia actual: ${l.discomfort}/10</div></div>
        <button data-id="${l.id}">✕</button>
      </div>`).join('');
    box.querySelectorAll('button[data-id]').forEach(b=>{
      b.onclick = ()=>{
        state.limitations = state.limitations.filter(l=>l.id!==b.dataset.id);
        markConfigDirty(); saveState(); renderList();
      };
    });
  }
  renderList();
  document.getElementById('addLimBtn').onclick = ()=>{
    const area = document.getElementById('lim_area').value;
    if(area==='ninguna') return;
    const disc = parseInt(document.getElementById('lim_disc').value)||0;
    const existing = state.limitations.find(l=>l.area===area);
    if(existing) existing.discomfort = disc;
    else state.limitations.push({id:'lim-'+Date.now(), area, label:area.charAt(0).toUpperCase()+area.slice(1), discomfort:disc});
    markConfigDirty(); saveState(); renderList();
    toast('Limitación guardada');
  };
}

function renderPlanActionBtn(){
  const btn = document.getElementById('planActionBtn');
  if(!f12ActiveRace()){btn.textContent='Crear mi primera carrera';btn.onclick=f13_2_openRaceForm;return;}
  if(!state.planCurrent){
    btn.textContent = 'Generar plan';
    btn.onclick = ()=>{ ensurePlan(); toast('Plan generado'); renderAll(); };
  } else {
    btn.textContent = 'Recalcular plan futuro';
    btn.onclick = ()=>{
      showConfirm('Recalcular plan futuro', 'Se conservará todo tu historial y las sesiones ya realizadas. Solo se regenerarán las sesiones futuras.', ()=>{
        recalcFuture('Recalculado manualmente desde Perfil.');
        toast('Plan futuro recalculado');
        renderAll();
      });
    };
  }
}

/* ---- 7h) Navegación ---- */
function initTabs(){
  document.querySelectorAll('.tabbtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tabbtn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
      if(btn.dataset.tab==='progreso') renderCharts();
    });
  });
}

/* ---- 7i) Render global ---- */
function renderAll(){
  f12EnsureState();
  const empty=state.races.length===0;
  // Ocultar también los paneles previamente renderizados de otra cuenta.
  for(const id of ['tab-hoy','tab-plan','tab-progreso']){
    for(const child of document.getElementById(id).children){
      if(child.id==='activeRaceCard') continue;
      if(empty && !child.hasAttribute('data-onboarding-display')){
        child.setAttribute('data-onboarding-display',child.style.display);child.style.display='none';
      }else if(!empty && child.hasAttribute('data-onboarding-display')){
        child.style.display=child.getAttribute('data-onboarding-display');child.removeAttribute('data-onboarding-display');
      }
    }
  }
  renderActiveRace();
  renderRaces();
  if(!state.planCurrent){
    document.getElementById('statusBar').innerHTML='';
    document.getElementById('todayCard').innerHTML = '<div class="card empty">Todavía no tienes un plan. Ve a la pestaña Perfil y pulsa "Generar plan".</div>';
    document.getElementById('nextCard').innerHTML='';
    document.getElementById('estHeadline').textContent='--';
    document.getElementById('scenarioRow').innerHTML='';
    document.getElementById('adherenceBox').innerHTML='';
    renderWeight();
    renderAccountForm();
    renderUsersForm();
    renderAppearanceForm();
    renderProfileForm(); renderGoalForm(); renderAvailabilityForm(); renderActivitiesForm(); renderLimitationsForm();
    renderPlanActionBtn();
    return;
  }
  runPendingWeeklyReviews();
  renderStatusBar();
  renderRing();
  renderEstimate();
  renderCheckin();
  renderTodayNext();
  renderAdherence();
  renderWeight();
  renderDirtyBanner();
  renderCalendar();
  renderCharts();
  renderAdaptationLog();
  renderLegacyHistory();
  renderAccountForm();
  renderUsersForm();
  renderAppearanceForm();
  renderProfileForm(); renderGoalForm(); renderAvailabilityForm(); renderActivitiesForm(); renderLimitationsForm();
  renderPlanActionBtn();
}

/* Parsea el hash que Supabase añade al volver del enlace de recuperación de
   email: #access_token=...&refresh_token=...&type=recovery&... */
function f13_2_parseRecoveryHash(){
  const hash = window.location.hash || '';
  if(!hash || hash.indexOf('type=recovery')===-1) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if(!access_token) return null;
  return { access_token, refresh_token, expires_at: Math.floor(Date.now()/1000)+3600 };
}
let f13_2_pendingRecovery = null;

function f14_2_startApp(){
  initTabs();
  applyTheme(state.theme.mode, state.theme.palette);

  /* F13.2.1: Auth como puerta de entrada obligatoria.
     ensurePlan() SÍ se llama aquí, de forma síncrona, exactamente como en
     F13.1 — no pinta nada en pantalla, solo prepara 'state.planCurrent'
     (necesario como posible ORIGEN de migración si esta cuenta inicia
     sesión por primera vez desde este navegador). Lo que SÍ se difiere es
     todo lo que pinta la UI real (renderAll/renderCharts): la app
     permanece oculta (#appRoot con display:none) y solo se ve la puerta
     (#authGate) hasta que remoteAuth confirme una sesión real. */
  ensurePlan();

  // Enlace de recuperación de contraseña: se detecta ANTES que cualquier
  // otra cosa (incluida restoreSession), y muestra directamente el
  // formulario de nueva contraseña en vez del login normal.
  f13_2_pendingRecovery = f13_2_parseRecoveryHash();
  if(f13_2_pendingRecovery){
    renderAuthGate('recovery');
    return; // no intentar restoreSession todavía: primero hay que fijar la nueva contraseña
  }

  renderAuthGate('signin');

  remoteAuth.restoreSession().then(user=>{
    if(user){
      return f13_2_syncAfterAuth(user, {isNewSignup:false});
    }
    // Sin sesión válida: la puerta se queda tal cual, a la espera de login/registro.
  }).catch(()=>{ /* sin red o sesión inválida: la puerta se queda visible */ });
}
if(document.readyState==='loading') window.addEventListener('DOMContentLoaded',f14_2_startApp,{once:true});
else f14_2_startApp();
