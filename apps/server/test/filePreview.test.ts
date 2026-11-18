import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { prepareFile } from '../src/filePreview.js';
import { MAX_UPLOAD_BYTES, uploadInputSchema } from '@student-dash/shared/uploads';
test('spreadsheet previews preserve literal text and bound table size',async()=>{
 const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Grades');sheet.addRow(['Name','Score']);sheet.addRow(['<script>alert(1)</script>',42]);sheet.getCell('A101').value='Beyond preview';
 const buffer=Buffer.from(await workbook.xlsx.writeBuffer() as unknown as Uint8Array);
 const file=await prepareFile('grades.xlsx',buffer.toString('base64'));
 assert.equal(file.preview.kind,'spreadsheet');
 if(file.preview.kind==='spreadsheet'){assert.equal(file.preview.sheets[0].rows[1][0],'<script>alert(1)</script>');assert.equal(file.preview.sheets[0].rows.length,100);assert.equal(file.preview.sheets[0].truncated,true);}
});
test('Word preview extracts text, never converts untrusted content into HTML',async()=>{
 const buffer=await readFile(new URL('./fixtures/preview.docx',import.meta.url));const file=await prepareFile('review.docx',buffer.toString('base64'));
 assert.equal(file.preview.kind,'text');if(file.preview.kind==='text'){assert.match(file.preview.text,/Student preview fixture/);assert.match(file.preview.text,/<script>not executable<\/script>/);}
});
test('uploads reject unsupported formats, mismatched signatures and unsafe filenames',async()=>{
 for(const name of ['payload.html','image.svg','pretend.pdf','pretend.xlsx'])await assert.rejects(prepareFile(name,Buffer.from('not a file').toString('base64')));
 await assert.rejects(prepareFile('empty.txt',''));
 await assert.rejects(prepareFile('text.txt','AAAA!!!!'));
 await assert.rejects(prepareFile('large.txt',Buffer.alloc(MAX_UPLOAD_BYTES+1,65).toString('base64')));
 for(const name of ['../scores.csv','foo\\bar.csv','bad\r\nname.txt','file:stream.txt'])assert.equal(uploadInputSchema.safeParse({expectedUserId:'a',name,base64:'YWJj'}).success,false);
});
