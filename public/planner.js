
var UN={AFCF:"AFCF",AFCMF:"AFCMF",TRACT:"Tract unit",CCM:"CCM",UNIT:"Unit head"};
var MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var FM=["January","February","March","April","May","June","July","August","September","October","November","December"];
/* EVENTS: u=sub-unit, n=name, m/d=programme date, L=weeks the approval chain needs, a=[artwork submit, approve] weeks before,
   t=[title, weeks before event (negative = after), optional sub-unit] or [title,"yearOffset,month,day"] */
var EVENTS=[];
var BARS=[["AFCMF",1,1,1,"Checkup"],["AFCMF",1,3,3,"Checkup"],["AFCMF",1,5,5,"Checkup"],["AFCMF",1,7,7,"Checkup"],["AFCMF",1,9,9,"Checkup"],["AFCMF",1,11,11,"Checkup"],["AFCF",0,4,9,"Revival (Apr–Sep)"],["AFCF",1,1,3,"Fresher’s welcome"],["AFCF",1,9,12,"Fresher’s welcome"],["AFCF",2,10,10,"YLCB"],["UNIT",0,11,11,"Fr YLCB"],["AFCF",2,6,6,"Career"],["AFCF",2,8,8,"AGM"],["UNIT",0,1,1,"Retreat"],["UNIT",0,7,7,"Retreat"],["UNIT",0,9,9,"Budget"],
["AFCMF",0,1,1,"Outreach"],["AFCMF",0,7,7,"Outreach"],["TRACT",0,1,1,"Follow-up"],["TRACT",0,3,4,"Youth camp"],["TRACT",0,7,7,"Follow-up"],["TRACT",0,8,8,"Camp meeting"],["CCM",0,9,10,"Schedule → resume"]];
var LANES=[["AFCF",3],["AFCMF",2],["TRACT",1],["CCM",1],["UNIT",1]];
var NOW=new Date(),TD=new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate());
var S={y:TD.getFullYear(),m:TD.getMonth(),f:"all",v:"month",sc:"month",done:{},custom:[]},KEY="unitplanner:v1";
function save(){}
var DB=null,RO=false;
function hid(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return "t"+h.toString(36)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fd(d){return d.getDate()+" "+MN[d.getMonth()]}
function build(Y){var out=[];function P(o){if(o.due.getFullYear()===Y)out.push(o)}
[Y-1,Y,Y+1].forEach(function(y){
EVENTS.forEach(function(e){if(e.repeat===false&&e.year!==y)return;
var ev=new Date(y,e.m-1,e.d),lab=e.n+(y!==Y?" ’"+String(y).slice(2):"");
function add(t,due,u,k){if(due.getFullYear()===Y)out.push({id:(e.id||e.n)+"|"+y+"|"+k,t:t,due:due,u:u||e.u,ev:lab})}
function wk(w){return new Date(y,e.m-1,e.d-w*7)}
var k=0;
if(e.L){var L=e.L,a=e.a||[8,4];
[["Submit programme document to Unit Head and Team Lead",L],["Follow up with MANCOM on programme document approval (meets weekly)",L-1,"UNIT"],["Follow up on programme document with Youth Head, then PQAC",L-2,"UNIT"],["Programme document approved",L-4],["Artwork and content submitted for approval",a[0]],["Artwork and content approved",a[1]]].forEach(function(x){add(x[0],wk(x[1]),x[2],k++)});add("Start preparing programme document (about 4 weeks of drafting)",wk(L+4),null,"s0");add("Start preparing artwork and content (about 4 weeks of drafting)",wk(a[0]+4),null,"s1");add("Unit Head and Team Lead approve programme document",new Date(y,e.m-1,e.d-L*7+3),"UNIT","u0");add("Unit Head and Team Lead approve artwork and content",new Date(y,e.m-1,e.d-a[0]*7+3),"UNIT","u1");add("Follow up with MANCOM on artwork and content approval",wk(a[0]-1),"UNIT","u2");add("Follow up on artwork and content with Youth Head, then PQAC",wk(a[0]-2),"UNIT","u3")}
e.t.forEach(function(x,templateIndex){var due;if(typeof x[1]==="string"){var p=x[1].split(",");due=new Date(y+ +p[0],+p[1]-1,+p[2])}else due=wk(x[1]);add(x[0],due,x[2],x[3]||("template-"+templateIndex))});
add(e.pd||"Programme day",ev,null,"day")});
});
for(var m=0;m<=12;m+=3){P({id:"nlm|"+Y+"|"+m,t:"Submit "+FM[m%12]+(m===12?" "+(Y+1):"")+" quarterly newsletter draft to MANCOM",due:new Date(Y,m,-13),u:"AFCF",ev:"Monthly newsletter"});
P({id:"nls|"+Y+"|"+m,t:"Start preparing "+FM[m%12]+" newsletter (draft due to MANCOM in 2 weeks)",due:new Date(Y,m,-27),u:"AFCF",ev:"Quarterly newsletter"});
P({id:"nla|"+Y+"|"+m,t:"Follow up with MANCOM: approval of "+FM[m%12]+" newsletter (at least a week before the month)",due:new Date(Y,m,-6),u:"UNIT",ev:"Quarterly newsletter"});if(m<12){P({id:"nl|"+Y+"|"+m,t:"Publish quarterly newsletter (first week of "+FM[m]+")",due:new Date(Y,m,7),u:"AFCF",ev:"Monthly newsletter"})}}
for(m=-1;m<12;m++){var mm=(m+12)%12,rd=new Date(Y,m+1,10);(function(){function R(t){P({id:"rp|"+Y+"|"+m+"|"+t.length,t:t+" ("+MN[mm]+")",due:rd,u:"AFCF",ev:"Monthly reports"})}
if(mm>=3&&mm<=8)R("Monthly revival report: campus reports are due within 1 week of each programme");
if(mm>=8||mm<=2)R("Monthly welcome programme report");
R("Monthly revitalisation report for inactive campuses");P({id:"ccm|"+Y+"|"+m,t:"CCM monthly report ("+MN[mm]+")",due:rd,u:"CCM",ev:"Monthly reports"})})()}
for(var b=3;b<=8;b++)P({id:"bus|"+Y+"|"+b,t:"Get bus approval for "+FM[b]+" revival campus trips (monthly)",due:new Date(Y,b,-13),u:"AFCF",ev:"Revival buses"});
for(m=0;m<12;m++){var ld=new Date(Y,m,1);while(ld.getDay()!==2)ld.setDate(ld.getDate()+1);out.push({id:"pr|"+Y+"|"+m,t:"Host monthly Tuesday prayer for outreach leaders (first week)",due:ld,u:"TRACT",ev:"Tuesday prayer"})}
var d=new Date(Y,0,1);while(d.getDay()!==1)d.setDate(d.getDate()+1);
for(var i=0;d.getFullYear()===Y;i++){out.push({id:"wk|"+Y+"|"+i,t:"Generate weekly fellowship report on the portal",due:new Date(d),u:"AFCF",ev:"Weekly reports",rec:1});d.setDate(d.getDate()+7)}
S.custom.forEach(function(c){var dd=new Date(c.date+"T00:00:00");if(dd.getFullYear()===Y)out.push({id:c.id,t:c.title,due:dd,u:c.u,ev:"Added by you",cu:1})});
out.sort(function(a,b){return a.due-b.due});return out}
function row(t){var od=!S.done[t.id]&&t.due<TD;
return '<li class="t c-'+t.u+(S.done[t.id]?" done":"")+'"><input type="checkbox" data-id="'+esc(t.id)+'"'+(S.done[t.id]?" checked":"")+(RO?" disabled":"")+' aria-label="Done"><div class="b"><div class="ti">'+(/^Start preparing/.test(t.t)?'<span class="tag">START</span> ':"")+esc(t.t)+'</div><div class="meta">'+'<span class="unitlabel">'+UN[t.u]+'</span>'+esc(t.ev)+'</div></div><div class="due'+(od?" od":"")+'">'+fd(t.due)+(od?'<span class="overduelabel">Overdue</span>':"")+'</div>'+(t.cu&&!RO?'<button class="x edit-task" data-edit-task="'+esc(t.id)+'" aria-label="Edit task">Edit</button><button class="x" data-del="'+esc(t.id)+'" aria-label="Delete task">×</button>':"")+"</li>"}
function render(){
var T=build(S.y),core=T.filter(function(t){return!t.rec}),fl=T.filter(function(t){return S.f==="all"||t.u===S.f});
var yd=core.filter(function(t){return S.done[t.id]}).length;
document.getElementById("pt").textContent=yd+" of "+core.length+" tasks done in "+S.y;
document.getElementById("pb").style.width=(core.length?yd/core.length*100:0)+"%";
document.getElementById("yr").innerHTML=[S.y-1,S.y,S.y+1].map(function(y){return '<button data-y="'+y+'" class="'+(y===S.y?"on":"")+'">'+y+"</button>"}).join(" ");
var g='<div></div>';
for(var m=0;m<12;m++){var open=core.filter(function(t){return t.due.getMonth()===m&&!S.done[t.id]}).length;
g+='<button class="mb'+(S.v==="month"&&m===S.m?" sel":"")+(S.y===TD.getFullYear()&&m===TD.getMonth()?" now":"")+'" data-m="'+m+'" style="grid-row:1;grid-column:'+(m+2)+'">'+MN[m]+"<small>"+open+" open</small></button>"}
var r=2;LANES.forEach(function(l){g+='<div class="lane" style="grid-row:'+r+" / span "+l[1]+';grid-column:1">'+UN[l[0]]+"</div>";
BARS.filter(function(b){return b[0]===l[0]}).forEach(function(b){g+='<div class="seg c-'+l[0]+'" title="'+esc(b[4])+'" style="grid-row:'+(r+b[1])+";grid-column:"+(b[2]+1)+" / "+(b[3]+2)+'">'+esc(b[4])+"</div>"});r+=l[1]});
document.getElementById("grid").innerHTML=g;
var cs="";["ALL"].concat(Object.keys(UN)).forEach(function(k){var due=core.filter(function(t){return t.due<=TD&&(S.sc==="year"||t.due.getMonth()===S.m)&&(k==="ALL"||t.u===k)});var dn=due.filter(function(t){return S.done[t.id]}).length,ov=due.filter(function(t){return!S.done[t.id]&&t.due<TD}).length;var p=due.length?Math.round(dn/due.length*100):null;
var lab=p===null?"Nothing due yet":p>=90?"Excellent, keep it green":p>=70?"Strong":p>=40?"Getting there":"Needs attention";
cs+='<div class="sc'+(p===null?" na":"")+'" style="--h:'+(p===null?0:p*1.2)+'"><div class="sn">'+(k==="ALL"?"Outreach overall":UN[k])+'</div><div class="pc">'+(p===null?"–":p+"%")+'</div><div class="sb"><i style="width:'+(p||0)+'%"></i></div><div class="sm"><b>'+lab+'</b> · '+dn+" of "+due.length+" due tasks done"+(ov?" · "+ov+" overdue":"")+"</div></div>"});
document.getElementById("cards").innerHTML=cs;
document.getElementById("sch").textContent="Team progress · "+(S.sc==="year"?"year to date "+S.y:FM[S.m]+" "+S.y);
document.getElementById("scs").textContent=S.sc==="year"?"Completed tasks due so far this year. Weekly reports excluded.":"Completed tasks due so far this month. Weekly reports excluded.";
document.getElementById("s1").className="chip"+(S.sc==="month"?" on":"");document.getElementById("s2").className="chip"+(S.sc==="year"?" on":"");
var od=core.filter(function(t){return!S.done[t.id]&&t.due<TD&&(S.f==="all"||t.u===S.f)});
var c='<button class="chip'+(S.f==="all"?" on":"")+'" data-f="all">All units</button>';
Object.keys(UN).forEach(function(k){c+='<button class="chip'+(S.f===k?" on":"")+'" data-f="'+k+'">'+UN[k]+"</button>"});
c+='<span style="flex:1"></span><button class="chip'+(S.v==="soon"?" on":"")+'" data-v="soon">Next 30 days</button><button class="chip warn'+(S.v==="od"?" on":"")+'" data-v="od">Overdue ('+od.length+")</button>";
document.getElementById("chips").innerHTML=c;
var list,rec=[],h,sub="";
if(S.v==="od"){list=od;h="Overdue";sub="Tick them off once done, or add a new date as a task."}
else if(S.v==="soon"){var e30=new Date(TD);e30.setDate(e30.getDate()+30);list=fl.filter(function(t){return!t.rec&&t.due>=TD&&t.due<=e30&&!S.done[t.id]});h="Next 30 days";sub="Open tasks from today to "+fd(e30)}
else{var inM=fl.filter(function(t){return t.due.getMonth()===S.m});list=inM.filter(function(t){return!t.rec});rec=inM.filter(function(t){return t.rec});h=FM[S.m]+" "+S.y;var dn=list.filter(function(t){return S.done[t.id]}).length;sub=dn+" of "+list.length+" done this month"}
document.getElementById("h").textContent=h;document.getElementById("sub").textContent=sub;
document.getElementById("list").innerHTML=list.length?list.map(row).join(""):'<div class="empty">Nothing here. Pick another month or unit.</div>';
var rd=document.getElementById("rec");rd.style.display=rec.length?"":"none";
document.getElementById("recs").textContent="Weekly fellowship reports ("+rec.filter(function(t){return S.done[t.id]}).length+"/"+rec.length+" done)";
document.getElementById("rlist").innerHTML=rec.map(row).join("")}
document.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var d=b.dataset;
if(d.y){S.y=+d.y;S.v="month";selectedDay=null}else if(d.m!==undefined){S.m=+d.m;S.v="month";selectedDay=null;page="calendar"}else if(d.f){S.f=d.f}else if(d.sc){S.sc=d.sc}else if(d.v){S.v=S.v===d.v?"month":d.v}else return;render()});
document.addEventListener('change',async function(e){var id=e.target.dataset&&e.target.dataset.id;if(!id)return;if(RO)return;var on=e.target.checked;e.target.disabled=true;try{await request('/api/records/done/'+encodeURIComponent(id),{method:on?'PUT':'DELETE',body:JSON.stringify({on:on})});await loadShared()}catch(err){showError(err);render()}});
document.getElementById("nu").innerHTML=Object.keys(UN).map(function(k){return '<option value="'+k+'">'+UN[k]+"</option>"}).join("");



var page='calendar',selectedDay=null,query='';
var baseRender=render;
render=function(){baseRender();
 document.getElementById('shell').className='shell '+page+'-mode';
 document.querySelectorAll('[data-page]').forEach(function(b){b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-pressed',b.dataset.page===page)});
 document.getElementById('pageTitle').textContent=page==='year'?'Your outreach year':page==='tasks'?'Tasks & deadlines':'Programme calendar';
 document.getElementById('monthTitle').textContent=FM[S.m]+' '+S.y;
 document.getElementById('unitFilter').value=S.f;
 var tasks=build(S.y).filter(function(t){return !t.rec&&(S.f==='all'||t.u===S.f)&&(!query||(t.t+' '+t.ev+' '+UN[t.u]).toLowerCase().includes(query))});
 var first=new Date(S.y,S.m,1),offset=(first.getDay()+6)%7,days=new Date(S.y,S.m+1,0).getDate(),cells=Math.ceil((offset+days)/7)*7,html='';
 for(var i=0;i<cells;i++){var d=new Date(S.y,S.m,i-offset+1),day=d.getDate(),inMonth=d.getMonth()===S.m,arr=inMonth?tasks.filter(function(t){return t.due.getMonth()===S.m&&t.due.getDate()===day}):[];
 arr.sort(function(a,b){return (b.id.endsWith('|day')?1:0)-(a.id.endsWith('|day')?1:0)});
 html+='<div class="day'+(!inMonth?' outside':'')+(i%7>=5?' weekend':'')+(inMonth&&selectedDay===day?' selected':'')+'"><button class="daynum'+(+d===+TD?' now':'')+'" data-date="'+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+day+'" aria-label="Show tasks for '+day+' '+FM[d.getMonth()]+' '+d.getFullYear()+'">'+day+'</button>';
 arr.slice(0,2).forEach(function(t){var isEvent=t.id.endsWith('|day');html+='<button class="calendaritem c-'+t.u+(isEvent?' programme':'')+(S.done[t.id]?' complete':'')+'" data-day="'+day+'" title="'+esc(isEvent?t.ev:t.t)+'">'+esc(isEvent?t.ev:t.t)+'</button>'});
 if(arr.length)html+='<button class="mobilecount" data-day="'+day+'">'+arr.length+' task'+(arr.length===1?'':'s')+'</button>';if(arr.length>2)html+='<button class="moreday" data-day="'+day+'">+'+(arr.length-2)+' more</button>';html+='</div>';
 }document.getElementById('monthgrid').innerHTML=html;
 var filtered=tasks.filter(function(t){if(S.v==='od')return !S.done[t.id]&&t.due<TD;if(S.v==='soon'){var end=new Date(TD);end.setDate(end.getDate()+30);return !S.done[t.id]&&t.due>=TD&&t.due<=end}return t.due.getMonth()===S.m&&(selectedDay===null||t.due.getDate()===selectedDay)});
 document.getElementById('list').innerHTML=filtered.length?filtered.map(row).join(''):'<li class="empty">No tasks found. Try another date or filter.</li>';
 document.getElementById('taskCount').textContent=filtered.length+' tasks';
 if(S.v==='month'){document.getElementById('h').textContent=selectedDay!==null?selectedDay+' '+FM[S.m]:'This month’s deadlines';document.getElementById('sub').textContent=selectedDay!==null?FM[S.m]+' '+S.y:filtered.filter(function(t){return !!S.done[t.id]}).length+' of '+filtered.length+' complete · '+MN[S.m]+' '+S.y}
 document.getElementById('clearDay').classList.toggle('hidden',selectedDay===null);
 var chips=document.getElementById('chips');var all=document.createElement('button');all.className='chip'+(S.v==='month'?' on':'');all.textContent='All deadlines';all.dataset.v='month';chips.prepend(all);
 document.getElementById('rec').style.display=query||selectedDay!==null?'none':document.getElementById('rec').style.display;
};
document.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.page){page=b.dataset.page;render()}else if(b.dataset.day){selectedDay=+b.dataset.day;S.v='month';render()}else if(b.dataset.date){var a=b.dataset.date.split('-');S.y=+a[0];S.m=+a[1]-1;selectedDay=+a[2];S.v='month';render()}});
function moveMonth(step){var d=new Date(S.y,S.m+step,1);S.y=d.getFullYear();S.m=d.getMonth();selectedDay=null;S.v='month';render()}
document.getElementById('prevMonth').onclick=function(){moveMonth(-1)};
document.getElementById('nextMonth').onclick=function(){moveMonth(1)};
document.getElementById('today').onclick=function(){S.y=TD.getFullYear();S.m=TD.getMonth();selectedDay=null;S.v='month';render()};
document.getElementById('clearDay').onclick=function(){selectedDay=null;render()};
document.getElementById('search').oninput=function(e){query=e.target.value.trim().toLowerCase();render()};
document.getElementById('unitFilter').onchange=function(e){S.f=e.target.value;render()};
function openTask(){editingTask=null;document.getElementById("nt").value="";document.getElementById("taskFormTitle").textContent="New task";document.getElementById('taskDialog').showModal();document.getElementById('nd').value=S.y+'-'+String(S.m+1).padStart(2,'0')+'-'+String(selectedDay||1).padStart(2,'0');document.getElementById('nt').focus()}
document.getElementById('openAdd').onclick=openTask;document.getElementById('mobileAdd').onclick=openTask;
document.getElementById('closeDialog').onclick=function(){document.getElementById('taskDialog').close()};
render();
