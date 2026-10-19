// ZGG 站点统一数据层 —— Supabase 直连（REST）
const SB_URL='https://dnqswjrevffwdcksnwan.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucXN3anJldmZmd2Rja3Nud2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NjUyMDYsImV4cCI6MjEwNjM0MTIwNn0.ZhJT9M7c6DcNG4gvTQKQEGZ7tic7XYN3eorDUpM3adk';

async function sbInsert(table,row){
  const r=await fetch(`${SB_URL}/rest/v1/${table}`,{
    method:'POST',
    headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
    body:JSON.stringify(row)
  });
  return r.ok;
}
async function sbSelect(table,order='created_at.desc',limit=20){
  const r=await fetch(`${SB_URL}/rest/v1/${table}?select=*&order=${order}&limit=${limit}`,{
    headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY}
  });
  return r.ok?r.json():[];
}
async function sbUpsertReferral(code,name){
  // 读取现有
  const rows=await sbSelect(`referrals?code=eq.${code}`,'created_at.desc',1).catch(()=>[]);
  if(rows&&rows.length){return sbInsert('referrals',{code,name:name||rows[0].name,count:rows[0].count+1});}
  return sbInsert('referrals',{code,name:name||'推荐人 '+code,count:1});
}
