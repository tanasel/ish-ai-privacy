'use strict';
module.exports.run=({PIIEngine:e})=>{
 const failures=[];let passed=0;
 const check=(v,name)=>v?passed++:failures.push(name);
 for(const text of ['Sofia Marin wrote to sofia.marin@example.org.','DOB: 2009/03/09','Home address: 6 Kanaalstraat, Exampletown','File name: "Sofia_Marin_2010.pdf"','Email: 学生@例子.测试']){
  const d=e.detect(text),out=e.redact(text,d);check(out.includes('[REMOVED]'),'Replaces detected details: '+text);check(!out.includes('[['),'No identity codes: '+text);
  check(d.every(x=>!out.includes(text.slice(x.start,x.end))),'Selected spans absent: '+text);
 }
 check(e.redact('ABCDEF',[{start:0,end:4},{start:2,end:6}])==='[REMOVED]','Crossing spans fully removed');
 check(e.redact('ABCDEF',[{start:0,end:6},{start:1,end:3}])==='[REMOVED]','Contained span fully removed');
 check(e.redact('A B A',[{start:0,end:1,type:'name'},{start:2,end:3,type:'email'},{start:4,end:5,type:'name'}])==='[REMOVED] [REMOVED] [REMOVED]','Same generic marker, no types or equality identifiers');
 check(e.redact('Only general text.',[])==='Only general text.','No unsupported automatic change');
 check(e.redact('abc',[{start:-1,end:2},{start:0,end:9},{start:1.5,end:2}])==='abc','Rejects invalid ranges');
 return {name:'removal',passed,failed:failures.length,failures};
};
