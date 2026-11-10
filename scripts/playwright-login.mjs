import { readFile,writeFile,unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
// Invoked only after a fresh CLI snapshot of the local login form. Keep test
// credentials out of argv, CLI transcripts, shell history and printed code.
const root=path.resolve(import.meta.dirname,'..');
const actors=JSON.parse(await readFile(path.join(root,process.env.PW_ACCOUNTS_FILE??'.local/browser-accounts.json'),'utf8'));
const base=process.env.PW_BASE_URL??'http://localhost:5274';
if(!['http://localhost:5274','http://192.168.101.93:5275','http://localhost:5275'].includes(base))throw new Error('Only local project previews are allowed');
const actor=actors[process.argv[2]];
if(!actor)throw new Error('Choose teacher, owner, member or outsider');
const temp=path.join(root,'.local/browser-login-code.js');
const code=`async page => {
 if (!page.url().startsWith(${JSON.stringify(base+'/login')})) throw Error('Expected the observed local login form');
 await page.getByLabel(/^(Email|邮箱)$/, {exact:true}).fill(${JSON.stringify(actor.email)});
 await page.getByLabel(/^(Password|密码)$/, {exact:true}).fill(${JSON.stringify(actor.password)});
 await page.getByRole('button', {name:/^(Sign in|登录)$/,exact:true}).click();
 await page.waitForURL(${JSON.stringify(base+'/')});
 await page.getByRole('heading').first().waitFor();
 return {url:page.url(),heading:await page.getByRole('heading').first().innerText()};
}`;
await writeFile(temp,code,{mode:0o600});
try {
 const skillRoot=process.env.CODEX_HOME??path.join(process.env.HOME,'.codex');
 const cli=path.join(skillRoot,'skills/playwright/scripts/playwright_cli.sh');
 const child=spawn('bash',[cli,'-s='+(process.env.PW_SESSION??'student-dashboard'),'run-code','--filename',temp],{cwd:path.join(root,'output/playwright'),stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
 const exit=await new Promise(resolve=>child.on('exit',resolve));
 for(const account of Object.values(actors))output=output.replaceAll(account.password,'[REDACTED]');
 process.stdout.write(output);process.exitCode=exit??1;
}finally{await unlink(temp);}
