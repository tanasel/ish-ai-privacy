'use strict';
module.exports.run=({PIIEngine:e})=>{
 const failures=[];let passed=0;
 const check=(value,name)=>value?passed++:failures.push(name);
 const rejects=(fn,name)=>{try{fn();check(false,name);}catch(error){check(error.code==='csv_complex'&&error.errorCategory==='validation'&&error.isRetryable===false,name);}};
 rejects(()=>e.parseNameCSV('first_name,last_name\n'+Array(200).fill('Aa').join(' ')+',Example'),'CSV rejects an excessive field before detection');
 rejects(()=>e.detect('Aa '.repeat(25000),[{first:Array(200).fill('Aa').join(' '),last:'Example'}]),'Direct engine calls have the same name budget');
 rejects(()=>e.detect('General text',Array.from({length:2001},(_,i)=>({first:'Person'+i,last:'Example'}))),'Engine enforces record count');
 const names=[{first:'María José',last:'de la Cruz'},{first:'李',last:'王'},{first:'أحمد',last:'خالد'}];
 const text='María José de la Cruz. 李 王. أحمد خالد.';
 check(e.redact(text,e.detect(text,names))==='[REMOVED]. [REMOVED]. [REMOVED].','Shared-prefix matching preserves compound and multiscript names');
 const prefix=[{first:'Amina',last:'van Dalen'},{first:'Amina',last:'van Dijk'}];
 const d=e.detect('Amina van Dalen met Amina van Dijk.',prefix).filter(x=>x.type==='name');
 check(d.length===2&&d[0].value==='Amina van Dalen'&&d[1].value==='Amina van Dijk','Common prefixes preserve longest complete distinct names');
 const lots=Array.from({length:2000},(_,i)=>({first:'Alex'+String.fromCharCode(65+Math.floor(i/26)%26)+String.fromCharCode(65+i%26),last:'Example'+String.fromCharCode(65+Math.floor(i/676))}));
 const start=Date.now();e.detect('A general school report. '.repeat(3500),lots);
 check(Date.now()-start<5000,'Maximum record count completes within the five-second regression budget');
 return {name:'name-budget',passed,failed:failures.length,failures};
};
