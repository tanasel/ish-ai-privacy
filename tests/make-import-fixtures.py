"""Deterministic synthetic import fixtures. Never includes real school data.
Run: python3 make-import-fixtures.py /path/to/fixtures
Format sources: Microsoft Open XML PresentationML structure/text/comments;
OASIS OpenDocument 1.3 Part 3. See fixture-manifest.json for checks.
"""
from pathlib import Path
from xml.sax.saxutils import escape
import base64,hashlib,json,shutil,struct,sys,warnings,zipfile
OUT=Path(sys.argv[1] if len(sys.argv)>1 else Path(__file__).parent/'fixtures/imports');OUT.mkdir(parents=True,exist_ok=True)
P='http://schemas.openxmlformats.org/presentationml/2006/main';A='http://schemas.openxmlformats.org/drawingml/2006/main';R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';PKG='http://schemas.openxmlformats.org/package/2006/relationships'
MAN=[]
def save(name,parts,**expect):
 p=OUT/name
 with warnings.catch_warnings():
  warnings.simplefilter('ignore',UserWarning)
  with zipfile.ZipFile(p,'w',compression=zipfile.ZIP_DEFLATED) as z:
   for item in parts:
    key,value,*compression=item;info=zipfile.ZipInfo(key,(2026,9,11,12,0,0));info.compress_type=compression[0] if compression else zipfile.ZIP_DEFLATED;z.writestr(info,value)
 MAN.append({'file':name,**expect});return p

def rels(items):
 return f'<Relationships xmlns="{PKG}">'+''.join(f'<Relationship Id="{i}" Type="{kind}" Target="{escape(target)}"'+(' TargetMode="External"' if external else '')+'/>' for i,kind,target,external in items)+'</Relationships>'
def tx(paragraphs):
 return '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Text"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>'+''.join('<a:p>'+''.join('<a:r><a:t xml:space="preserve">'+escape(run)+'</a:t></a:r>' for run in (para if isinstance(para,list) else [para]))+'</a:p>' for para in paragraphs)+'</p:txBody></p:sp>'
def slide(paragraphs,hidden=False):
 return f'<p:sld xmlns:p="{P}" xmlns:a="{A}" xmlns:r="{R}"'+(' show="0"' if hidden else '')+'><p:cSld><p:spTree>'+tx(paragraphs)+'</p:spTree></p:cSld></p:sld>'
def notes(paragraphs):
 return f'<p:notes xmlns:p="{P}" xmlns:a="{A}"><p:cSld><p:spTree>'+tx(paragraphs)+'</p:spTree></p:cSld></p:notes>'
def ppt(slides,pres_targets=None,extras=(),reverse=False):
 targets=pres_targets or [f'slides/slide{i+1}.xml' for i in range(len(slides))]
 presentation=f'<p:presentation xmlns:p="{P}" xmlns:r="{R}"><p:sldIdLst>'+''.join(f'<p:sldId id="{256+i}" r:id="rSlide{i}"/>' for i in range(len(targets)))+'</p:sldIdLst></p:presentation>'
 parts=[('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'+''.join(f'<Override PartName="/{name}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' for name,_ in slides)+'</Types>'),('_rels/.rels',rels([('rMain',R+'/officeDocument','ppt/presentation.xml',False)])),('ppt/presentation.xml',presentation),('ppt/_rels/presentation.xml.rels',rels([(f'rSlide{i}',R+'/slide',target,False) for i,target in enumerate(targets)]))]+list(slides)+list(extras)
 return list(reversed(parts)) if reverse else parts

rich=ppt([
 ('ppt/slides/slide10.xml',slide(['FIRST_SLIDE: Sofia Marin',['Birth','date: 14/03/2010'],'XML & <script>window.LEAK=1</script>'])),
 ('ppt/slides/slide2.xml',slide(['SECOND_SLIDE: Amir Haddad'])),
 ('ppt/slides/not-numbered.xml',slide(['THIRD_HIDDEN_SLIDE: Noor Hassan'],True))
],['slides/slide10.xml','slides/slide2.xml','slides/not-numbered.xml'],[
 ('ppt/slides/_rels/slide10.xml.rels',rels([('rN',R+'/notesSlide','../notesSlides/speaker-z.xml',False),('rC',R+'/comments','../comments/comment-z.xml',False),('rE',R+'/hyperlink','https://example.invalid/never-fetch?person=fictional',True)])),
 ('ppt/notesSlides/speaker-z.xml',notes(['FIRST_NOTES: Aya Hassan','Medical context for manual review.'])),
 ('ppt/comments/comment-z.xml',f'<p:cmLst xmlns:p="{P}"><p:cm authorId="0" dt="2026-09-11T12:00:00Z" idx="1"><p:pos x="0" y="0"/><p:text>FIRST_COMMENT: parent.only@example.org</p:text></p:cm></p:cmLst>'),
 ('ppt/commentAuthors.xml',f'<p:cmAuthorLst xmlns:p="{P}"><p:cmAuthor id="0" name="Fictional Reviewer" initials="FR" lastIdx="1" clrIdx="0"/></p:cmAuthorLst>'),
 ('ppt/slides/_rels/slide2.xml.rels',rels([('rN',R+'/notesSlide','../notesSlides/second.xml',False)])),
 ('ppt/notesSlides/second.xml',notes(['SECOND_NOTES: second.note@example.org']))
],reverse=True)
save('slides-order-notes-hidden-comments.pptx',rich,ordered=['FIRST_SLIDE','SECOND_SLIDE','THIRD_HIDDEN_SLIDE'],contains=['FIRST_NOTES','SECOND_NOTES','FIRST_COMMENT','Birthdate: 14/03/2010','XML & <script>window.LEAK=1</script>'],notes='ZIP order is reversed; presentation relationships control order. Hidden slide has a nonstandard part name.')
save('slides-package-absolute-target.pptx',ppt([('ppt/slides/slide1.xml',slide(['ABSOLUTE_TARGET_SLIDE']))],['/ppt/slides/slide1.xml']),contains=['ABSOLUTE_TARGET_SLIDE'])
save('slides-xml-literal.pptx',ppt([('ppt/slides/slide1.xml',slide(['Literal <!DOCTYPE sample> & harmless <b>markup</b>.']))]),contains=['Literal <!DOCTYPE sample> & harmless <b>markup</b>.'])
base=ppt([('ppt/slides/slide1.xml',slide(['BASELINE_SLIDE']))])
for name,target in [('slides-escaping-target.pptx','../../outside.xml'),('slides-missing-target.pptx','slides/missing.xml')]:
 save(name,ppt([('ppt/slides/slide1.xml',slide(['BASELINE_SLIDE']))],[target]),error='invalid-package')
external=[(key,rels([('rSlide0',R+'/slide','https://example.invalid/slide.xml',True)])) if key=='ppt/_rels/presentation.xml.rels' else (key,value) for key,value in base]
save('slides-external-target.pptx',external,error='external-required-part',noNetwork=True)
corrupt=[(key,'<p:sld><broken>') if key=='ppt/slides/slide1.xml' else (key,value) for key,value in base]
save('slides-corrupt-xml.pptx',corrupt,error='invalid-xml')
dtd=[(key,'<!DOCTYPE p:sld [<!ENTITY private SYSTEM "https://example.invalid/never-fetch">]>'+value.replace('BASELINE_SLIDE','&private;')) if key=='ppt/slides/slide1.xml' else (key,value) for key,value in base]
save('slides-doctype.pptx',dtd,error='unsafe-xml',noNetwork=True)
save('slides-duplicate-part.pptx',base+[('ppt/slides/slide1.xml',slide(['DUPLICATE_PRIVATE_CONTENT']))],error='duplicate-path')
save('slides-zip-traversal-entry.pptx',base+[('../outside.xml','OUTSIDE')],error='unsafe-path')
save('slides-text-over-limit.pptx',ppt([('ppt/slides/slide1.xml',slide(['X'*100201]))]),error='text-limit')
(OUT/'slides-corrupt-archive.pptx').write_bytes(b'PK\x03\x04broken archive');MAN.append({'file':'slides-corrupt-archive.pptx','error':'invalid-package'})

def patch_zip(name,field,amount):
 p=save(name,base,error=field);b=bytearray(p.read_bytes());part=b'ppt/slides/slide1.xml';start=b.find(part)-30;central=b.find(part,b.find(b'PK\x01\x02'))-46
 if field=='encrypted':
  for offset in [start+6,central+8]:struct.pack_into('<H',b,offset,struct.unpack_from('<H',b,offset)[0]|1)
 elif field=='expanded-limit':
  struct.pack_into('<I',b,start+22,amount);struct.pack_into('<I',b,central+24,amount)
 elif field=='crc-mismatch':
  struct.pack_into('<I',b,start+14,amount);struct.pack_into('<I',b,central+16,amount)
 p.write_bytes(b)
patch_zip('slides-encrypted-flag.pptx','encrypted',0)
patch_zip('slides-declared-expansion-large.pptx','expanded-limit',1024*1024*1024)
patch_zip('slides-corrupt-crc.pptx','crc-mismatch',0)
# A genuine >10 MB ZIP with very little text. The unused media part is intentionally stored.
largeParts=base+[('ppt/media/large-image.bin',b'\0'*(12*1024*1024),zipfile.ZIP_STORED)]
save('slides-larger-than-10mb.pptx',largeParts,contains=['BASELINE_SLIDE'],minInputBytes=10*1024*1024)
# Sparse fixture exercises the UI size check without large generation allocations.
with (OUT/'slides-over-50mb.pptx').open('wb') as f:f.seek(50*1024*1024);f.write(b'0')
MAN.append({'file':'slides-over-50mb.pptx','error':'input-limit'})

ODF={'office':'urn:oasis:names:tc:opendocument:xmlns:office:1.0','text':'urn:oasis:names:tc:opendocument:xmlns:text:1.0','draw':'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0','presentation':'urn:oasis:names:tc:opendocument:xmlns:presentation:1.0','table':'urn:oasis:names:tc:opendocument:xmlns:table:1.0','dc':'http://purl.org/dc/elements/1.1/'}
ns=' '.join(f'xmlns:{k}="{v}"' for k,v in ODF.items())
def odf(name,kind,body,**expect):
 content=f'<office:document-content {ns} office:version="1.3"><office:body><office:{kind}>{body}</office:{kind}></office:body></office:document-content>'
 mime='application/vnd.oasis.opendocument.'+{'text':'text','presentation':'presentation','spreadsheet':'spreadsheet'}[kind]
 manifest='<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3"><manifest:file-entry manifest:full-path="/" manifest:media-type="'+mime+'"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/></manifest:manifest>'
 return save(name,[('mimetype',mime,zipfile.ZIP_STORED),('content.xml',content),('META-INF/manifest.xml',manifest)],**expect)
odf('writer-text-spaces-annotations.odt','text','<text:h text:outline-level="1">WRITER_HEADING</text:h><text:p>Sofia<text:s text:c="2"/>Marin<text:tab/>DOB: 14/03/2010<text:line-break/>SECOND_LINE &amp; &lt;literal&gt;</text:p><text:p>Second paragraph.</text:p><office:annotation><dc:creator>Fictional Author</dc:creator><text:p>WRITER_COMMENT: private.note@example.org</text:p></office:annotation>',contains=['WRITER_HEADING','Sofia  Marin','SECOND_LINE & <literal>','Second paragraph.','WRITER_COMMENT'])
odf('presentation-pages-notes.odp','presentation','<draw:page draw:name="Intro"><draw:frame><draw:text-box><text:p>ODP_FIRST: Sofia Marin</text:p></draw:text-box></draw:frame><presentation:notes><draw:frame><draw:text-box><text:p>ODP_NOTES: Aya Hassan</text:p></draw:text-box></draw:frame></presentation:notes></draw:page><draw:page draw:name="Hidden page" presentation:visibility="hidden"><draw:frame><draw:text-box><text:p>ODP_HIDDEN: Amir Haddad</text:p></draw:text-box></draw:frame></draw:page>',ordered=['ODP_FIRST','ODP_HIDDEN'],contains=['ODP_NOTES'])
odf('spreadsheet-repeated-cells.ods','spreadsheet','<table:table table:name="Fictional register"><table:table-row><table:table-cell office:value-type="string"><text:p>Name</text:p></table:table-cell><table:table-cell office:value-type="string"><text:p>Contact</text:p></table:table-cell></table:table-row><table:table-row table:number-rows-repeated="2"><table:table-cell office:value-type="string"><text:p>Sofia Marin</text:p></table:table-cell><table:table-cell office:value-type="string" table:number-columns-repeated="2"><text:p>sofia@example.org</text:p></table:table-cell></table:table-row></table:table>',contains=['Sofia Marin','sofia@example.org'],notes='Repeated identical rows and cells may be represented once with the import_repeated warning. Logical repetition counts must be bounded.')
odf('writer-repeat-bomb.odt','text','<text:p>A<text:s text:c="1000000000"/>B</text:p>',error='logical-expansion-limit')
odf('spreadsheet-repeat-bomb.ods','spreadsheet','<table:table table:name="Repeated"><table:table-row table:number-rows-repeated="1000000000"><table:table-cell office:value-type="string"><text:p>Private</text:p></table:table-cell></table:table-row></table:table>',error='logical-expansion-limit')
for name,content in [('plain-markdown.md','# Staff note\nSofia Marin. DOB: 14/03/2010.\n<img src="https://example.invalid/never-fetch" onerror="window.LEAK=1">'),('plain-tab-separated.tsv','Name\tDate of birth\nSofia Marin\t14/03/2010\n')]:
 (OUT/name).write_text(content,encoding='utf-8');MAN.append({'file':name,'contains':['Sofia Marin','14/03/2010'],'noNetwork':True})
# Additional existing-format regressions for the selective import rewrite.
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
def wp(text):return '<w:p><w:r><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>'
def wordpart(root,text):return f'<w:{root} xmlns:w="{W}">'+wp(text)+f'</w:{root}>'
docx=[('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),('_rels/.rels',rels([('rMain',R+'/officeDocument','word/document.xml',False)])),('word/document.xml',f'<w:document xmlns:w="{W}" xmlns:r="{R}"><w:body>'+wp('WORD_BODY: Sofia Marin. DOB: 14/03/2010.')+'<w:p><w:r><w:t>Split</w:t></w:r><w:r><w:t>word</w:t></w:r></w:p><w:sectPr><w:headerReference w:type="default" r:id="rHeader"/><w:footerReference w:type="default" r:id="rFooter"/></w:sectPr></w:body></w:document>'),('word/_rels/document.xml.rels',rels([('rHeader',R+'/header','header1.xml',False),('rFooter',R+'/footer','footer1.xml',False),('rComments',R+'/comments','comments.xml',False),('rFootnotes',R+'/footnotes','footnotes.xml',False)])),('word/header1.xml',wordpart('hdr','WORD_HEADER: Amir Haddad')),('word/footer1.xml',wordpart('ftr','WORD_FOOTER: footer.only@example.org')),('word/comments.xml',f'<w:comments xmlns:w="{W}"><w:comment w:id="0" w:author="Fictional Author">'+wp('WORD_COMMENT: private.note@example.org')+'</w:comment></w:comments>'),('word/footnotes.xml',f'<w:footnotes xmlns:w="{W}"><w:footnote w:id="1">'+wp('WORD_FOOTNOTE: Aya Hassan')+'</w:footnote></w:footnotes>')]
save('word-body-header-footer-comments.docx',docx,contains=['WORD_BODY','WORD_HEADER','WORD_FOOTER','WORD_COMMENT','WORD_FOOTNOTE','Splitword'])
S='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
from datetime import date
serial=(date(2010,3,14)-date(1899,12,30)).days
book=f'<workbook xmlns="{S}" xmlns:r="{R}"><sheets><sheet name="Fictional register" sheetId="1" r:id="rData"/><sheet name="Hidden notes" sheetId="2" state="hidden" r:id="rHidden"/></sheets></workbook>'
styles=f'<styleSheet xmlns="{S}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>'
ss=f'<sst xmlns="{S}" count="3" uniqueCount="3"><si><t>Name</t></si><si><r><t>Sofia</t></r><r><t xml:space="preserve"> Marin</t></r></si><si><t>Birth date</t></si></sst>'
sheet=f'<worksheet xmlns="{S}"><dimension ref="A1:C2"/><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>2</v></c><c r="C1" t="inlineStr"><is><t>Contact</t></is></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2" s="1"><v>{serial}</v></c><c r="C2" t="str"><f>HYPERLINK("https://example.invalid/never-fetch","cached")</f><v>cached.only@example.org</v></c></row></sheetData></worksheet>'
hidden=f'<worksheet xmlns="{S}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>HIDDEN_WORKSHEET: Amir Haddad</t></is></c></row></sheetData></worksheet>'
xlsx=[('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>'),('_rels/.rels',rels([('rMain',R+'/officeDocument','xl/workbook.xml',False)])),('xl/workbook.xml',book),('xl/_rels/workbook.xml.rels',rels([('rData',R+'/worksheet','worksheets/sheet10.xml',False),('rHidden',R+'/worksheet','worksheets/sheet2.xml',False),('rShared',R+'/sharedStrings','sharedStrings.xml',False),('rStyles',R+'/styles','styles.xml',False)])),('xl/worksheets/sheet2.xml',hidden),('xl/worksheets/sheet10.xml',sheet),('xl/sharedStrings.xml',ss),('xl/styles.xml',styles)]
save('spreadsheet-strings-date-hidden.xlsx',xlsx,contains=['Sofia Marin','cached.only@example.org','HIDDEN_WORKSHEET'],notes='Date serial '+str(serial)+' must become a readable date. Cached formula value is used; formula must never execute.')
# Real one-page PDF with selectable synthetic text.
data='BT /F1 12 Tf 50 730 Td (PDF_TEXT: Sofia Marin. DOB: 14/03/2010.) Tj ET'
objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',f'<< /Length {len(data)} >>\nstream\n{data}\nendstream']
pdf='%PDF-1.4\n';offsets=[0]
for i,obj in enumerate(objects,1):offsets.append(len(pdf));pdf+=f'{i} 0 obj\n{obj}\nendobj\n'
xref=len(pdf);pdf+='xref\n0 '+str(len(offsets))+'\n0000000000 65535 f \n'+''.join(f'{o:010d} 00000 n \n' for o in offsets[1:])+f'trailer\n<< /Root 1 0 R /Size {len(offsets)} >>\nstartxref\n{xref}\n%%EOF'
(OUT/'selectable-text.pdf').write_bytes(pdf.encode('ascii'));MAN.append({'file':'selectable-text.pdf','contains':['PDF_TEXT','Sofia Marin','14/03/2010']})
# Relationship targets need not follow the conventional header1/sharedStrings names.
custom_docx=[]
for key,value in docx:
 if key=='word/header1.xml':key='word/context/sidebar.xml'
 if key=='word/_rels/document.xml.rels':value=value.replace('Target="header1.xml"','Target="context/sidebar.xml"')
 custom_docx.append((key,value))
save('word-custom-header-target.docx',custom_docx,contains=['WORD_BODY','WORD_HEADER','WORD_FOOTER'],notes='Header part name is chosen by an internal relationship, not a conventional headerN.xml path.')
custom_xlsx=[]
for key,value in xlsx:
 if key=='xl/sharedStrings.xml':key='xl/text/custom-strings.xml'
 if key=='xl/styles.xml':key='xl/layout/custom-style.xml'
 if key=='xl/_rels/workbook.xml.rels':value=value.replace('Target="sharedStrings.xml"','Target="text/custom-strings.xml"').replace('Target="styles.xml"','Target="layout/custom-style.xml"')
 custom_xlsx.append((key,value))
save('spreadsheet-custom-related-parts.xlsx',custom_xlsx,contains=['Sofia Marin','cached.only@example.org','2010-03-14'],notes='Shared strings and date formats are selected through workbook relationships.')
odf('spreadsheet-value-only-cells.ods','spreadsheet','<table:table table:name="Raw values"><table:table-row><table:table-cell office:value-type="date" office:date-value="2010-03-14"/><table:table-cell office:value-type="string" office:string-value="value.only@example.org"/><table:table-cell office:value-type="float" office:value="123456789"/></table:table-row></table:table>',contains=['2010-03-14','value.only@example.org','123456789'],notes='Stored cell values remain identifying even when there is no text:p display string.')
# A modern comment uses DrawingML text, rather than classic p:text.
modern=f'<p188:cmLst xmlns:p188="http://schemas.microsoft.com/office/powerpoint/2018/8/main" xmlns:a="{A}"><p188:cm id="{{11111111-1111-1111-1111-111111111111}}" authorId="{{22222222-2222-2222-2222-222222222222}}" created="2026-09-11T12:00:00Z"><p188:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>MODERN_COMMENT: modern.only@example.org</a:t></a:r></a:p></p188:txBody></p188:cm></p188:cmLst>'
save('slides-modern-comment.pptx',ppt([('ppt/slides/slide1.xml',slide(['MODERN_COMMENT_SLIDE']))],extras=[('ppt/slides/_rels/slide1.xml.rels',rels([('rM','http://schemas.microsoft.com/office/2018/10/relationships/comments','../comments/modern.xml',False)])),('ppt/comments/modern.xml',modern)]),contains=['MODERN_COMMENT_SLIDE','MODERN_COMMENT: modern.only@example.org'])

# Keep real application packages pinned, but regenerate large hostile fixtures locally.
real_dir=Path(__file__).parent/'fixtures/imports-real'
real_manifest=json.loads((real_dir/'manifest.json').read_text()) if (real_dir/'manifest.json').exists() else None
if real_manifest:
 for item in real_manifest['fixtures']:
  original=real_dir/item['file']
  if hashlib.sha256(original.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Pinned fixture changed: '+item['file'])
  shutil.copy2(original,OUT/item['file']);MAN.append(dict(item))

# Re-emit the complete manifest after the existing-format additions.
for item in MAN:
 p=OUT/item['file'];item['bytes']=p.stat().st_size
 if p.stat().st_size<20*1024*1024:item['sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
previous={'fixtures':MAN,'sources':['https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document','https://learn.microsoft.com/en-us/office/open-xml/presentation/how-to-get-all-the-text-in-a-slide-in-a-presentation','https://learn.microsoft.com/en-us/office/open-xml/presentation/working-with-comments','https://docs.oasis-open.org/office/OpenDocument/v1.3/os/part3-schema/OpenDocument-v1.3-os-part3-schema.html']}
if real_manifest:previous['realPackageGenerator']=real_manifest['provenance']
(OUT/'fixture-manifest.json').write_text(json.dumps(previous,indent=2)+'\n')
print(json.dumps({'created':len(MAN),'output':str(OUT),'largestBytes':max(x['bytes'] for x in MAN)}))
