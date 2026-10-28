import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
export const specs={
 help:[],storage:[],samples:[],'storage-week':[],'returns-due':[],'expiry-review':[],stocktake:[],attention:[],compliance:[],insights:[],
 show:['sample'],lineage:['sample'],history:['sample'],
 'add-unit':['code','name','min','max','actor'],'add-box':['code','freezer','rows','columns','actor'],
 add:['code','name','material','quantity','unit','owner','review-due','expires?','box','position','actor'],
 checkout:['sample','borrower','due','note','actor'],checkin:['sample','quantity','thaws','note','actor'],
 move:['sample','box','position','note','actor'],consume:['sample','quantity','note','actor'],
 aliquot:['sample','code','name','quantity','box','position','note','actor'],
 hold:['sample','note','actor'],'release-hold':['sample','note','actor'],
 'stocktake-record':['sample','quantity','unit','owner','review-due','expires?','box','position','note','actor'],
 dispose:['sample','note','actor'],log:['sample','note','actor'],
 'record-temperature':['freezer','temperature','at','note','actor'],
 import:['vendor','file','type','source','map?','dry-run?','actor'],export:['out'],
 'weekly-review':[],'draft-picklist':['box'],'draft-custody':['sample']
};
const tables=['storage_units','boxes','samples','observations','events','imports'];
const readQueries={
 storage:'select * from storage_capacity order by box',samples:'select code,name,quantity,unit,status,freezer,box,position from sample_inventory order by code',
 'storage-week':"select s.code,s.name,s.status,s.owner,coalesce(a.issues,'No current flags') as attention from samples s left join (select code,string_agg(issue,'; ' order by issue) as issues from attention group by code) a on a.code=s.code where s.status not in ('disposed','consumed') order by s.code",
 'returns-due':'select * from returns_due order by return_due,code',
 'expiry-review':"select code,name,expires,quantity,unit,status,held from samples where status in ('stored','checked_out') and expires<=current_date+30 order by expires,code",
 stocktake:"select code,name,box,position,status,quantity,unit,owner,review_due from sample_inventory where status not in ('disposed','consumed') order by review_due nulls first,code",
 attention:'select * from attention order by due nulls first,code,issue'
};
const texts=[
 ['Which overdue returns also need an inventory review?',"select code from samples where status='checked_out' and return_due<current_date and review_due<current_date"],
 ['Which held samples expire within a month?',"select code from samples where held and status not in ('disposed','consumed') and expires<=current_date+30"],
 ['Which boxes have no spare positions?',"select box as code from storage_capacity where available=0"],
 ['Which samples occupy storage with a stale or out-of-range reading?',"select s.code from samples s join boxes b on b.id=s.box_id join storage_conditions c on c.id=b.storage_unit_id where c.finding!='Within local range' or c.temperature_c<c.min_c or c.temperature_c>c.max_c"],
 ['Which owners have overdue inventory reviews?',"select owner as code,count(*)::int as count from samples where status in ('stored','checked_out') and review_due<current_date group by owner order by owner"],
 ['Which imported records still need physical reconciliation?',"select code from samples where status='unverified'"],
 ['Which samples have three or more recorded thaw events?',"select code from samples where freeze_thaws>=3 and status not in ('disposed','consumed')"],
 ['Which active samples have no expiry date recorded?',"select code from samples where expires is null and status not in ('disposed','consumed')"],
 ['Which aliquots have a parent on hold?',"select child.code from samples child join samples parent on parent.id=child.parent_id where parent.held and child.status not in ('disposed','consumed')"],
 ['Which borrowers hold the most overdue samples?',"select borrower as code,count(*)::int as count from samples where status='checked_out' and return_due<current_date group by borrower order by count(*) desc,borrower"]
];
export const questions=texts.map(([q])=>q);
function parse(args){const pos=[],opts={};for(const a of args){if(a.startsWith('--')){const [k,...v]=a.slice(2).split('=');if(k in opts)throw Error('Duplicate option '+k);opts[k]=v.length?v.join('='):true;}else pos.push(a);}return{pos,opts};}
function required(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error('Required --'+k+'=value');return o[k].trim();}
function num(v,{integer=false,min=0}={}){if(v===true||v===undefined||String(v).trim()===''||!/^[-+]?\d+(?:\.\d{1,6})?$/.test(String(v)))throw Error('Invalid number');const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>1e10||n<min||(integer&&!Number.isInteger(n)))throw Error('Number out of range');return n;}
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Invalid calendar date');return v;}
function timestamp(v){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v))throw Error('Use a UTC timestamp ending Z');date(v.slice(0,10));if(!Number.isFinite(Date.parse(v))||Date.parse(v)>Date.now())throw Error('Invalid or future reading time');return v;}
const today=()=>new Date().toISOString().slice(0,10);
async function resolve(db,t,value){if(!value)throw Error('Record selector required');const field=t==='boxes'?'code':'name';const matches=await db.query(`select * from ${t} where lower(code)=lower($1) or lower(${field})=lower($1) or id::text like $2 order by code`,[value,value.toLowerCase()+'%']);if(matches.length===1)return matches[0];if(!matches.length)throw Error('No matching '+t+': '+value);throw Error('Ambiguous '+value+'\n'+matches.map(r=>r.code+' '+r.id+' '+(r.name||'')).join('\n'));}
async function event(db,s,action,o,before,after){await db.query('insert into events(sample_id,action,actor,note,before_record,after_record) values($1,$2,$3,$4,$5,$6)',[s?.id||null,action,required(o,'actor'),o.note||action,before?JSON.stringify(before):null,after?JSON.stringify(after):null]);}
async function update(db,s,changes,action,o){const keys=Object.keys(changes);const [after]=await db.query(`update samples set ${keys.map((k,i)=>k+'=$'+(i+2)).join(',')} where id=$1 returning *`,[s.id,...keys.map(k=>changes[k])]);await event(db,s,action,o,s,after);return [after];}
function live(s){if(['consumed','disposed'].includes(s.status))throw Error('Terminal sample cannot be changed');}
function usable(s){live(s);if(s.status!=='stored')throw Error('Sample must be stored and verified');if(s.held)throw Error('Sample is on hold');if(s.expires&&s.expires<today())throw Error('Sample has expired');if(s.review_due<today())throw Error('Inventory review is overdue');}
async function location(db,o){const b=await resolve(db,'boxes',required(o,'box'));return {box_id:b.id,position:num(required(o,'position'),{integer:true,min:1})};}
async function compliance(db){const rows=await db.query("select code,'LOCAL-CONDITIONS' as rule,finding as issue from storage_conditions where finding!='Within local range' union all select code,'LOCAL-TEMPERATURE','Latest reading outside configured range' from storage_conditions where temperature_c<min_c or temperature_c>max_c union all select code,'ISBER-INVENTORY','Missing reconciled quantity, owner or position' from samples where status='unverified' union all select code,'LOCAL-REVIEW','Inventory review overdue' from samples where status in ('stored','checked_out') and review_due<current_date union all select code,'LOCAL-HOLD',hold_reason from samples where held and status not in ('disposed','consumed') order by code,rule");return rows.map(r=>({...r,source:'docs/compliance.md#'+r.rule.toLowerCase()}));}
function outputFile(relative,content){const file=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,relative);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,content,{flag:'wx',mode:0o600});return file;}
async function importSamples(db,pos,o){
 if(pos[0]!=='labkey')throw Error('Supported import: labkey <csv>');
 const raw=fs.readFileSync(pos[1],'utf8'),rows=parseCsv(raw);if(!rows.length)throw Error('CSV has no data');
 const type=required(o,'type'),source=required(o,'source');
 const map=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
 const allowed=['name','description','material','quantity','unit','owner','review_due','expires','parent'];for(const k of Object.keys(map)){if(!allowed.includes(k)||typeof map[k]!=='string'||!Object.keys(rows[0]).includes(map[k]))throw Error('Unknown mapping or mapped column missing: '+k);}
 const get=(r,k,...defaults)=>map[k]?r[map[k]]:pick(r,...defaults);
 const names=new Set(),planned=[];let unchanged=0;
 for(const r of rows){const name=get(r,'name','Name').trim();if(!name)throw Error('Name column required; use --map for custom exports');if(names.has(name))throw Error('Duplicate sample name '+name);names.add(name);
 const key=type+':'+name,existing=await db.query('select * from samples where source=$1 and source_key=$2',[source,key]);
 if(existing.length){if(JSON.stringify(existing[0].source_row)!==JSON.stringify(JSON.parse(JSON.stringify(r,Object.keys(r).sort())))){
  const equal=Object.keys(r).length===Object.keys(existing[0].source_row).length&&Object.keys(r).every(k=>r[k]===existing[0].source_row[k]);if(!equal)throw Error('Changed source row requires reconciliation: '+name);
 }unchanged++;continue;}
 const q=get(r,'quantity','RawAmount','StoredAmount','Amount'),u=get(r,'unit','RawUnits','Units');
 const qty=q===''?null:num(q);if(qty!==null&&!['mL','uL','g','mg','count'].includes(u))throw Error('Quantity needs supported units');if(u==='count'&&qty!==null&&!Number.isInteger(qty))throw Error('Count must be whole');
 const expires=get(r,'expires','ExpiryDate'),review=get(r,'review_due','ReviewDue');
 planned.push({code:key,name:get(r,'description','Description')||name,material:get(r,'material','Material')||type,quantity:qty,unit:u||null,owner:get(r,'owner','Owner'),review_due:review?date(review):null,expires:expires?date(expires):null,parent:get(r,'parent','Parent'),source_key:key,raw:r});
 }
 for(const p of planned){const [s]=await db.query('insert into samples(code,name,material,quantity,unit,owner,review_due,expires,source,source_key,source_row) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *',[p.code,p.name,p.material,p.quantity,p.unit,p.owner,p.review_due,p.expires,source,p.source_key,JSON.stringify(p.raw)]);p.saved=s;}
 for(const p of planned){if(p.parent){const [parent]=await db.query('select id from samples where source=$1 and source_key=$2',[source,type+':'+p.parent]);if(!parent)throw Error('Missing parent '+p.parent);await db.query('update samples set parent_id=$2 where id=$1',[p.saved.id,parent.id]);}
 const [s]=await db.query('select * from samples where id=$1',[p.saved.id]);await event(db,s,'import',o,null,s);}
 const cycles=await db.query('with recursive chain as (select id,parent_id,array[id] as trail,false as cycle from samples union all select c.id,s.parent_id,c.trail||s.id,s.id=any(c.trail) from chain c join samples s on s.id=c.parent_id where not c.cycle) select id from chain where cycle limit 1');if(cycles.length)throw Error('Parent cycle');
 await db.query('insert into imports(source,filename,digest,row_count,actor,raw_csv) values($1,$2,$3,$4,$5,$6)',[source,path.basename(pos[1]),createHash('sha256').update(raw).digest('hex'),rows.length,required(o,'actor'),raw]);
 return [{added:planned.length,unchanged,unverified:planned.length,dry_run:!!o['dry-run'],note:'Positions and custody history await reconciliation. Raw columns retained.'}];
}
export async function run(db,args){
 const [cmd='help',...tail]=args;if(!(cmd in specs))throw Error('Unknown command '+cmd);
 const {pos,opts:o}=parse(tail),spec=specs[cmd],posKeys=spec.filter(k=>['sample','vendor','file'].includes(k));
 if(pos.length!==posKeys.length)throw Error('Expected '+posKeys.length+' positional argument(s) for '+cmd);
 for(const k of Object.keys(o))if(k!=='json'&&!spec.some(s=>s.replace('?','')===k))throw Error('Unknown option --'+k);
 for(const k of spec)if(!k.endsWith('?')&&!posKeys.includes(k))required(o,k);
 if(o['dry-run']!==undefined&&o['dry-run']!==true)throw Error('--dry-run is a flag');
 const mutation=spec.includes('actor');await db.exec(mutation?'BEGIN':'BEGIN READ ONLY');
 try{
 if(mutation)await db.exec('LOCK TABLE samples, boxes, storage_units IN SHARE ROW EXCLUSIVE MODE');
 let result;
 if(cmd==='help')result=Object.entries(specs).map(([command,options])=>({command,arguments:options.join(', ')}));
 else if(cmd in readQueries)result=await db.query(readQueries[cmd]);
 else if(cmd==='compliance')result=await compliance(db);
 else if(cmd==='insights'){result=[];for(const [question,sql] of texts){const rows=await db.query(sql);result.push({question,matches:rows.length,answer:rows.map(r=>r.code+(r.count?' ('+r.count+')':'')).join(', ')||'None'});}}
 else if(cmd==='weekly-review')result={week:await db.query(readQueries['storage-week']),returns:await db.query(readQueries['returns-due']),attention:await db.query(readQueries.attention),conditions:await db.query('select code,temperature_c,observed_at,finding from storage_conditions order by code')};
 else if(cmd==='export'){const data={format:'sample-storage-v1',exported_at:new Date().toISOString(),tables:{}};for(const t of tables)data.tables[t]=await db.query('select * from '+t+' order by id');result=[{file:outputFile(required(o,'out'),JSON.stringify(data,null,2)+'\n'),tables:tables.length}];}
 else if(cmd==='import')result=await importSamples(db,pos,o);
 else if(cmd==='add-unit'){const [r]=await db.query('insert into storage_units(code,name,min_c,max_c) values($1,$2,$3,$4) returning *',[o.code,o.name,num(o.min,{min:-273.15}),num(o.max,{min:-273.15})]);await event(db,null,cmd,o,null,r);result=[r];}
 else if(cmd==='add-box'){const u=await resolve(db,'storage_units',o.freezer);const [r]=await db.query('insert into boxes(code,storage_unit_id,rows,columns) values($1,$2,$3,$4) returning *',[o.code,u.id,num(o.rows,{integer:true,min:1}),num(o.columns,{integer:true,min:1})]);await event(db,null,cmd,o,null,r);result=[r];}
 else if(cmd==='record-temperature'){const u=await resolve(db,'storage_units',o.freezer);result=await db.query('insert into observations(storage_unit_id,temperature_c,observed_at,actor,note) values($1,$2,$3,$4,$5) returning *',[u.id,num(o.temperature,{min:-273.15}),timestamp(o.at),o.actor,o.note]);}
 else if(cmd==='add'){const loc=await location(db,o);const [s]=await db.query("insert into samples(code,name,material,quantity,unit,owner,review_due,expires,status,box_id,position) values($1,$2,$3,$4,$5,$6,$7,$8,'stored',$9,$10) returning *",[o.code,o.name,o.material,num(o.quantity,{min:0.000001}),o.unit,o.owner,date(o['review-due']),o.expires?date(o.expires):null,loc.box_id,loc.position]);await event(db,s,cmd,o,null,s);result=[s];}
 else if(cmd==='draft-picklist'){const b=await resolve(db,'boxes',o.box);const rows=await db.query("select code,name,position,quantity,unit,held,status,expires from sample_inventory where box=$1 order by position",[b.code]);result=[{file:outputFile('drafts/picklist-'+randomUUID()+'.md','# Inventory check: '+b.code+'\n\nDraft for physical reconciliation. This does not authorise use or dispatch.\n\n'+format(rows)+'\n')}];}
 else {
 const s=await resolve(db,'samples',pos[0]);
 if(cmd==='show')result=(await db.query('select * from sample_inventory where id=$1',[s.id]));
 else if(cmd==='history')result=await db.query('select action,actor,note,created_at,before_record,after_record from events where sample_id=$1 order by created_at,id',[s.id]);
 else if(cmd==='lineage')result=await db.query('with recursive chain as (select id,code,parent_id,0 as depth from samples where id=$1 union all select p.id,p.code,p.parent_id,c.depth+1 from chain c join samples p on p.id=c.parent_id where c.depth<100) select code,depth from chain order by depth',[s.id]);
 else if(cmd==='draft-custody'){const rows=await db.query('select action,actor,note,created_at from events where sample_id=$1 order by created_at,id',[s.id]);result=[{file:outputFile('drafts/custody-'+randomUUID()+'.md','# Custody review: '+s.code+'\n\nInternal draft. Actor labels are not authenticated signatures. No sending or release.\n\n'+format(rows)+'\n')}];}
 else if(cmd==='log'){await event(db,s,cmd,o,s,s);result=[{code:s.code,logged:true}];}
 else {
 live(s);let changes={};
 if(cmd==='checkout'){usable(s);const due=date(o.due);if(due<today())throw Error('Return due cannot be in the past');changes={status:'checked_out',borrower:o.borrower,return_due:due};}
 else if(cmd==='checkin'){if(s.status!=='checked_out')throw Error('Sample is not checked out');const q=num(o.quantity,{min:0.000001});if(q>Number(s.quantity))throw Error('Return quantity cannot increase');changes={status:'stored',borrower:null,return_due:null,quantity:q,freeze_thaws:s.freeze_thaws+num(o.thaws,{integer:true})};}
 else if(cmd==='move'){if(s.status!=='stored')throw Error('Only stored samples can move');changes=await location(db,o);}
 else if(cmd==='consume'){usable(s);const q=num(o.quantity,{min:0.000001});if(q>Number(s.quantity))throw Error('Insufficient quantity');changes={quantity:Number((Number(s.quantity)-q).toFixed(6))};if(changes.quantity===0)Object.assign(changes,{status:'consumed',box_id:null,position:null});}
 else if(cmd==='hold'){changes={held:true,hold_reason:o.note};}
 else if(cmd==='release-hold'){if(!s.held)throw Error('Sample is not held');changes={held:false,hold_reason:''};}
 else if(cmd==='stocktake-record'){if(s.status==='checked_out')throw Error('Return borrowed sample before stocktake');changes={...await location(db,o),quantity:num(o.quantity,{min:0.000001}),unit:o.unit,owner:o.owner,review_due:date(o['review-due']),expires:o.expires?date(o.expires):s.expires,status:'stored'};}
 else if(cmd==='dispose'){if(s.status==='checked_out')throw Error('Return borrowed sample before disposal');changes={status:'disposed',quantity:0,box_id:null,position:null};}
 else if(cmd==='aliquot'){usable(s);const q=num(o.quantity,{min:0.000001});if(q>=Number(s.quantity))throw Error('Aliquot must leave quantity in parent');const loc=await location(db,o);const [child]=await db.query("insert into samples(code,name,material,quantity,unit,owner,review_due,expires,status,box_id,position,parent_id) values($1,$2,$3,$4,$5,$6,$7,$8,'stored',$9,$10,$11) returning *",[o.code,o.name,s.material,q,s.unit,s.owner,s.review_due,s.expires,loc.box_id,loc.position,s.id]);await event(db,child,'aliquot-created',o,null,child);changes={quantity:Number((Number(s.quantity)-q).toFixed(6))};}
 else throw Error('Unimplemented '+cmd);
 result=await update(db,s,changes,cmd,o);
 }
 }
 await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function format(data){if(!Array.isArray(data))return Object.entries(data).map(([title,rows])=>title+'\n'+format(rows)).join('\n\n');if(!data.length)return '(none)';const clean=data.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v instanceof Date?v.toISOString():typeof v==='object'&&v!==null?JSON.stringify(v):v])));return table(clean,Object.keys(clean[0]).map(key=>({key,label:key,width:80})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
