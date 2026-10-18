window.renderProductsAdmin=function(rows){
  window.adminProducts=rows;
  document.getElementById('productTable').innerHTML=rows.length?`<table><thead><tr><th>FABRIC</th><th>SKU</th><th>TYPE</th><th>PRICE / M</th><th>AVAILABLE</th><th>STORE</th><th>PAIRINGS</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.sku)}</td><td>${esc(p.type)}</td><td>₹${Number(p.price).toLocaleString('en-IN')}</td><td>${esc(p.stock)} m</td><td><span class="row-status">${p.active?'Published':'Hidden'}</span></td><td><span class="pairing-count">${(p.pairedIds||[]).length?`${p.pairedIds.length} selected`:'None selected'}</span><button class="pairing-manage" type="button" onclick="openPairingEditor('${esc(p.id)}')">Choose matches</button></td><td><button onclick="editProduct('${esc(p.id)}')">Edit</button> <button onclick="togglePublished('${esc(p.id)}',${!p.active})">${p.active?'Unpublish':'Publish'}</button> <button class="danger" onclick="deleteProduct('${esc(p.id)}')">Remove</button></td></tr>`).join('')}</tbody></table>`:'<div class="empty-state">Add your first fabric to curate product matches.</div>';
};
function openPairingEditor(id){
  const product=(window.adminProducts||[]).find(p=>p.id===id),editor=document.getElementById('pairingEditor');
  if(!product)return;
  editor.dataset.productId=id;
  document.getElementById('pairingTitle').textContent=`Choose matches for ${product.name}`;
  document.getElementById('pairingHelp').textContent='Customers will see these fabrics under “Pair it with” on this product page. Choose up to four.';
  const selected=new Set(product.pairedIds||[]),others=(window.adminProducts||[]).filter(p=>p.id!==id&&p.active);
  document.getElementById('pairingChoices').innerHTML=others.length?others.map(p=>`<label class="pairing-choice"><input type="checkbox" value="${esc(p.id)}" ${selected.has(p.id)?'checked':''}><img src="${esc(p.image||'')}" alt=""><span><b>${esc(p.name)}</b><small>${esc(p.type)} · ${esc(p.colour)} · ₹${Number(p.price).toLocaleString('en-IN')} / m</small></span><i>✓</i></label>`).join(''):'<p class="pairing-empty">There are no other active fabrics yet. Add and publish more fabrics first.</p>';
  document.getElementById('pairingMessage').textContent='';
  editor.hidden=false;
  editor.querySelectorAll('input[type=checkbox]').forEach(input=>input.addEventListener('change',()=>{
    const checked=[...editor.querySelectorAll('input[type=checkbox]:checked')];
    if(checked.length>4){input.checked=false;document.getElementById('pairingMessage').textContent='You can choose up to four coordinating fabrics.'}
    updatePairingCount();
  }));
  updatePairingCount();editor.scrollIntoView({behavior:'smooth',block:'center'});
}
function updatePairingCount(){
  const count=document.querySelectorAll('#pairingChoices input:checked').length;
  document.getElementById('pairingCount').textContent=`${count} of 4 selected`;
  document.getElementById('savePairingsButton').disabled=count>4;
}
function closePairingEditor(){document.getElementById('pairingEditor').hidden=true}
async function saveProductPairings(){
  const editor=document.getElementById('pairingEditor'),id=editor.dataset.productId,button=document.getElementById('savePairingsButton'),message=document.getElementById('pairingMessage');
  const productIds=[...editor.querySelectorAll('input[type=checkbox]:checked')].map(input=>input.value);
  if(productIds.length>4){message.textContent='Choose four fabrics or fewer.';return}
  button.disabled=true;button.textContent='Saving…';message.textContent='';
  try{
    const result=await api(`/api/admin/products/${encodeURIComponent(id)}/pairings`,{method:'PUT',body:JSON.stringify({productIds})});
    const product=(window.adminProducts||[]).find(p=>p.id===id);if(product)product.pairedIds=result.pairedIds;
    message.textContent='Saved. These matches are now live on the product page.';
    renderProductsAdmin(window.adminProducts||[]);
    setTimeout(()=>{if(editor.dataset.productId===id)closePairingEditor()},900);
  }catch(error){
    message.textContent=/api route not found|cannot put|not found/i.test(error.message)
      ?'The website server needs a restart to enable saving matches. Stop it with Ctrl+C in its terminal, then run npm start in this project folder and refresh Admin Studio.'
      :error.message;
  }
  finally{button.disabled=false;button.textContent='Save matches ↗'}
}
