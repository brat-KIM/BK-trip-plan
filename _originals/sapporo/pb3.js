
window.SP_PB=function(){
  var LS={get:function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
          set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  var ICON_PLAY='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>';
  var ICON_STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/></svg>';
  var ICON_STAR_O='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  var RED=['止まれ','一時停止','進入禁止','通行止め','駐車禁止','駐停車禁止','右折禁止','Uターン禁止','追越し禁止','月極'];

  var cats=D.map(function(c){
    var items=c.s.trim().split('\n').filter(function(l){return l.trim()}).map(function(l,i){
      var p=l.split('|');
      return {id:c.id+'-'+i,ko:(p[0]||'').trim(),jp:(p[1]||'').trim(),pr:(p[2]||'').trim(),tip:(p[3]||'').trim(),cat:c};
    });
    return {id:c.id,g:c.g,t:c.t,c:c.c,n:c.n,items:items};
  });
  var all=[];cats.forEach(function(c){all=all.concat(c.items)});
  var byId={};all.forEach(function(it){byId[it.id]=it});

  var favs=new Set(LS.get('jpbook-favs',[]));
  var slow=!!LS.get('jpbook-slow',false);
  var mode='all', q='';

  var list=document.getElementById('pb-list'), chips=document.getElementById('pb-chips'),
      count=document.getElementById('pb-count'), empty=document.getElementById('pb-empty'),
      input=document.getElementById('pb-q'), qclear=document.getElementById('pb-qclear'),
      speedBtn=document.getElementById('pb-speed');

  function esc(s){return String(s).replace(/[&<>"]/g,function(ch){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]})}
  function norm(s){return String(s).toLowerCase().replace(/[\s\-·~ー、。・/()（）?!？！]/g,'')}

  /* render */
  var html='';
  cats.forEach(function(c){
    html+='<section class="pb-cat'+(c.id==='sign'?' pb-sign-cat':'')+'" id="c-'+c.id+'" data-cat="'+c.id+'">'+
      '<div class="pb-cat-h"><span class="pb-eyebrow">'+esc(c.g)+' · '+c.items.length+'개</span>'+
      '<div class="pb-plate"><h2>'+esc(c.t)+'</h2></div>'+
      (c.n?'<p class="pb-note">'+esc(c.n)+'</p>':'')+'</div><ul class="pb-rows">';
    c.items.forEach(function(it){
      var red=c.id==='sign'&&RED.indexOf(it.jp)>-1;
      it.key=norm(it.ko+it.jp+it.pr+it.tip);
      html+='<li class="pb-row" data-id="'+it.id+'">'+
        '<button class="pb-open" type="button" data-act="show">'+
          '<span class="pb-ko">'+esc(it.ko)+'</span>'+
          '<span class="pb-jp'+(red?' pb-red':'')+'" lang="ja">'+esc(it.jp)+'</span>'+
          '<span class="pb-pr">'+esc(it.pr)+'</span>'+
          (it.tip?'<span class="pb-tip">'+esc(it.tip)+'</span>':'')+
        '</button>'+
        '<div class="pb-acts">'+
          '<button class="pb-ib pb-spk" type="button" data-act="say" aria-label="일본어로 듣기">'+ICON_PLAY+'</button>'+
          '<button class="pb-ib pb-star" type="button" data-act="fav" aria-label="저장" aria-pressed="false">'+ICON_STAR_O+'</button>'+
        '</div></li>';
    });
    html+='</ul></section>';
  });
  list.innerHTML=html;

  var rowEls={};
  Array.prototype.forEach.call(list.querySelectorAll('.pb-row'),function(r){rowEls[r.dataset.id]=r});
  var secEls={};
  Array.prototype.forEach.call(list.querySelectorAll('.pb-cat'),function(s){secEls[s.dataset.cat]=s});

  function paintStar(id){
    var b=rowEls[id]&&rowEls[id].querySelector('.pb-star'); if(!b)return;
    var on=favs.has(id); b.setAttribute('aria-pressed',on?'true':'false');
    b.setAttribute('aria-label',on?'저장 해제':'저장'); b.innerHTML=on?ICON_STAR:ICON_STAR_O;
  }
  all.forEach(function(it){if(favs.has(it.id))paintStar(it.id)});

  /* chips */
  var chipHtml='<button class="pb-chip pb-on" type="button" data-chip="all">전체</button>'+
               '<button class="pb-chip pb-fav" type="button" data-chip="fav">★ 저장한 표현</button>';
  cats.forEach(function(c){chipHtml+='<button class="pb-chip" type="button" data-chip="'+c.id+'">'+esc(c.c)+'</button>'});
  chips.innerHTML=chipHtml;
  function setChip(key){
    Array.prototype.forEach.call(chips.querySelectorAll('.pb-chip'),function(b){b.classList.toggle('pb-on',b.dataset.chip===key)});
    var on=chips.querySelector('.pb-chip.pb-on');
    if(on){var l=on.offsetLeft-16; chips.scrollTo({left:Math.max(0,l),behavior:'smooth'})}
  }

  /* filter */
  function apply(){
    var nq=norm(q), shown=0;
    cats.forEach(function(c){
      var any=0;
      c.items.forEach(function(it){
        var ok=(mode!=='fav'||favs.has(it.id))&&(!nq||it.key.indexOf(nq)>-1);
        rowEls[it.id].hidden=!ok; if(ok){any++;shown++}
      });
      secEls[c.id].hidden=!any;
    });
    var label=mode==='fav'?'저장한 표현 ':'';
    count.textContent=(q?('‘'+q+'’ 검색 결과 '):label)+shown+'개'+(!q&&mode==='all'?' 표현 · '+cats.length+'개 카테고리':'');
    if(!shown){
      empty.hidden=false;
      empty.textContent=mode==='fav'&&!q?'아직 저장한 표현이 없어요. 문장 옆 ☆를 누르면 여기에 모여요.':'검색 결과가 없어요. 한글 뜻, 일본어, 발음 어느 걸로든 찾을 수 있어요.';
    } else empty.hidden=true;
  }

  chips.addEventListener('click',function(e){
    var b=e.target.closest('.pb-chip'); if(!b)return;
    var k=b.dataset.chip;
    if(k==='fav'){mode='fav';setChip('fav');apply();window.scrollTo({top:document.getElementById('pb-bar').offsetTop,behavior:'smooth'});return}
    if(mode==='fav'){mode='all';apply()}
    setChip(k);
    if(k==='all'){document.getElementById('talk').scrollIntoView({behavior:'smooth'});return}
    var s=secEls[k]; if(s&&!s.hidden)s.scrollIntoView({behavior:'smooth',block:'start'});
  });

  var tmr;
  input.addEventListener('input',function(){
    q=input.value.trim(); qclear.hidden=!q;
    clearTimeout(tmr); tmr=setTimeout(apply,120);
  });
  qclear.addEventListener('click',function(){input.value='';q='';qclear.hidden=true;apply();input.focus()});

  /* speech */
  var canSpeak=('speechSynthesis' in window)&&('SpeechSynthesisUtterance' in window);
  var jaVoice=null;
  function pickVoice(){
    try{var vs=speechSynthesis.getVoices()||[];
      jaVoice=vs.filter(function(v){return /^ja/i.test(v.lang)})[0]||null;}catch(e){}
  }
  if(canSpeak){pickVoice(); try{speechSynthesis.onvoiceschanged=pickVoice}catch(e){}}
  function cleanJP(t){return t.replace(/〇〇/g,'').replace(/\s*\/\s*/g,'、').replace(/[()（）]/g,'、').replace(/(SA|PA|ETC|ATM|USB|NOC)/g,function(m){return m.split('').join(' ')})}
  function speak(t){
    if(!canSpeak)return;
    try{
      speechSynthesis.cancel();
      var u=new SpeechSynthesisUtterance(cleanJP(t));
      u.lang='ja-JP'; if(jaVoice)u.voice=jaVoice;
      u.rate=slow?0.6:0.9;
      speechSynthesis.speak(u);
    }catch(e){}
  }
  function paintSpeed(){speedBtn.setAttribute('aria-pressed',slow?'true':'false');speedBtn.textContent=slow?'음성 느리게':'음성 보통'}
  paintSpeed();
  if(!canSpeak){speedBtn.hidden=true;Array.prototype.forEach.call(document.querySelectorAll('.pb-spk'),function(b){b.hidden=true});document.getElementById('pb-show-spk').hidden=true}
  speedBtn.addEventListener('click',function(){slow=!slow;LS.set('jpbook-slow',slow);paintSpeed()});

  /* show overlay */
  var show=document.getElementById('pb-show'), sJp=document.getElementById('pb-show-jp'), sPr=document.getElementById('pb-show-pr'),
      sKo=document.getElementById('pb-show-ko'), sTip=document.getElementById('pb-show-tip'), cur=null, lastFocus=null;
  function openShow(it){
    cur=it; lastFocus=document.activeElement;
    sJp.textContent=it.jp; sPr.textContent=it.pr; sKo.textContent=it.ko;
    sTip.hidden=!it.tip; sTip.textContent=it.tip||'';
    show.hidden=false; document.body.style.overflow='hidden';
    document.getElementById('pb-show-close').focus();
  }
  function closeShow(){
    show.hidden=true; document.body.style.overflow='';
    try{speechSynthesis.cancel()}catch(e){}
    if(lastFocus&&lastFocus.focus)lastFocus.focus();
  }
  document.getElementById('pb-show-close').addEventListener('click',closeShow);
  document.getElementById('pb-show-spk').addEventListener('click',function(){if(cur)speak(cur.jp)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!show.hidden)closeShow()});

  list.addEventListener('click',function(e){
    var b=e.target.closest('[data-act]'); if(!b)return;
    var row=b.closest('.pb-row'); var it=byId[row.dataset.id]; if(!it)return;
    var a=b.dataset.act;
    if(a==='show')openShow(it);
    else if(a==='say')speak(it.jp);
    else if(a==='fav'){
      if(favs.has(it.id))favs.delete(it.id);else favs.add(it.id);
      LS.set('jpbook-favs',Array.from(favs)); paintStar(it.id);
      if(mode==='fav')apply();
    }
  });

  /* 스크롤 위치에 맞춰 칩 표시 */
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(ents){
      if(mode==='fav'||q)return;
      ents.forEach(function(en){if(en.isIntersecting)setChip(en.target.dataset.cat)});
    },{rootMargin:'-200px 0px -60% 0px'});
    Object.keys(secEls).forEach(function(k){io.observe(secEls[k])});
  }

  apply();
};
