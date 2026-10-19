// ZGG 全站统一增强脚本：滚动进度条 + 卡片入场动效 + 数字滚动
(function(){
  if(document.getElementById('zggProgress'))return;

  // 1) 顶部滚动进度条
  var bar=document.createElement('div');bar.id='zggProgress';
  document.body.appendChild(bar);
  function onScroll(){
    var h=document.documentElement.scrollHeight-window.innerHeight;
    bar.style.width=(h>0?(window.scrollY/h)*100:0)+'%';
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  // 2) 元素入场：给主要区块加淡入上浮
  var sel='.card,.proj,.station,.sec,.room,.pillar,.rule,.slogan,.me-card,.form,.t10,.sk,.co-item,.cert-item';
  var nodes=[].slice.call(document.querySelectorAll(sel));
  nodes.forEach(function(n,i){
    if(n.dataset.zggIn)return;n.dataset.zggIn='1';
    n.style.opacity='0';n.style.transform='translateY(14px)';
    n.style.transition='opacity .5s cubic-bezier(.22,.9,.3,1), transform .5s cubic-bezier(.22,.9,.3,1)';
    n.style.transitionDelay=Math.min(i*35,320)+'ms';
  });
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){
      es.forEach(function(e){if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='none';io.unobserve(e.target);}});
    },{rootMargin:'0px 0px -6% 0px',threshold:.06});
    nodes.forEach(function(n){io.observe(n)});
  }else{nodes.forEach(function(n){n.style.opacity='1';n.style.transform='none';});}

  // 3) 平滑锚点
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t=document.querySelector(a.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });
})();
