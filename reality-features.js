/* Atlas Reality Extensions
 * Loaded after the existing application. The adapter deliberately uses hooks instead of
 * replacing existing records: candidates are previewed and only explicit apply actions emit
 * atlas:reality:apply. See README for the host integration contract.
 */
(() => {
  'use strict';
  const q = (s, r=document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = p => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
  const state = window.__ATLAS_REALITY__ ||= { drafts: [], travel: [], nationLabels: {}, settings: {labelOrientation:'horizontal'} };
  const emit = (type, detail) => document.dispatchEvent(new CustomEvent(type, {detail}));
  const adapter = () => window.AtlasRealityAdapter || {};
  const mapPoint = e => {
    const c = q('#mapcanvas'); if (!c) return null;
    const r = c.getBoundingClientRect();
    const api = adapter();
    return api.screenToMap ? api.screenToMap(e.clientX-r.left,e.clientY-r.top) : {x:e.clientX-r.left,y:e.clientY-r.top};
  };
  function modal(title, html, actions='') {
    const overlay=q('#modalOverlay'), box=q('#modalBox');
    if (!overlay || !box) return null;
    q('#modalTitle').textContent=title; q('#modalBody').innerHTML=html; q('#modalFoot').innerHTML=actions;
    overlay.classList.add('active'); return overlay;
  }
  function close(){ q('#modalOverlay')?.classList.remove('active'); }
  function travelDialog(){
    const m=modal('移動時間計算', `<div class="helpbox">地図をクリックして出発地点と到着地点を指定できます。計算結果は候補として保存され、既存データは変更しません。</div>
      <div class="formgrid"><div><label>出発地点</label><input id="rtFrom" placeholder="地図をクリック…"></div><div><label>到着地点</label><input id="rtTo" placeholder="地図をクリック…"></div>
      <div><label>移動手段</label><select id="rtMode"><option value="walk">徒歩</option><option value="riding">騎乗</option><option value="march">行軍</option><option value="cart">馬車</option><option value="boat">船</option><option value="sailing">帆船</option></select></div>
      <div><label>出発日(年)</label><input id="rtDate" type="number" value="0"></div><div><label>季節補正</label><select id="rtSeason"><option value="1">標準</option><option value="0.8">冬</option><option value="1.1">夏</option><option value="0.9">雨季</option></select></div><div><label>移動主体</label><input id="rtActor" placeholder="主人公・援軍など"></div></div><div id="rtPreview" class="banner" style="display:none"></div>`, '<button class="btn" data-close>閉じる</button><button class="btn primary" id="rtCalc">候補を計算</button><button class="btn" id="rtApply" disabled>候補を保存</button>');
    let from=null,to=null,last=null;
    const set=(id,p)=>{ q(id).value=`${Math.round(p.x)}, ${Math.round(p.y)}`; };
    const canvas=q('#mapcanvas'); canvas?.addEventListener('click', function pick(e){ const p=mapPoint(e); if(!from){from=p;set('#rtFrom',p);} else {to=p;set('#rtTo',p); canvas.removeEventListener('click',pick);} }, {once:false});
    q('#rtCalc').onclick=()=>{ if(!from||!to){alert('地図上で出発地点と到着地点を指定してください。');return;} const dx=to.x-from.x,dy=to.y-from.y; const straight=Math.hypot(dx,dy); const a=adapter(); const result=a.calculateTravel ? a.calculateTravel({from,to,mode:q('#rtMode').value,season:+q('#rtSeason').value,year:+q('#rtDate').value,actor:q('#rtActor').value}) : {distance:straight,timeDays:straight/(a.speedByMode?.[q('#rtMode').value]||40),route:[from,to],terrainAdjustments:[]}; last={id:uid('travel'),createdAt:new Date().toISOString(),source:'automatic-candidate',from,to,mode:q('#rtMode').value,...result}; const p=q('#rtPreview'); p.style.display='block'; p.innerHTML=`直線距離: <b>${(result.straightDistance||straight).toFixed(1)}</b>　経路距離: <b>${(result.distance||straight).toFixed(1)}</b><br>推定所要時間: <b>${(+result.timeDays||0).toFixed(1)}日</b>　到着日: <b>${(+q('#rtDate').value||0)+Math.ceil(+result.timeDays||0)}</b>`; q('#rtApply').disabled=false; emit('atlas:reality:preview',{kind:'travel',candidate:last}); };
    q('#rtApply').onclick=()=>{ if(!last)return; state.travel.push(last); emit('atlas:reality:apply',{kind:'travel',candidate:last}); close(); };
  }
  function labelDialog(){
    modal('国名表示・飛び地設定', `<div class="helpbox">設定は国家全体ではなく、選択した飛び地(領土コンポーネント)単位で保存されます。</div><label>国家ID</label><input id="nlNation" placeholder="地図上で選択した国家ID"><label>飛び地/領土コンポーネントID</label><input id="nlPart" placeholder="コンポーネントID"><label>表示</label><select id="nlMode"><option value="separate">飛び地ごとに表示</option><option value="merged">この飛び地を選択国家のラベルと統合</option></select><label>国名の向き</label><select id="nlOrientation"><option value="horizontal">横向き</option><option value="territory">領土の向きに合わせる</option></select>`, '<button class="btn" data-close>キャンセル</button><button class="btn primary" id="nlSave">この飛び地に適用</button>');
    q('#nlSave').onclick=()=>{const nation=q('#nlNation').value.trim(),part=q('#nlPart').value.trim();if(!nation||!part)return; const value={nationId:nation,partId:part,mode:q('#nlMode').value,orientation:q('#nlOrientation').value,updatedAt:new Date().toISOString()}; state.nationLabels[`${nation}:${part}`]=value; emit('atlas:reality:apply',{kind:'nation-label',candidate:value}); close();};
  }
  function install(){
    const bar=q('#maptoolbar'); if(!bar || bar.dataset.realityInstalled)return; bar.dataset.realityInstalled='1';
    const sep=document.createElement('span');sep.className='sep'; const t=document.createElement('button');t.className='btn small';t.textContent='移動時間';t.onclick=travelDialog; const l=document.createElement('button');l.className='btn small';l.textContent='国名表示';l.onclick=labelDialog; bar.append(sep,t,l);
    q('#modalOverlay')?.addEventListener('click',e=>{if(e.target.matches('[data-close]')||e.target.id==='modalOverlay')close();});
  }
  window.AtlasReality={state,install,travelDialog,labelDialog,emit};
  new MutationObserver(install).observe(document.body,{childList:true,subtree:true}); install();
})();
