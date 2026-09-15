'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const modes = {random:'帮我拍板',heart:'听听内心',compare:'认真比较'};
  const templates = {
    food:{question:'今晚吃什么？',options:['火锅','日料','来碗面'],mode:'heart',criteria:['想吃程度','价格合适','方便程度']},
    buy:{question:'要不要买这个东西？',options:['买，安排上','先不买，过几天再看'],mode:'heart',criteria:['符合预算','实际需要','长期满意度']},
    color:{question:'MacBook 买什么颜色？',options:['银色','黑色'],mode:'heart',criteria:['喜欢程度','日常耐看','容易打理']},
    move:{question:'今晚健身还是休息？',options:['去健身','好好休息'],mode:'heart',criteria:['符合身体状态','时间合适','当下意愿']},
    travel:{question:'周末去哪里？',options:['去海边走走','去山里放空','在城里逛逛'],mode:'random',criteria:['期待程度','预算合适','交通方便']},
    project:{question:'这个项目选哪个方案？',options:['方案 A','方案 B'],mode:'compare',criteria:['目标匹配','实施速度','成本合适']}
  };
  let sequence = 0;
  const makeOptions = labels => labels.map(label => ({id:`option-${++sequence}`,label}));
  const makeCriteria = (names,options) => names.map(name => ({name,weight:2,scores:Object.fromEntries(options.map(o=>[o.id,3]))}));
  const state = {question:templates.food.question,options:makeOptions(templates.food.options),mode:'heart',template:'food',criteria:[],phase:'empty',result:null,busy:false};
  state.criteria=makeCriteria(templates.food.criteria,state.options);
  function renderOptions(focusId) {
    $('#options').innerHTML=state.options.map((o,i)=>`<div class="option-row"><span class="option-letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><input class="option-input" data-option="${o.id}" aria-label="选项 ${String.fromCharCode(65+i)}" maxlength="60" autocomplete="off" placeholder="写下一个选项" value="${esc(o.label)}"><button class="remove-option" type="button" data-remove="${o.id}" aria-label="删除选项 ${String.fromCharCode(65+i)}" ${state.options.length<=2?'disabled':''}>×</button></div>`).join('');
    $('#option-count').textContent=`${state.options.length} / 8`;
    $('#add-option').disabled=state.options.length>=8;
    if(focusId) document.querySelector(`[data-option="${focusId}"]`).focus();
  }
  function renderMode() {
    $$('input[name="mode"]').forEach(input=>{input.checked=input.value===state.mode;input.closest('.mode').classList.toggle('selected',input.checked);});
    $('#pick-label').textContent=state.mode==='compare'?'看看哪个更适合':'帮我选一个';
    $('#result-mode').textContent=modes[state.mode];
    $('#form-footnote').textContent={heart:'先给你一个答案，再听听你心里的声音。',random:'每个选项机会相同。只留下你愿意考虑的选项。',compare:'按你填写的分数与重要程度计算，选择依然由你决定。'}[state.mode];
    const tips={heart:['答案出现的那一刻，留意一下自己。','是松了一口气，还是有一点失望？这个反应，也许比答案本身更有用。'],random:['先排除做不到的，再交给一点随机。','每个选项机会相同；重新抽取，也可能遇到同一个答案。'],compare:['你最在意的事，值得更多分量。','所有因素都按“越高越合适”评分。比如成本合适度：越符合预算，分数越高。']};
    $('#tip-title').textContent=tips[state.mode][0];$('#tip-copy').textContent=tips[state.mode][1];renderComparison();
  }
  function renderComparison() {
    const panel=$('#comparison');panel.hidden=state.mode!=='compare';if(panel.hidden)return;
    panel.innerHTML=`<div class="comparison-heading"><h3>给在意的事，一点分量</h3><span>1 分低 · 5 分高</span></div><p class="compare-note">分数初始为 3。请按实际情况调整；重要程度越高，对结果影响越大。</p>`+state.criteria.map((c,ci)=>`<section class="criterion"><div class="criterion-top"><input class="criterion-name" data-criterion="${ci}" value="${esc(c.name)}" aria-label="比较因素 ${ci+1}" maxlength="24"><label class="weight-label">重要程度<select data-weight="${ci}" aria-label="因素 ${ci+1} 的重要程度">${[1,2,3].map(w=>`<option value="${w}" ${c.weight===w?'selected':''}>${{1:'一般 ×1',2:'重要 ×2',3:'很重要 ×3'}[w]}</option>`).join('')}</select></label></div><div class="score-list">${state.options.map((o,oi)=>`<div class="score-row"><span class="score-name" data-score-name="${o.id}">${esc(o.label||`选项 ${String.fromCharCode(65+oi)}`)}</span><div class="score-buttons" role="group" aria-label="选项 ${String.fromCharCode(65+oi)} 在因素 ${ci+1} 的评分">${[1,2,3,4,5].map(score=>`<button type="button" data-score="${score}" data-ci="${ci}" data-id="${o.id}" aria-label="${score} 分" aria-pressed="${c.scores[o.id]===score}" class="${c.scores[o.id]===score?'selected':''}">${score}</button>`).join('')}</div></div>`).join('')}</div></section>`).join('');
  }
  function showError(message) {$('#form-error').textContent=message;$('#form-error').hidden=!message;}
  function invalidate() {state.result=null;state.phase='empty';showError('');renderResult();}
  function markCustom() {state.template=null;renderTemplates();}
  function renderTemplates() {$$('.template').forEach(el=>{const active=el.dataset.template===state.template;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});}
  function applyTemplate(name) {
    if(state.busy)return;const t=templates[name];if(!t)return;
    state.question=t.question;state.options=makeOptions(t.options);state.mode=t.mode;state.template=name;state.criteria=makeCriteria(t.criteria,state.options);
    $('#question').value=state.question;renderOptions();renderMode();renderTemplates();invalidate();
  }
  function validate() {
    if(!state.question.trim())throw Error('先写下你在纠结什么吧。');
    if(state.options.length<2||state.options.length>8)throw Error('请保留 2–8 个选项。');
    if(state.options.some(o=>!o.label.trim()))throw Error('还有空白选项，填好或删除后再开始。');
    if(new Set(state.options.map(o=>o.label.trim().normalize('NFKC').toLocaleLowerCase())).size!==state.options.length)throw Error('有重复的选项，换成不同的选择吧。');
    if(state.mode==='compare'&&state.criteria.some(c=>!c.name.trim()))throw Error('请给每个比较因素起一个名字。');
  }
  function randomIndex(length) {
    const values=new Uint32Array(1),limit=Math.floor(4294967296/length)*length;
    do {crypto.getRandomValues(values);}while(values[0]>=limit);return values[0]%length;
  }
  function ranking() {
    const weight=state.criteria.reduce((sum,c)=>sum+c.weight,0);
    return state.options.map(o=>({...o,total:state.criteria.reduce((sum,c)=>sum+c.weight*c.scores[o.id],0),weight})).sort((a,b)=>b.total-a.total);
  }
  function setBusy(busy) {
    state.busy=busy;$$('#decision-form input, #decision-form button, #decision-form select').forEach(el=>el.disabled=busy);
    if(!busy){$('#add-option').disabled=state.options.length>=8;$$('[data-remove]').forEach(el=>el.disabled=state.options.length<=2);}
    $('.result-card').setAttribute('aria-busy',String(busy));$('.result-card').classList.toggle('rolling',busy);
  }
  function resultFocus() {if(window.matchMedia('(max-width: 780px)').matches)$('.result-card').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  async function proposeChoice() {
    if(state.busy)throw Error('正在选择中，请稍等。');validate();showError('');
    state.question=state.question.trim();state.options.forEach(o=>o.label=o.label.trim());
    if(state.mode==='compare') {state.result={ranking:ranking()};state.phase='comparison';renderResult();resultFocus();return readState();}
    setBusy(true);state.phase='rolling';state.result=null;renderResult();resultFocus();
    const selected=state.options[randomIndex(state.options.length)];
    await new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?80:950));
    state.result={choice:selected};state.phase='proposed';setBusy(false);renderResult();return readState();
  }
  const action=(label,name,style='',id='')=>`<button type="button" class="result-action ${style}" data-action="${name}"${id?` data-choice="${id}"`:''}>${label}</button>`;
  function comparisonExplanation(rows) {
    const a=rows[0],b=rows[1];
    const contributions=state.criteria.map(c=>({name:c.name,delta:c.weight*(c.scores[a.id]-c.scores[b.id])})).sort((x,y)=>y.delta-x.delta);
    const positive=contributions.filter(c=>c.delta>0);
    if(!positive.length)return '它在你填写的因素中综合得分更高。';
    return `对比「${b.label}」，它主要在「${positive[0].name}」上更占优势。`;
  }
  function renderResult() {
    const el=$('#result-content');el.classList.remove('entered');document.body.dataset.phase=state.phase;$('.result-card').classList.toggle('confirmed',state.phase==='confirmed');
    if(state.phase==='empty')el.innerHTML=`<div class="question-symbol" aria-hidden="true">${state.mode==='compare'?'≋':'?'}</div><h2 class="empty-title">${state.mode==='compare'?'把偏好，变得清晰。':'你的答案，马上揭晓。'}</h2><p class="result-description">${state.mode==='compare'?'给选项打分，看看哪个更符合<br>你真正看重的事。':'选项不分好坏，先选一个看看。<br>也许你的心里，已经有了答案。'}</p>`;
    else if(state.phase==='rolling')el.innerHTML=`<div class="question-symbol" aria-hidden="true">?</div><h2 class="empty-title">让纠结停一小会儿…</h2><p class="result-description">答案马上出现。留意你的第一反应。</p>`;
    else if(state.phase==='confirmed')el.innerHTML=`<div class="confirmation">${icon('check')}</div><p class="result-eyebrow">决定了，就选</p><h2 class="winner">${esc(state.result.choice.label)}</h2><p class="result-description">把纠结留在这里，<br>去享受你的选择吧。</p><div class="result-actions">${action('开始下一个决定','new','primary')}${action('返回编辑这个问题','edit','subtle')}</div>`;
    else if(state.phase==='alternatives')el.innerHTML=`<span class="mode-pill">听到你的声音了</span><h2 class="choose-title">那你，更想选哪个？</h2><p class="result-description">不必接受刚才的答案。<br>选一个你更愿意接受的。</p><div class="result-actions">${state.options.filter(o=>o.id!==state.result.choice.id).map(o=>action(esc(o.label),'confirm','',o.id)).join('')}${action('还是回到刚才的答案','back','subtle')}</div>`;
    else if(state.phase==='uncertain')el.innerHTML=`<span class="mode-pill">还没想好，也没关系</span><h2 class="choose-title">给这个选择，多一点依据。</h2><p class="result-description">可以按在意的因素比较，<br>也可以再给随机一次机会。</p><div class="result-actions">${action('认真比较一下','compare','primary')}${action('重新抽一次','reroll')}${action('返回刚才的答案','back','subtle')}</div>`;
    else if(state.phase==='comparison') {
      const rows=state.result.ranking,top=rows[0],winners=rows.filter(o=>o.total===top.total),tie=winners.length>1;
      el.innerHTML=`<p class="result-eyebrow">${tie?'这一次，得分并列':'按你的偏好，更适合的是'}</p><h2 class="winner">${tie?'各有千秋':esc(top.label)}</h2><p class="result-description">${tie?'这些选项得分相同。可以亲自选定一个，或调整重要程度。':esc(comparisonExplanation(rows))}</p><div class="ranking">${rows.map(o=>`<div><div class="rank-line"><span>${esc(o.label)}</span><strong>${(o.total/o.weight).toFixed(2)} / 5</strong></div><div class="rank-track"><div class="rank-fill" style="width:${o.total/o.weight/5*100}%"></div></div></div>`).join('')}</div><p class="compare-note">得分 = 各项分数 × 重要程度，再除以重要程度总和。</p><div class="result-actions">${tie?winners.map(o=>action(`选 ${esc(o.label)}`,'confirm','',o.id)).join(''):action('好，就它了','confirm','primary',top.id)}${tie?action('从并列选项中随机选','tie-random'):''}${action('调整分数与重要程度','edit','subtle')}</div>`;
    } else {
      const choice=state.result.choice;
      el.innerHTML=`<p class="result-eyebrow">${state.result.fromTie?'从并列选项中，随机选到了':'这次，选这个'}</p><h2 class="winner">${esc(choice.label)}</h2><p class="result-question">${state.mode==='heart'?'看到这个答案，你的第一反应是？':'一个答案，少一点纠结。'}</p><p class="result-description">${state.mode==='heart'?'欣然接受，还是心里冒出了另一个选项？':'愿意的话，就让这个小决定落地吧。'}</p><div class="result-actions">${action(`${icon('check')}好，就它了`,'confirm','primary',choice.id)}${state.mode==='heart'?action('其实更想选别的','alternatives')+action('还是没感觉','uncertain','subtle'):action(`${icon('refresh')}重新选一次`,state.result.fromTie?'tie-random':'reroll','subtle')}</div>`;
    }
    if(state.phase!=='rolling')requestAnimationFrame(()=>el.classList.add('entered'));
  }
  function confirmChoice(id) {
    if(state.busy)throw Error('请等待答案出现。');let allowed=[];
    if(state.phase==='proposed')allowed=[state.result.choice.id];
    if(state.phase==='alternatives')allowed=state.options.filter(o=>o.id!==state.result.choice.id).map(o=>o.id);
    if(state.phase==='comparison'){const rows=state.result.ranking;allowed=rows.filter(o=>o.total===rows[0].total).map(o=>o.id);}
    if(!allowed.includes(id))throw Error('请先得到答案，或进入其他选项后再确认。');
    state.result={choice:state.options.find(o=>o.id===id)};state.phase='confirmed';renderResult();return readState();
  }
  function pickTied() {
    const rows=ranking(),pool=rows.filter(o=>o.total===rows[0].total);state.result={choice:pool[randomIndex(pool.length)],fromTie:true};state.phase='proposed';renderResult();
  }
  function resetNew() {
    state.question='';state.options=makeOptions(['','']);state.mode='heart';state.template=null;state.criteria=makeCriteria(['喜欢程度','成本合适','实际用途'],state.options);
    $('#question').value='';renderOptions();renderMode();renderTemplates();invalidate();$('#question').focus();
  }
  $('#question').addEventListener('input',e=>{state.question=e.target.value;markCustom();invalidate();});
  $('.templates').addEventListener('click',e=>{const button=e.target.closest('[data-template]');if(button)applyTemplate(button.dataset.template);});
  $('#options').addEventListener('input',e=>{
    const id=e.target.dataset.option;if(!id)return;state.options.find(o=>o.id===id).label=e.target.value;
    $$(`[data-score-name="${id}"]`).forEach(el=>el.textContent=e.target.value||'未命名选项');markCustom();invalidate();
  });
  $('#options').addEventListener('click',e=>{
    const button=e.target.closest('[data-remove]');if(!button||state.options.length<=2||state.busy)return;
    const index=state.options.findIndex(o=>o.id===button.dataset.remove);state.options.splice(index,1);state.criteria.forEach(c=>delete c.scores[button.dataset.remove]);
    markCustom();invalidate();renderOptions(state.options[Math.min(index,state.options.length-1)].id);renderComparison();
  });
  $('#add-option').addEventListener('click',()=>{
    if(state.options.length>=8||state.busy)return;const option=makeOptions([''])[0];state.options.push(option);state.criteria.forEach(c=>c.scores[option.id]=3);
    markCustom();invalidate();renderOptions(option.id);renderComparison();
  });
  $$('.mode input').forEach(input=>input.addEventListener('change',()=>{state.mode=input.value;renderMode();invalidate();}));
  $('#comparison').addEventListener('input',e=>{if(e.target.dataset.criterion!==undefined){state.criteria[Number(e.target.dataset.criterion)].name=e.target.value;invalidate();}});
  $('#comparison').addEventListener('change',e=>{if(e.target.dataset.weight!==undefined){state.criteria[Number(e.target.dataset.weight)].weight=Number(e.target.value);invalidate();}});
  $('#comparison').addEventListener('click',e=>{
    const b=e.target.closest('[data-score]');if(!b)return;state.criteria[Number(b.dataset.ci)].scores[b.dataset.id]=Number(b.dataset.score);
    b.parentElement.querySelectorAll('button').forEach(el=>{const active=el===b;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});invalidate();
  });
  $('#decision-form').addEventListener('submit',async e=>{e.preventDefault();try{await proposeChoice();}catch(error){showError(error.message);$('#form-error').scrollIntoView({block:'nearest'});}});
  $('#result-content').addEventListener('click',async e=>{
    const b=e.target.closest('[data-action]');if(!b||state.busy)return;
    try {switch(b.dataset.action){
      case 'confirm':confirmChoice(b.dataset.choice);break;
      case 'new':resetNew();break;
      case 'alternatives':state.phase='alternatives';renderResult();break;
      case 'uncertain':state.phase='uncertain';renderResult();break;
      case 'back':state.phase='proposed';renderResult();break;
      case 'reroll':await proposeChoice();break;
      case 'tie-random':pickTied();break;
      case 'compare':state.mode='compare';renderMode();invalidate();$('#comparison').scrollIntoView({behavior:'smooth',block:'start'});$('#comparison input').focus({preventScroll:true});break;
      case 'edit':invalidate();(state.mode==='compare'?$('#comparison input'):$('#question')).focus();break;
    }}catch(error){showError(error.message);}
  });
  function readState() {return JSON.parse(JSON.stringify({question:state.question,options:state.options,mode:state.mode,criteria:state.criteria,phase:state.phase,result:state.result}));}
  function configureDecision(input) {
    if(state.busy)throw Error('正在选择中，不能修改选项。');
    if(!input||typeof input!=='object'||typeof input.question!=='string'||!input.question.trim()||input.question.length>100)throw Error('question 必须是 1–100 字的问题。');
    if(!Array.isArray(input.options)||input.options.length<2||input.options.length>8||input.options.some(o=>typeof o!=='string'||!o.trim()||o.length>60))throw Error('options 必须包含 2–8 个非空选项，每个最多 60 字。');
    const labels=input.options.map(o=>o.trim());if(new Set(labels.map(o=>o.normalize('NFKC').toLocaleLowerCase())).size!==labels.length)throw Error('选项不能重复。');
    const mode=input.mode??'heart';if(!Object.hasOwn(modes,mode))throw Error('未知选择模式。');
    if(input.criteria!==undefined&&(!Array.isArray(input.criteria)||input.criteria.length!==3||input.criteria.some(c=>!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>24||![1,2,3].includes(c.weight)||!Array.isArray(c.scores)||c.scores.length!==labels.length||c.scores.some(s=>!Number.isInteger(s)||s<1||s>5))))throw Error('criteria 必须有 3 项，每项提供名称、1–3 的重要程度和每个选项的 1–5 分评分。');
    const options=makeOptions(labels),criteria=input.criteria?input.criteria.map(c=>({name:c.name.trim(),weight:c.weight,scores:Object.fromEntries(options.map((o,i)=>[o.id,c.scores[i]]))})):makeCriteria(['喜欢程度','成本合适','实际用途'],options);
    state.question=input.question.trim();state.options=options;state.mode=mode;state.criteria=criteria;state.template=null;
    $('#question').value=state.question;renderOptions();renderMode();renderTemplates();invalidate();return readState();
  }
  renderOptions();renderMode();renderResult();
  if(document.modelContext?.registerTool){
    const lifecycle=new AbortController();
    const definitions=[
      {name:'get_decision_state',title:'查看当前决定',description:'读取当前问题、选项、比较因素、阶段及结果。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>readState()},
      {name:'configure_decision',title:'设置问题与选项',description:'替换当前问题与选项并清空结果。仅配置，不生成或确认答案。比较模式可批量提供三项因素及所有评分。',inputSchema:{type:'object',properties:{question:{type:'string',minLength:1,maxLength:100},options:{type:'array',minItems:2,maxItems:8,items:{type:'string',minLength:1,maxLength:60}},mode:{type:'string',enum:['random','heart','compare']},criteria:{type:'array',minItems:3,maxItems:3,items:{type:'object',properties:{name:{type:'string',minLength:1,maxLength:24},weight:{type:'integer',minimum:1,maximum:3},scores:{type:'array',items:{type:'integer',minimum:1,maximum:5}}},required:['name','weight','scores'],additionalProperties:false}}},required:['question','options'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:configureDecision},
      {name:'propose_choice',title:'生成选择结果',description:'按当前模式随机给出一个候选，或计算加权比较结果。等待动画完成并显示结果；不会替用户确认选择。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:()=>proposeChoice()},
      {name:'confirm_choice',title:'确认当前候选',description:'确认结果区当前允许选择的候选，进入已决定状态。必须先生成结果；使用当前结果中的 option_id。',inputSchema:{type:'object',properties:{option_id:{type:'string'}},required:['option_id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{if(!input||typeof input.option_id!=='string')throw Error('必须提供 option_id。');return confirmChoice(input.option_id);}}
    ];
    for(const tool of definitions){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
