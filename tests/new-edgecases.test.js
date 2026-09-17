'use strict';
// Synthetic adversarial cases added after the staff-release corpus was frozen.
module.exports.run = function run({PIIEngine: engine}) {
  const failures=[]; let passed=0;
  function ok(value,label,detail) { if(value) passed++; else failures.push(label+': '+JSON.stringify(detail)); }
  const cases=[
    ['Unicode email local part','Email: élodie@school.example','élodie@school.example'],
    ['Non-Latin email','Email: 学生@例子.测试','学生@例子.测试'],
    ['Decomposed email accent','Email: e\u0301lodie@school.example','e\u0301lodie@school.example'],
    ['Copied full-width at sign','Email: zuri.nkosi＠school.example','zuri.nkosi＠school.example'],
    ['Zero-width email separator','Email: zuri\u200bnkosi@school.example','zuri\u200bnkosi@school.example'],
    ['Mac local path','Open /Users/naree.chaiprasit/Documents/report.pdf for the meeting.','/Users/naree.chaiprasit/Documents/report.pdf'],
    ['Windows local path','Open C:\\Users\\naree.chaiprasit\\Documents\\report.pdf for the meeting.','C:\\Users\\naree.chaiprasit\\Documents\\report.pdf'],
    ['Network local path','Open \\\\staff-server\\users\\naree.chaiprasit\\report.pdf for the meeting.','\\\\staff-server\\users\\naree.chaiprasit\\report.pdf'],
    ['Linux local path','Open /home/naree.chaiprasit/report.pdf for the meeting.','/home/naree.chaiprasit/report.pdf'],
    ['Quoted spaced path','Open "C:\\Users\\Zoë D’Ávila\\report.pages" for the meeting.','C:\\Users\\Zoë D’Ávila\\report.pages'],
    ['Spaced path with supported extension','Open C:\\Users\\Zuri Nkosi\\report.pdf for the meeting.','C:\\Users\\Zuri Nkosi\\report.pdf'],
    ['Unfamiliar extension in quoted path','Open "/srv/private/naree.chaiprasit/image.heic" for the meeting.','/srv/private/naree.chaiprasit/image.heic'],
    ['Labelled Home address','Home address: 6 Kanaalstraat, Exampletown','6 Kanaalstraat, Exampletown'],
    ['Labelled postcode and city','Home address: Molenplein 24, 7053 ET Exampletown','Molenplein 24, 7053 ET Exampletown'],
    ['Labelled Dutch home address','Woonadres: 6 Kanaalstraat, Exampletown','6 Kanaalstraat, Exampletown'],
    ['Year-first slash DOB','DOB: 2009/03/09','2009/03/09'],
    ['Year-first dot DOB','Date of birth: 2009.03.09','2009.03.09'],
    ['September abbreviation','Date of birth: 9 Sept. 2009','9 Sept. 2009'],
    ['Month-first September abbreviation','Date of birth: Sept. 9, 2009','Sept. 9, 2009'],
    ['Dutch abbreviated month','Geboren op 9 okt. 2009','9 okt. 2009'],
    ['Leap date','DOB: 2008/02/29','2008/02/29'],
    ['Lowercase spaced IBAN','IBAN: nl91 abna 0417 1643 00','nl91 abna 0417 1643 00'],
    ['Lowercase compact IBAN','IBAN: nl91abna0417164300','nl91abna0417164300'],
    ['Mixed case IBAN','IBAN: Nl91 aBna 0417 1643 00 before Friday.','Nl91 aBna 0417 1643 00'],
    ['Crossing name and filename','Please review Zuri Nkosi.pdf before class.','Zuri Nkosi.pdf',[{first:'Zuri',last:'Nkosi'}]],
    ['Crossing Unicode name and filename','Attached: Zoë D’Ávila.pdf for review.','Zoë D’Ávila.pdf',[{first:'Zoë',last:'D’Ávila'}]]
  ];
  for(const [label,input,personal,custom=[]] of cases) {
    const detections=engine.detect(input,custom), mapper=engine.createMapper();
    const output=mapper.anonymize(input,detections), start=input.indexOf(personal), end=start+personal.length;
    ok(detections.some(d=>d.start<=start&&d.end>=end),label+' full span detected',detections);
    ok(!output.includes(personal),label+' personal field removed',output);
    ok(mapper.restore(output).text===input,label+' exact restoration',mapper.restore(output));
  }
  for(const input of ['DOB: 2009/02/29','DOB: 2009.13.03','DOB: 2009/03/32','DOB: 31 Sept. 2009']) {
    ok(!engine.detect(input).some(d=>d.type==='date'),'invalid date is not presented as a valid date',engine.detect(input));
  }
  for(const [input,value] of [
    ['Born on 03-09-2009 in the city.','03-09-2009'],
    ['Ingeleverd op 15 maart 2026 via mail.','15 maart 2026']
  ]) {
    ok(engine.detect(input).some(d=>d.type==='date'&&d.value===value),'date does not swallow ordinary following prose',engine.detect(input));
  }
  for (const input of ['Our archive AB12 report is now complete.','Ref ab12 example of long text']) {
    ok(!engine.detect(input).some(d=>d.type==='iban'),'ordinary reference plus prose is not an IBAN',engine.detect(input));
  }
  const url='See https://school.example/private/Zuri%20Nkosi.pdf for details.';
  ok(engine.detect(url).some(d=>d.type==='url'&&d.value==='https://school.example/private/Zuri%20Nkosi.pdf'),'URL remains complete instead of becoming a partial filesystem path',engine.detect(url));
  const text='Femke Jansen met Daan de Jong.';
  const mapper=engine.createMapper(), prepared=mapper.anonymize(text,engine.detect(text)), entries=mapper.entries();
  const partial=mapper.restore(entries[0].pseudonym+' completed the work.');
  ok(partial.flagged.some(f=>f.pseudonym===entries[1].pseudonym&&/missing/i.test(f.reason)),'individual omitted placeholder is flagged',partial);
  ok(!partial.flagged.some(f=>f.pseudonym===entries[0].pseudonym),'present placeholder is not flagged missing',partial);
  ok(mapper.restore('A generic answer.').flagged.filter(f=>/missing/i.test(f.reason)).length===entries.length,'all omitted placeholders are flagged',mapper.restore('A generic answer.'));
  ok(mapper.restore(prepared).flagged.length===0,'complete reply has no missing-placeholder flags',mapper.restore(prepared));
  return {name:'new-edgecases',passed,failed:failures.length,failures};
};
if(require.main===module) {
  const fs=require('fs'),vm=require('vm'),path=require('path');
  const app=process.env.PII_APP_ROOT||'/Users/a.tanasel/Documents/CLm/pii-shield/app';
  const enginePath=process.argv[2]||path.join(app,'src/engine.js'), context=vm.createContext({});
  for(const f of [path.join(app,'src/names_db.js'),enginePath])vm.runInContext(fs.readFileSync(f,'utf8'),context);
  const result=module.exports.run({PIIEngine:vm.runInContext('PIIEngine',context)});
  console.log(JSON.stringify(result,null,2)); process.exit(result.failed?1:0);
}
