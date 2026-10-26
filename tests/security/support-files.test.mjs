import test from 'node:test'
import assert from 'node:assert/strict'
import { createSupportFilesHandler, inspectFile, readBounded, FILE_LIMIT } from '../../news-app/supabase/functions/support-chat-files/handler.mjs'
const id='00000000-0000-4000-8000-000000009001', path=`${id}/${id}.pdf`, pdf=new TextEncoder().encode('%PDF-1.7\nexample document\n%%EOF')
function fixture({denied=false,duplicate=false,finalizeFail=false,removeFail=false}={}) {
 const calls=[],objects=new Map(duplicate?[[path,new Blob([pdf])]]:[])
 const meta={id,name:'test.pdf',mime:'application/pdf',size:pdf.length,client_id:id}
 const user={rpc:async(name,args)=>{calls.push({name,args});if(denied)return{error:{code:'42501'}};return{data:name.endsWith('file_reserve')?{...meta,path,state:'reserved'}:{...meta,path}}}}
 const admin={rpc:async(name,args)=>{calls.push({name,args});if(name.endsWith('file_ready'))return finalizeFail?{error:{code:'42501'}}:{data:meta};if(name.endsWith('cleanup_key_valid'))return{data:args.p_key==='a'.repeat(64)};if(name.endsWith('cleanup_batch'))return{data:{conversations_deleted:1,paths:[path]}};return{data:null}},storage:{from:bucket=>{assert.equal(bucket,'support-chat');return{
  upload:async(key,bytes,options)=>{calls.push({name:'upload',key,options});if(objects.has(key))return{error:{statusCode:409}};objects.set(key,new Blob([bytes]));return{data:{path:key}}},
  download:async key=>{calls.push({name:'download',key});return objects.has(key)?{data:objects.get(key)}:{error:{statusCode:404}}},
  remove:async paths=>{calls.push({name:'remove',paths});if(removeFail)return{error:{statusCode:503}};paths.forEach(key=>objects.delete(key));return{data:paths}}
 }}}}
 return{calls,objects,handler:createSupportFilesHandler({userClient:()=>user,admin})}
}
function upload(bytes=pdf,name='test.pdf',type='application/pdf') {
 const form=new FormData();form.append('file',new File([bytes],name,{type}));form.append('conversation_id',id);form.append('client_id',id);form.append('token','b'.repeat(64))
 return new Request('https://example.invalid',{method:'POST',body:form})
}
const download=()=>new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'download',conversation_id:id,file_id:id,token:'b'.repeat(64)})})
const cleanup=key=>new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json','x-cleanup-key':key},body:JSON.stringify({action:'cleanup'})})
test('file bytes, extension and declared MIME are checked before storage; uploads are private and bounded',async()=>{
 const f=fixture(),response=await f.handler(upload());assert.equal(response.status,200)
 assert.equal(f.calls[0].name,'support_chat_file_reserve');assert.match(f.calls[0].args.p_sha256,/^[a-f0-9]{64}$/)
 assert.equal(f.calls.find(c=>c.name==='upload').options.upsert,false);assert.deepEqual(await response.json(),{id,name:'test.pdf',mime:'application/pdf',size:pdf.length,client_id:id})
 const before=f.calls.length;assert.equal((await f.handler(upload(new TextEncoder().encode('<html>not a pdf</html>')))).status,400);assert.equal(f.calls.length,before)
 assert.equal((await f.handler(upload(pdf,'forged.png','image/png'))).status,400)
 assert.throws(()=>inspectFile(new Uint8Array(FILE_LIMIT+1),'large.pdf','application/pdf'))
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEXsAAAAASUVORK5CYII=','base64'))
 assert.equal(inspectFile(png,'image.PNG','image/png'),'image/png')
 assert.equal(inspectFile(Uint8Array.from([255,216,255,224,0,1,2,3,4,5,255,217]),'image.jpeg','image/jpeg'),'image/jpeg')
})
test('unauthorized visitors never reach storage reads or writes',async()=>{
 const f=fixture({denied:true});assert.equal((await f.handler(upload())).status,403);assert.equal((await f.handler(download())).status,403)
 assert.equal(f.calls.filter(c=>['upload','download','remove'].includes(c.name)).length,0)
})
test('downloads authorize membership and return attachments with no shared public URL or cache',async()=>{
 const f=fixture();f.objects.set(path,new Blob([pdf]));const response=await f.handler(download())
 assert.equal(response.status,200);assert.match(response.headers.get('Content-Disposition'),/^attachment;/);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Content-Type'),'application/pdf')
 assert.equal(f.calls[0].name,'support_chat_file_download');assert.equal(await response.text(),new TextDecoder().decode(pdf))
})
test('lost upload acknowledgements verify the same bytes; expired finalization removes the stored object',async()=>{
 const retry=fixture({duplicate:true});assert.equal((await retry.handler(upload())).status,200);assert.equal(retry.objects.size,1)
 retry.objects.set(path,new Blob(['different']));assert.equal((await retry.handler(upload())).status,409)
 const expired=fixture({finalizeFail:true});assert.equal((await expired.handler(upload())).status,403);assert.equal(expired.objects.size,0)
})
test('scheduled cleanup authenticates its Vault secret and keeps deletion jobs until Storage succeeds',async()=>{
 const denied=fixture();assert.equal((await denied.handler(cleanup(''))).status,403);assert.equal(denied.calls.length,0)
 assert.equal((await denied.handler(cleanup('b'.repeat(64)))).status,403);assert.ok(!denied.calls.some(c=>c.name.endsWith('cleanup_batch')))
 const failure=fixture({removeFail:true});assert.equal((await failure.handler(cleanup('a'.repeat(64)))).status,503);assert.ok(!failure.calls.some(c=>c.name.endsWith('cleanup_ack')))
 const success=fixture({duplicate:true});assert.equal((await success.handler(cleanup('a'.repeat(64)))).status,200);assert.equal(success.objects.size,0);assert.ok(success.calls.some(c=>c.name.endsWith('cleanup_ack')))
})
test('streamed request limits cancel oversized bodies even without Content-Length',async()=>{
 let cancelled=false
 const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(5));controller.enqueue(new Uint8Array(5))},cancel(){cancelled=true}})
 const req=new Request('https://example.invalid',{method:'POST',body,duplex:'half'})
 await assert.rejects(readBounded(req,8),error=>error.status===413);assert.equal(cancelled,true)
})
