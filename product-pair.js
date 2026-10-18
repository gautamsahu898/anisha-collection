function renderPairSet(){
  const section=document.querySelector('#pairSection'),base=document.querySelector('#pairBase'),host=document.querySelector('#pairSuggestions');
  if(!section||!product)return;
  const pairedIds=Array.isArray(product.pairedIds)?product.pairedIds:[],byId=new Map(allProducts.map(p=>[p.id,p])),similar=pairedIds.map(pairId=>byId.get(pairId)).filter(p=>p&&p.active!==false&&Number(p.stock)>0).slice(0,4);
  if(!similar.length){section.hidden=true;return}
  section.hidden=false;
  const min=Math.max(.1,Number(product.min_qty)||1),step=Math.max(.1,Number(product.step)||.5);
  base.innerHTML=`<div class="pair-base-image"><img src="${esc(product.image||'')}" alt=""></div><div class="pair-base-copy"><span class="pair-selected-label">YOUR SELECTED FABRIC</span><b>${esc(product.name)}</b><small>${money(product.price)} / m · ${Number(product.stock)} m available</small></div><label class="pair-qty">Metres<input id="pairBaseQty" type="number" min="${min}" step="${step}" value="${min}"></label>`;
  host.innerHTML=similar.map(p=>{
    const pmin=Math.max(.1,Number(p.min_qty)||1),pstep=Math.max(.1,Number(p.step)||.5),unavailable=Number(p.stock)<pmin;
    return `<article class="pair-card ${unavailable?'unavailable':''}" data-pair-card="${esc(p.id)}"><label class="pair-check"><input type="checkbox" data-pair-check="${esc(p.id)}" ${unavailable?'disabled':''} aria-label="Add ${esc(p.name)} to fabric set"><span></span></label><a class="pair-photo" href="product.html?id=${encodeURIComponent(p.id)}"><img src="${esc(p.image||'')}" alt="${esc(p.name)}"></a><div class="pair-card-copy"><p class="eyebrow">${esc(p.type)} · ${esc(p.colour)}</p><a href="product.html?id=${encodeURIComponent(p.id)}" class="pair-name">${esc(p.name)}</a><b>${money(p.price)} <small>/ m</small></b><small class="pair-stock">${unavailable?'Currently unavailable':`${Number(p.stock)} m available`}</small><label class="pair-qty">Set metres<input type="number" data-pair-qty="${esc(p.id)}" min="${pmin}" step="${pstep}" value="${pmin}" ${unavailable?'disabled':''}></label></div></article>`
  }).join('');
  document.querySelector('#pairBaseQty').addEventListener('input',updatePairSet);
  host.querySelectorAll('[data-pair-check],[data-pair-qty]').forEach(control=>control.addEventListener('input',()=>{
    if(control.matches('[data-pair-check]')){
      const qty=host.querySelector(`[data-pair-qty="${CSS.escape(control.dataset.pairCheck)}"]`);
      if(qty)qty.disabled=!control.checked;
    }
    updatePairSet();
  }));
  document.querySelector('#addPairSet').onclick=addPairSet;
  updatePairSet();
}
function steppedQuantity(input,p){
  const min=Math.max(.1,Number(p.min_qty)||1),step=Math.max(.1,Number(p.step)||.5),value=Number(input.value);
  if(!Number.isFinite(value)||value<min)return min;
  return Number((min+Math.ceil((value-min)/step-1e-9)*step).toFixed(2));
}
function getPairSelection(){
  const baseInput=document.querySelector('#pairBaseQty'),baseQty=steppedQuantity(baseInput,product);
  if(baseInput.value!==String(baseQty))baseInput.value=baseQty;
  const selected=[{product,qty:baseQty,base:true}];
  document.querySelectorAll('[data-pair-check]:checked').forEach(check=>{
    const p=allProducts.find(x=>x.id===check.dataset.pairCheck);
    if(!p)return;
    const input=document.querySelector(`[data-pair-qty="${CSS.escape(p.id)}"]`),qty=steppedQuantity(input,p);
    if(input.value!==String(qty))input.value=qty;
    selected.push({product:p,qty,base:false});
  });
  return selected;
}
function updatePairSet(){
  if(!product||!document.querySelector('#pairSetCount'))return;
  const rows=getPairSelection(),companions=rows.length-1;
  let total=0,metres=0,valid=true;
  for(const row of rows){
    const already=Number(cart.find(x=>x.id===row.product.id)?.qty||0),available=Number(row.product.stock)-already;
    total+=row.qty*Number(row.product.price);metres+=row.qty;if(row.qty>available)valid=false;
  }
  document.querySelector('#pairSetCount').textContent=companions?`${rows.length} fabrics · ${metres.toFixed(metres%1?1:0)} m combined`:'Select a coordinating fabric below';
  document.querySelector('#pairSetTotal').textContent=money(Math.round(total));
  const button=document.querySelector('#addPairSet');
  button.disabled=!companions||!valid;
  button.textContent=!companions?'Choose a fabric to build your set':valid?'Add fabric set to bag ↗':'Reduce metres to match available stock';
  document.querySelector('#pairSetNote').textContent=valid?'Includes your selected fabric and the coordinating items you chose.':'One or more quantities exceed available stock. Adjust the metres to continue.';
}
function addPairSet(){
  const rows=getPairSelection();if(rows.length<2)return;
  for(const row of rows){
    const available=Number(row.product.stock)-(cart.find(x=>x.id===row.product.id)?.qty||0);
    if(row.qty>available){toast(`Only ${Math.max(0,available)} m of ${row.product.name} available`);updatePairSet();return}
  }
  for(const row of rows){
    const existing=cart.find(x=>x.id===row.product.id);
    if(existing)existing.qty=Number((existing.qty+row.qty).toFixed(2));else cart.push({id:row.product.id,qty:row.qty});
  }
  localStorage.setItem('ac-cart',JSON.stringify(cart));
  toast(`${rows.length} fabrics added · ${money(Math.round(rows.reduce((sum,row)=>sum+row.qty*Number(row.product.price),0)))}`);
  calculate();updatePairSet();
}
