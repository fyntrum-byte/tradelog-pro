import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const T = {
  bg:"#020812",s1:"#06101E",s2:"#0A1628",s3:"#102040",
  border:"#183050",orange:"#FF6B35",orL:"rgba(255,107,53,.12)",
  blue:"#38BDF8",blL:"rgba(56,189,248,.1)",
  green:"#4ADE80",grL:"rgba(74,222,128,.1)",
  red:"#F87171",reL:"rgba(248,113,113,.1)",
  amber:"#FBBF24",amL:"rgba(251,191,36,.12)",
  white:"#EEF5FF",muted:"#304060",text:"#6A8AAA",
  grad:"linear-gradient(135deg,#FF6B35,#FF9535)",
};
const SESSIONS=["Sin sesión","Londres","Nueva York","Asia","Overlap L/NY"];
const TIMEFRAMES=["M1","M5","M15","M30","H1","H4","D1","W1"];
const STRATEGIES=["Estructura","OB/FVG","ORB","Tendencia","Reversión","Scalping","Breakout","Otra"];
const SYMBOLS=["NAS100","EURUSD","GBPUSD","XAUUSD","BTCUSD","US30","SP500","USDCAD","USDJPY","GBPJPY","ETHUSD","Otro"];
const ACC_COLORS=["#FF6B35","#38BDF8","#4ADE80","#FBBF24","#A78BFA","#F472B6","#34D399","#FB923C"];
const DAYS=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const MONTHS=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS_F=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const STKEY="ttj_pro_v4";

const fm=(n,sign=true)=>{const s="$"+Math.abs(n||0).toLocaleString("es",{minimumFractionDigits:2,maximumFractionDigits:2});return sign?((n||0)>=0?"+":"-")+s:s;};
const fp=n=>((n||0)>=0?"+":"")+((n||0).toFixed(1))+"%";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const tday=()=>new Date().toISOString().slice(0,10);

const DB={
  async get(){try{const r=localStorage.getItem(STKEY);return r?JSON.parse(r):null;}catch{return null;}},
  async set(d){try{localStorage.setItem(STKEY,JSON.stringify(d));}catch{}}
};

// ── resultado color helper
const resColor=(r)=>r==="TP"?T.green:r==="SL"?T.red:T.amber;
const resBg=(r)=>r==="TP"?T.grL:r==="SL"?T.reL:T.amL;
const resBorder=(r)=>r==="TP"?T.green+"44":r==="SL"?T.red+"44":T.amber+"44";

function calcM(trades,base){
  if(!trades.length)return null;
  const tp=trades.filter(t=>t.result==="TP"),sl=trades.filter(t=>t.result==="SL"),be=trades.filter(t=>t.result==="BE");
  const totPnl=trades.reduce((s,t)=>s+(t.pnl||0),0);
  const gw=tp.reduce((s,t)=>s+(t.pnl||0),0),gl=Math.abs(sl.reduce((s,t)=>s+(t.pnl||0),0));
  const wr=tp.length/trades.length*100,pf=gl>0?gw/gl:gw>0?9.9:0;
  const avgW=tp.length?gw/tp.length:0,avgL=sl.length?-(gl/sl.length):0;
  const exp=(wr/100)*avgW+(1-wr/100)*avgL;
  const sorted=[...trades].sort((a,b)=>(a.date+(a.time||"00:00"))>(b.date+(b.time||"00:00"))?1:-1);
  let run=0;
  const equity=sorted.map(t=>({d:t.date.slice(5),v:parseFloat((run+=t.pnl||0).toFixed(2))}));
  let peak=0,dd=0,eq=0;
  sorted.forEach(t=>{eq+=t.pnl||0;if(eq>peak)peak=eq;if(peak-eq>dd)dd=peak-eq;});
  let mws=0,mls=0,ws=0,ls=0;
  sorted.forEach(t=>{if(t.result==="TP"){ws++;ls=0;if(ws>mws)mws=ws;}else if(t.result==="SL"){ls++;ws=0;if(ls>mls)mls=ls;}});
  const buys=trades.filter(t=>t.direction==="Compra"),sels=trades.filter(t=>t.direction==="Venta");
  const bwr=buys.length?buys.filter(t=>t.result==="TP").length/buys.length*100:0;
  const swr=sels.length?sels.filter(t=>t.result==="TP").length/sels.length*100:0;
  const dayM={},hourM={},symM={},strM={},sesM={},monM={};
  trades.forEach(t=>{
    const d=new Date(t.date+"T12:00:00").getDay();
    if(!dayM[d])dayM[d]={pnl:0,n:0,w:0};dayM[d].pnl+=t.pnl||0;dayM[d].n++;if(t.result==="TP")dayM[d].w++;
    if(t.time){const h=t.time.slice(0,2);if(!hourM[h])hourM[h]={pnl:0,n:0,w:0};hourM[h].pnl+=t.pnl||0;hourM[h].n++;if(t.result==="TP")hourM[h].w++;}
    const sym=t.symbol||"?";if(!symM[sym])symM[sym]={pnl:0,n:0,w:0};symM[sym].pnl+=t.pnl||0;symM[sym].n++;if(t.result==="TP")symM[sym].w++;
    const str=t.strategy||"Sin estrategia";if(!strM[str])strM[str]={pnl:0,n:0,w:0};strM[str].pnl+=t.pnl||0;strM[str].n++;if(t.result==="TP")strM[str].w++;
    const ses=t.session||"Sin sesión";if(!sesM[ses])sesM[ses]={pnl:0,n:0,w:0};sesM[ses].pnl+=t.pnl||0;sesM[ses].n++;if(t.result==="TP")sesM[ses].w++;
    const dd2=new Date(t.date+"T12:00:00"),mk=`${dd2.getFullYear()}-${String(dd2.getMonth()+1).padStart(2,"0")}`;
    if(!monM[mk])monM[mk]={pnl:0,w:0,l:0,b:0,n:0};monM[mk].pnl+=t.pnl||0;monM[mk].n++;
    if(t.result==="TP")monM[mk].w++;else if(t.result==="SL")monM[mk].l++;else monM[mk].b++;
  });
  return{totPnl,gw,gl,wr,pf,avgW,avgL,exp,dd,ddPct:base?dd/base*100:0,mws,mls,bwr,swr,equity,dayM,hourM,symM,strM,sesM,monM,tp:tp.length,sl:sl.length,be:be.length,total:trades.length,rr:avgL?Math.abs(avgW/avgL):0};
}

function calcRecs(m,trades){
  if(!m||!trades.length)return[];
  const r=[];
  if(m.pf>0&&m.pf<1.5)r.push({icon:"⚖️",type:"ATENCIÓN",title:"Profit Factor mejorable",body:`Tu PF es ${m.pf.toFixed(2)}. Objetivo >1.5. Amplía TPs o reduce SLs en setups de alta probabilidad.`});
  const de=Object.entries(m.dayM).filter(([,v])=>v.n>=3);
  if(de.length){
    const wd=[...de].sort((a,b)=>a[1].pnl-b[1].pnl)[0];
    if(wd[1].pnl<0)r.push({icon:"🚫",type:"ATENCIÓN",title:`Evita operar los ${DAYS[wd[0]]}`,body:`${DAYS[wd[0]]}: ${(wd[1].w/wd[1].n*100).toFixed(0)}% acierto y ${fm(wd[1].pnl)} pérdida. Considera no operar ese día.`});
    const bd=[...de].sort((a,b)=>b[1].pnl-a[1].pnl)[0];
    if(bd[1].pnl>0)r.push({icon:"📅",type:"OPORTUNIDAD",title:`Día estrella: ${DAYS[bd[0]]}`,body:`${DAYS[bd[0]]}: ${(bd[1].w/bd[1].n*100).toFixed(0)}% win rate y ${fm(bd[1].pnl)} acumulados.`});
  }
  const he=Object.entries(m.hourM).filter(([,v])=>v.n>=3);
  if(he.length){
    const bh=[...he].sort((a,b)=>b[1].pnl-a[1].pnl)[0];
    if(bh[1].pnl>0)r.push({icon:"🕐",type:"OPORTUNIDAD",title:`Mejor hora: ${bh[0]}:00`,body:`${bh[0]}:00: ${(bh[1].w/bh[1].n*100).toFixed(0)}% efectividad, ${fm(bh[1].pnl)} ganados.`});
    const wh=[...he].sort((a,b)=>a[1].pnl-b[1].pnl)[0];
    if(wh[1].pnl<0)r.push({icon:"⏰",type:"ATENCIÓN",title:`Hora conflictiva: ${wh[0]}:00`,body:`A las ${wh[0]}:00 acumulas ${fm(wh[1].pnl)} de pérdida.`});
  }
  const se=Object.entries(m.symM).filter(([,v])=>v.n>=3);
  if(se.length){
    const bs=[...se].sort((a,b)=>b[1].pnl-a[1].pnl)[0];
    if(bs[1].pnl>0)r.push({icon:"⭐",type:"OPORTUNIDAD",title:`Activo estrella: ${bs[0]}`,body:`${bs[0]}: ${fm(bs[1].pnl)} con ${(bs[1].w/bs[1].n*100).toFixed(0)}% de acierto.`});
    if(se.length>1){const ws=[...se].sort((a,b)=>a[1].pnl-b[1].pnl)[0];if(ws[1].pnl<0)r.push({icon:"⚠️",type:"ATENCIÓN",title:`Activo difícil: ${ws[0]}`,body:`${ws[0]}: ${fm(ws[1].pnl)} de pérdida. Revisa tu estrategia.`});}
  }
  if(m.mls>=5)r.push({icon:"🔴",type:"RIESGO",title:`Racha perdedora: ${m.mls} ops`,body:`${m.mls} pérdidas consecutivas. Pausa después de 3 pérdidas seguidas.`});
  if(m.wr>=65)r.push({icon:"💪",type:"FORTALEZA",title:"Win rate excelente",body:`${m.wr.toFixed(1)}% supera el estándar profesional. Mantén la selectividad.`});
  const mv=Object.values(m.monM).filter(v=>v.n>0),pm=mv.filter(v=>v.pnl>0).length;
  if(mv.length>=3&&pm/mv.length>=0.8)r.push({icon:"🏆",type:"FORTALEZA",title:"Alta consistencia mensual",body:`${pm}/${mv.length} meses positivos. Disciplina y sistema robusto.`});
  if(m.be>0&&m.be/m.total>0.15)r.push({icon:"🎯",type:"ATENCIÓN",title:`${m.be} operaciones en BE`,body:`${(m.be/m.total*100).toFixed(0)}% de tus trades terminaron en Break Even. Evalúa si puedes dejar correr más tus ganadores.`});
  return r;
}

// ── REGLAS checker
function checkRules(rules,trades,account){
  if(!rules||!account)return[];
  const alerts=[];
  const today=tday();
  const todayTrades=trades.filter(t=>t.date===today);
  const todayPnl=todayTrades.reduce((s,t)=>s+(t.pnl||0),0);
  if(rules.maxTradesDay&&todayTrades.length>=parseInt(rules.maxTradesDay))
    alerts.push({type:"danger",icon:"🚫",msg:`Límite diario alcanzado: ${todayTrades.length}/${rules.maxTradesDay} operaciones hoy`});
  if(rules.maxDailyLoss&&todayPnl<=-Math.abs(parseFloat(rules.maxDailyLoss)))
    alerts.push({type:"danger",icon:"🛑",msg:`Pérdida diaria máxima alcanzada: ${fm(todayPnl)} (límite: ${fm(-Math.abs(parseFloat(rules.maxDailyLoss)))})`});
  if(rules.maxSL&&trades.length){
    const lastSLs=[];
    [...trades].sort((a,b)=>b.date>a.date?1:-1).forEach(t=>{if(lastSLs.length<5)lastSLs.push(t);});
    const bigSL=lastSLs.find(t=>t.result==="SL"&&Math.abs(t.pnl||0)>parseFloat(rules.maxSL));
    if(bigSL)alerts.push({type:"warn",icon:"⚠️",msg:`SL reciente de ${fm(bigSL.pnl)} supera el límite de ${fm(-parseFloat(rules.maxSL))}`});
  }
  const todayDay=new Date().getDay();
  if(rules.blockedDays&&rules.blockedDays.includes(String(todayDay)))
    alerts.push({type:"warn",icon:"📅",msg:`Hoy (${DAYS[todayDay]}) está marcado como día sin operar en tus reglas`});
  return alerts;
}

// ── SHARED UI
const Btn=({children,onClick,variant="primary",size="md",style:sx={},disabled=false})=>{
  const base={border:"none",cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontFamily:"'DM Sans',sans-serif",fontWeight:700,transition:"all .15s",opacity:disabled?.5:1,...(size==="sm"?{padding:"5px 12px",fontSize:11}:{padding:"9px 18px",fontSize:13})};
  const v={primary:{background:T.grad,color:"#fff"},secondary:{background:T.s3,color:T.white,border:`1px solid ${T.border}`},ghost:{background:"transparent",color:T.text,border:`1px solid ${T.border}`},danger:{background:T.reL,color:T.red,border:`1px solid ${T.red}55`},success:{background:T.grL,color:T.green,border:`1px solid ${T.green}55`},amber:{background:T.amL,color:T.amber,border:`1px solid ${T.amber}55`}};
  return <button onClick={onClick} disabled={disabled} style={{...base,...v[variant],...sx}}>{children}</button>;
};
const Inp=({label,value,onChange,type="text",placeholder="",wSx={},iSx={}})=>(
  <div style={{display:"flex",flexDirection:"column",gap:5,...wSx}}>
    {label&&<label style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:T.s3,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif",...iSx}}/>
  </div>
);
const Sel=({label,value,onChange,options,wSx={}})=>(
  <div style={{display:"flex",flexDirection:"column",gap:5,...wSx}}>
    {label&&<label style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:T.s3,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,outline:"none",fontFamily:"'DM Sans',sans-serif"}}>
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);
const Card=({children,sx={}})=>(<div style={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:12,padding:20,...sx}}>{children}</div>);
const ChartTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
    <p style={{margin:"0 0 4px",color:T.text}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{margin:0,color:p.color||T.white,fontWeight:700}}>{p.name}: {typeof p.value==="number"?fm(p.value):p.value}</p>)}
  </div>);
};
const Moda=({title,onClose,children,w=480})=>(
  <div style={{position:"fixed",inset:0,background:"rgba(2,8,18,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(8px)"}}>
    <div style={{background:T.s1,border:`1px solid ${T.border}`,borderRadius:16,width:w,maxWidth:"96vw",maxHeight:"92vh",overflow:"auto",padding:28,boxShadow:"0 24px 80px rgba(0,0,0,.7)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <h3 style={{margin:0,color:T.white,fontSize:17,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>{title}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:22,cursor:"pointer",lineHeight:1,padding:"0 4px"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const SLabel=({text})=>(<div style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:12,fontFamily:"'DM Sans',sans-serif"}}>{text}</div>);

// ── ACCOUNT MODAL
function AccountModal({account,onSave,onClose}){
  const isEdit=!!account;
  const [f,setF]=useState({name:account?.name||"",broker:account?.broker||"",type:account?.type||"Prop Firm",color:account?.color||ACC_COLORS[0],initialBalance:account?.initialBalance||10000,goal:account?.goal||20});
  const [deps,setDeps]=useState(account?.deposits||[]);
  const [dep,setDep]=useState({amount:"",note:"",date:tday()});
  const [showDep,setShowDep]=useState(false);
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const addDep=()=>{
    if(!dep.amount||isNaN(parseFloat(dep.amount)))return;
    setDeps(p=>[...p,{id:uid(),date:dep.date,amount:parseFloat(dep.amount),note:dep.note}]);
    setDep({amount:"",note:"",date:tday()});setShowDep(false);
  };
  return(
    <Moda title={isEdit?"Editar Cuenta":"Nueva Cuenta"} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Nombre de cuenta" value={f.name} onChange={v=>s("name",v)} placeholder="Ej: FTMO 50K Challenge" wSx={{gridColumn:"1/-1"}}/>
          <Inp label="Broker / Firma" value={f.broker} onChange={v=>s("broker",v)} placeholder="FTMO, The5ers..."/>
          <Sel label="Tipo" value={f.type} onChange={v=>s("type",v)} options={["Prop Firm","Cuenta Propia","Demo"]}/>
          <Inp label="Balance Inicial ($)" value={f.initialBalance} onChange={v=>s("initialBalance",parseFloat(v)||0)} type="number"/>
          <Inp label="Meta de ganancia (%)" value={f.goal} onChange={v=>s("goal",parseFloat(v)||0)} type="number"/>
        </div>
        <div>
          <label style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",display:"block",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>Color de cuenta</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{ACC_COLORS.map(c=><div key={c} onClick={()=>s("color",c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${f.color===c?"#fff":"transparent"}`,boxShadow:f.color===c?`0 0 10px ${c}99`:"none",transition:"all .15s"}}/>)}</div>
        </div>
        {isEdit&&(
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{color:T.white,fontSize:13,fontWeight:700}}>💰 Depósitos adicionales</span>
              <Btn variant="ghost" size="sm" onClick={()=>setShowDep(!showDep)}>{showDep?"Cancelar":"+ Agregar depósito"}</Btn>
            </div>
            {showDep&&(
              <div style={{background:T.s3,borderRadius:10,padding:14,marginBottom:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  <Inp label="Monto ($)" value={dep.amount} onChange={v=>setDep(d=>({...d,amount:v}))} type="number" placeholder="500.00"/>
                  <Inp label="Fecha" value={dep.date} onChange={v=>setDep(d=>({...d,date:v}))} type="date"/>
                  <Inp label="Nota (opcional)" value={dep.note} onChange={v=>setDep(d=>({...d,note:v}))} placeholder="Capital adicional..." wSx={{gridColumn:"1/-1"}}/>
                </div>
                <Btn variant="success" onClick={addDep}>✓ Confirmar depósito</Btn>
              </div>
            )}
            {deps.length>0&&(
              <div>
                <p style={{fontSize:10,color:T.text,margin:"0 0 8px",fontWeight:700,letterSpacing:.8,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>Historial de depósitos</p>
                <div style={{maxHeight:150,overflow:"auto"}}>
                  {deps.map(d=>(
                    <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                      <div><span style={{color:T.text}}>{d.date}</span>{d.note&&<span style={{color:T.muted,marginLeft:8}}>· {d.note}</span>}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{color:T.green,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fm(d.amount)}</span>
                        <button onClick={()=>setDeps(p=>p.filter(x=>x.id!==d.id))} style={{background:"none",border:"none",color:T.red+"88",cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px"}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:8,fontSize:12,color:T.muted}}>Total depositado: <span style={{color:T.green,fontWeight:700}}>{fm(deps.reduce((s,d)=>s+d.amount,0))}</span></div>
              </div>
            )}
          </div>
        )}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={()=>{if(!f.name.trim())return;onSave({...f,deposits:deps});}}>{isEdit?"Guardar cambios":"Crear cuenta"}</Btn>
        </div>
      </div>
    </Moda>
  );
}

// ── TRADE MODAL (con BE)
function TradeModal({trade,accountId,onSave,onClose}){
  const isEdit=!!trade;
  const [f,setF]=useState({date:trade?.date||tday(),time:trade?.time||"09:00",symbol:trade?.symbol||"NAS100",direction:trade?.direction||"Compra",session:trade?.session||"Sin sesión",timeframe:trade?.timeframe||"H1",strategy:trade?.strategy||"Estructura",entry:trade?.entry||"",exit:trade?.exit||"",rr:trade?.rr||"",pnl:trade?.pnl!==undefined?trade.pnl:"",commission:trade?.commission||0,result:trade?.result||"TP",url1:trade?.url1||"",url2:trade?.url2||"",url3:trade?.url3||"",notes:trade?.notes||""});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const pnlColor=parseFloat(f.pnl)>0?T.green:parseFloat(f.pnl)<0?T.red:T.border;
  const RES_OPTS=[{v:"TP",l:"✅ TP — Take Profit"},{v:"SL",l:"❌ SL — Stop Loss"},{v:"BE",l:"🎯 BE — Break Even"}];
  return(
    <Moda title={isEdit?"Editar Operación":"Nueva Operación"} onClose={onClose} w={560}>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <Inp label="Fecha" value={f.date} onChange={v=>s("date",v)} type="date"/>
          <Inp label="Hora (UTC-5)" value={f.time} onChange={v=>s("time",v)} type="time"/>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>RESULTADO</label>
            <div style={{display:"flex",gap:4}}>
              {["TP","SL","BE"].map(r=>(
                <button key={r} onClick={()=>s("result",r)} style={{flex:1,padding:"9px 4px",border:`1px solid ${f.result===r?resColor(r):T.border}`,borderRadius:8,background:f.result===r?resBg(r):T.s3,color:f.result===r?resColor(r):T.text,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}>{r}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Sel label="Símbolo" value={f.symbol} onChange={v=>s("symbol",v)} options={SYMBOLS}/>
          <Sel label="Dirección" value={f.direction} onChange={v=>s("direction",v)} options={["Compra","Venta"]}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <Sel label="Sesión" value={f.session} onChange={v=>s("session",v)} options={SESSIONS}/>
          <Sel label="Timeframe" value={f.timeframe} onChange={v=>s("timeframe",v)} options={TIMEFRAMES}/>
          <Sel label="Estrategia" value={f.strategy} onChange={v=>s("strategy",v)} options={STRATEGIES}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
          <Inp label="Entrada" value={f.entry} onChange={v=>s("entry",v)} type="number" placeholder="0.00"/>
          <Inp label="Salida" value={f.exit} onChange={v=>s("exit",v)} type="number" placeholder="0.00"/>
          <Inp label="R:R" value={f.rr} onChange={v=>s("rr",v)} type="number" placeholder="1.5"/>
          <Inp label="Comisión ($)" value={f.commission} onChange={v=>s("commission",v)} type="number" placeholder="0"/>
        </div>
        <Inp label={`P&L ($)${f.result==="BE"?" — normalmente $0 o muy cercano":""}`} value={f.pnl} onChange={v=>s("pnl",v)} type="number" placeholder={f.result==="BE"?"0.00 (Break Even)":"-150.00 ó +250.00"} iSx={{borderColor:pnlColor,fontWeight:700,fontSize:15,fontFamily:"'JetBrains Mono',monospace"}}/>
        <div>
          <label style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",display:"block",marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Screenshots — URLs de TradingView</label>
          {["url1","url2","url3"].map((k,i)=><Inp key={k} value={f[k]} onChange={v=>s(k,v)} placeholder={`Gráfico ${i+1}: https://www.tradingview.com/chart/...`} wSx={{marginBottom:5}}/>)}
        </div>
        <div>
          <label style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",display:"block",marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>Observaciones</label>
          <textarea value={f.notes} onChange={e=>s("notes",e.target.value)} rows={3} placeholder="Contexto de mercado, emociones, por qué tomaste este trade..."
            style={{width:"100%",background:T.s3,border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 12px",color:T.white,fontSize:13,resize:"vertical",outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={()=>{const p=parseFloat(f.pnl)||0;onSave({...f,pnl:p,rr:parseFloat(f.rr)||0,entry:parseFloat(f.entry)||0,exit:parseFloat(f.exit)||0,commission:parseFloat(f.commission)||0,accountId,id:trade?.id||uid()});}}>{isEdit?"Guardar cambios":"Registrar operación"}</Btn>
        </div>
      </div>
    </Moda>
  );
}

// ── CALCULADORA DE POSICIÓN
function Calculadora(){
  const [modo,setModo]=useState("forex");
  // Forex: entrada directa en $
  const [f,setF]=useState({riesgoUSD:"100",sl:"10",par:"EURUSD"});
  // Futuros: entrada directa en $
  const [fut,setFut]=useState({riesgoUSD:"500",sl:"10",instrumento:"NAS100",tickVal:"0.50",tickSize:"0.25"});
  const sv=(k,v)=>setF(p=>({...p,[k]:v}));
  const sf=(k,v)=>setFut(p=>({...p,[k]:v}));

  // Pip values por lote ESTÁNDAR en MT5 (pip = 0.0001 para divisas, 0.10 para XAUUSD)
  const FOREX_PIPS={
    EURUSD:10, GBPUSD:10, AUDUSD:10, NZDUSD:10,
    USDCAD:7.5, USDCHF:11, USDJPY:6.9,
    GBPJPY:6.9, EURJPY:6.9, GBPAUD:7,
    XAUUSD:10,  // Gold: 1 pip = $0.10 → $10/lote estándar
    XAGUSD:50,  // Silver: $50/lote estándar
    BTCUSD:1,
  };

  // Micros de futuros (base = 1 micro contrato)
  const FUTUROS={
    NAS100:{nombre:"NAS100 — MNQ (Micro)",tickSize:0.25,microTick:0.50,miniRatio:10,miniNombre:"MNQ→NQ",pipNota:"MNQ $0.50/tick · 10 MNQ = 1 NQ ($5/tick)"},
    ES:{nombre:"S&P 500 — MES (Micro)",tickSize:0.25,microTick:1.25,miniRatio:10,miniNombre:"MES→ES",pipNota:"MES $1.25/tick · 10 MES = 1 ES ($12.50/tick)"},
    YM:{nombre:"Dow Jones — MYM (Micro)",tickSize:1,microTick:0.50,miniRatio:10,miniNombre:"MYM→YM",pipNota:"MYM $0.50/tick · 10 MYM = 1 YM ($5/tick)"},
    GC:{nombre:"Oro — MGC (Micro)",tickSize:0.10,microTick:1.00,miniRatio:10,miniNombre:"MGC→GC",pipNota:"MGC $1/tick · 10 MGC = 1 GC ($10/tick)"},
    CL:{nombre:"Petróleo — MCL (Micro)",tickSize:0.01,microTick:1.00,miniRatio:10,miniNombre:"MCL→CL",pipNota:"MCL $1/tick · 10 MCL = 1 CL ($10/tick)"},
    OTRO:{nombre:"Otro instrumento",tickSize:0,microTick:0,miniRatio:10,miniNombre:"Micro→Mini",pipNota:""},
  };

  // ── Forex cálculo
  const riskUSD=parseFloat(f.riesgoUSD)||0;
  const slPips=parseFloat(f.sl)||1;
  const pipVal=FOREX_PIPS[f.par]||10;
  const lotaje=riskUSD/(slPips*pipVal);
  const minilots=lotaje*10,microlots=lotaje*100;

  // ── Futuros cálculo (base MICRO)
  const friskUSD=parseFloat(fut.riesgoUSD)||0;
  const fsl=parseFloat(fut.sl)||1;
  const selFut=FUTUROS[fut.instrumento]||FUTUROS.NAS100;
  const useTick=selFut.tickSize||parseFloat(fut.tickSize)||0.25;
  const useMicroTick=selFut.microTick||parseFloat(fut.tickVal)||0.5;
  const ticksEnSL=fsl/useTick;
  const riskPerMicro=ticksEnSL*useMicroTick;
  const micros=riskPerMicro>0?Math.floor(friskUSD/riskPerMicro):0;
  const riskReal=micros*riskPerMicro;
  const miniEquiv=(micros/selFut.miniRatio).toFixed(1);

  const InfoBox=({label,val,sub,color})=>(
    <div style={{background:T.s3,borderRadius:10,padding:"14px 16px",flex:1,textAlign:"center"}}>
      <div style={{fontSize:9,color:T.muted,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color:color||T.orange,fontFamily:"'JetBrains Mono',monospace"}}>{val}</div>
      {sub&&<div style={{fontSize:10,color:T.muted,marginTop:4}}>{sub}</div>}
    </div>
  );

  return(
    <div style={{padding:20,overflow:"auto",height:"100%",boxSizing:"border-box"}}>
      <div style={{display:"flex",gap:3,background:T.s2,borderRadius:10,padding:4,marginBottom:20,border:`1px solid ${T.border}`,width:"fit-content"}}>
        {[{id:"forex",l:"🌍 Forex"},{id:"futuros",l:"📈 Futuros Alpha"}].map(m=>(
          <button key={m.id} onClick={()=>setModo(m.id)} style={{background:modo===m.id?T.s3:"transparent",border:`1px solid ${modo===m.id?T.border:"transparent"}`,borderRadius:7,padding:"8px 20px",color:modo===m.id?T.white:T.text,cursor:"pointer",fontSize:13,fontWeight:modo===m.id?700:400,fontFamily:"'DM Sans',sans-serif"}}>{m.l}</button>
        ))}
      </div>

      {modo==="forex"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card>
            <SLabel text="PARÁMETROS — FOREX"/>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Inp label="💵 ¿Cuánto dinero quieres arriesgar? ($)" value={f.riesgoUSD} onChange={v=>sv("riesgoUSD",v)} type="number" placeholder="100" iSx={{fontSize:16,fontWeight:700,borderColor:T.orange,color:T.orange}}/>
              <Inp label="Stop Loss (en pips)" value={f.sl} onChange={v=>sv("sl",v)} type="number" placeholder="10"/>
              <Sel label="Par de divisas" value={f.par} onChange={v=>sv("par",v)} options={Object.keys(FOREX_PIPS)}/>
              <div style={{background:T.blL,border:`1px solid ${T.blue}33`,borderRadius:8,padding:"12px",fontSize:12,color:T.text,lineHeight:1.8}}>
                💡 <strong style={{color:T.white}}>{f.par}</strong> · Valor pip: <strong style={{color:T.blue}}>${pipVal.toFixed(2)}/lote</strong><br/>
                Riesgo: <strong style={{color:T.orange}}>{fm(riskUSD)}</strong> · SL: <strong style={{color:T.white}}>{slPips} pips</strong>
              </div>
            </div>
          </Card>
          <Card>
            <SLabel text="RESULTADO — LOTAJE"/>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <InfoBox label="Lotes estándar" val={lotaje.toFixed(2)} sub="1 lote = 100k unidades"/>
              <InfoBox label="Mini lotes" val={minilots.toFixed(2)} sub="0.1 lote = 10k" color={T.blue}/>
              <InfoBox label="Micro lotes" val={microlots.toFixed(1)} sub="0.01 lote = 1k" color={T.green}/>
            </div>
            <div style={{background:T.s3,borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{fontSize:11,color:T.text,marginBottom:10,fontWeight:700}}>Desglose:</div>
              {[["Quiero arriesgar",fm(riskUSD)],["SL",slPips+" pips"],["Valor pip/lote",`$${pipVal.toFixed(2)}`],["Lotaje exacto",lotaje.toFixed(4)+" lotes"],["En mini lotes",minilots.toFixed(2)+" mini"],["En micro lotes",microlots.toFixed(1)+" micro"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}>
                  <span style={{color:T.muted}}>{k}</span><span style={{color:T.white,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:T.orL,border:`1px solid ${T.orange}44`,borderRadius:8,padding:"12px",fontSize:12,color:T.orange,lineHeight:1.7}}>
              ⚡ Coloca <strong>{minilots.toFixed(2)} mini lotes</strong> ({microlots.toFixed(1)} micro) para arriesgar exactamente <strong>{fm(riskUSD)}</strong> con {slPips} pips de SL
            </div>
          </Card>
        </div>
      )}

      {modo==="futuros"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <Card>
            <SLabel text="PARÁMETROS — FUTUROS (ALPHA)"/>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Inp label="💵 ¿Cuánto dinero quieres arriesgar? ($)" value={fut.riesgoUSD} onChange={v=>sf("riesgoUSD",v)} type="number" placeholder="500" iSx={{fontSize:16,fontWeight:700,borderColor:T.orange,color:T.orange}}/>
              <Inp label="Stop Loss (en puntos del instrumento)" value={fut.sl} onChange={v=>sf("sl",v)} type="number" placeholder="10"/>
              <Sel label="Instrumento (Micro)" value={fut.instrumento} onChange={v=>{sf("instrumento",v);const s=FUTUROS[v];if(s&&s.tickSize){sf("tickSize",String(s.tickSize));sf("tickVal",String(s.microTick));}}} options={Object.entries(FUTUROS).map(([k,v])=>({v:k,l:v.nombre}))}/>
              {fut.instrumento==="OTRO"&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <Inp label="Tick size" value={fut.tickSize} onChange={v=>sf("tickSize",v)} type="number" placeholder="0.25"/>
                  <Inp label="Valor tick micro ($)" value={fut.tickVal} onChange={v=>sf("tickVal",v)} type="number" placeholder="0.50"/>
                </div>
              )}
              {selFut.pipNota&&fut.instrumento!=="OTRO"&&(
                <div style={{background:T.blL,border:`1px solid ${T.blue}33`,borderRadius:8,padding:"12px",fontSize:12,color:T.text,lineHeight:1.8}}>
                  💡 {selFut.pipNota}<br/>
                  <strong style={{color:T.white}}>Tick size: {useTick} pts</strong> · <strong style={{color:T.blue}}>${useMicroTick.toFixed(2)}/tick por micro</strong>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <SLabel text="RESULTADO — CONTRATOS MICRO"/>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <InfoBox label="Micros a operar" val={micros} sub={`${selFut.miniNombre?.split("→")[0]||"Micro"} contracts`}/>
              <InfoBox label="Equivale a" val={miniEquiv} sub={`${selFut.miniNombre?.split("→")[1]||"Mini"} contracts`} color={T.blue}/>
              <InfoBox label="Riesgo real" val={fm(riskReal)} sub="con contratos enteros" color={riskReal<=friskUSD?T.green:T.red}/>
            </div>
            <div style={{background:T.s3,borderRadius:10,padding:14,marginBottom:12}}>
              <div style={{fontSize:11,color:T.text,marginBottom:10,fontWeight:700}}>Desglose:</div>
              {[["Quiero arriesgar",fm(friskUSD)],["SL",fsl+" puntos"],["Ticks en el SL",ticksEnSL.toFixed(0)+" ticks"],["Valor tick (micro)",`$${useMicroTick.toFixed(2)}`],["Riesgo por micro",fm(riskPerMicro)],["Micros exactos",(friskUSD/riskPerMicro||0).toFixed(2)],["Micros a usar (enteros)",micros],["Equivale en minis",miniEquiv+" minis"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}>
                  <span style={{color:T.muted}}>{k}</span><span style={{color:T.white,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:T.orL,border:`1px solid ${T.orange}44`,borderRadius:8,padding:"12px",fontSize:12,color:T.orange,lineHeight:1.7}}>
              ⚡ Opera <strong>{micros} micro{micros!==1?"s":""}</strong> ({miniEquiv} minis equiv.) → riesgo real: <strong>{fm(riskReal)}</strong> con {fsl} puntos de SL
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── REGLAS DE CUENTA
function Reglas({account,rules,onSave}){
  const [f,setF]=useState(rules||{maxTradesDay:"",maxDailyLoss:"",maxSL:"",blockedDays:[]});
  const sv=(k,v)=>setF(p=>({...p,[k]:v}));
  const toggleDay=(d)=>setF(p=>({...p,blockedDays:p.blockedDays.includes(d)?p.blockedDays.filter(x=>x!==d):[...p.blockedDays,d]}));
  if(!account)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><p style={{color:T.muted,fontSize:13}}>Selecciona una cuenta para configurar sus reglas</p></div>);
  return(
    <div style={{padding:20,overflow:"auto",height:"100%",boxSizing:"border-box"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card>
            <SLabel text="LÍMITES DE OPERACIÓN"/>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Inp label="Máximo de operaciones por día" value={f.maxTradesDay} onChange={v=>sv("maxTradesDay",v)} type="number" placeholder="Ej: 3 (dejar vacío = sin límite)"/>
              <Inp label="Pérdida diaria máxima ($)" value={f.maxDailyLoss} onChange={v=>sv("maxDailyLoss",v)} type="number" placeholder="Ej: 500 (dejar vacío = sin límite)"/>
              <Inp label="SL máximo por operación ($)" value={f.maxSL} onChange={v=>sv("maxSL",v)} type="number" placeholder="Ej: 200 (dejar vacío = sin límite)"/>
            </div>
          </Card>
          <Card>
            <SLabel text="DÍAS BLOQUEADOS (no operar)"/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{d:"1",l:"Lun"},{d:"2",l:"Mar"},{d:"3",l:"Mié"},{d:"4",l:"Jue"},{d:"5",l:"Vie"},{d:"6",l:"Sáb"},{d:"0",l:"Dom"}].map(({d,l})=>{
                const active=f.blockedDays.includes(d);
                return(<button key={d} onClick={()=>toggleDay(d)} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${active?T.red:T.border}`,background:active?T.reL:T.s3,color:active?T.red:T.text,cursor:"pointer",fontSize:12,fontWeight:active?700:400,fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}>{l}</button>);
              })}
            </div>
            <p style={{fontSize:11,color:T.muted,marginTop:10,lineHeight:1.6}}>Los días seleccionados aparecerán como alerta en el dashboard si intentas operar en ellos.</p>
          </Card>
          <Btn onClick={()=>onSave(f)} style={{background:T.grad}}>💾 Guardar reglas de la cuenta</Btn>
        </div>
        <Card>
          <SLabel text="RESUMEN DE REGLAS ACTIVAS"/>
          {[
            [f.maxTradesDay,"🔢",`Máximo ${f.maxTradesDay} operaciones/día`,"Sin límite de operaciones diarias"],
            [f.maxDailyLoss,"🛑",`Pérdida diaria máx: ${fm(-Math.abs(parseFloat(f.maxDailyLoss||0)))}`,"Sin límite de pérdida diaria"],
            [f.maxSL,"⚠️",`SL máximo por op: ${fm(parseFloat(f.maxSL||0))}`,"Sin límite de SL por operación"],
            [f.blockedDays.length,"📅",`Días bloqueados: ${f.blockedDays.map(d=>DAYS[d]).join(", ")}`,"Sin días bloqueados"],
          ].map(([active,icon,text,empty],i)=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
              <div>
                <div style={{fontSize:13,color:active?T.white:T.muted,fontWeight:active?600:400}}>{active?text:empty}</div>
                {active?<div style={{fontSize:10,color:T.green,marginTop:3,fontWeight:700}}>✓ ACTIVA</div>:<div style={{fontSize:10,color:T.muted,marginTop:3}}>sin configurar</div>}
              </div>
            </div>
          ))}
          <div style={{marginTop:16,background:T.blL,border:`1px solid ${T.blue}33`,borderRadius:8,padding:"12px",fontSize:11,color:T.text,lineHeight:1.7}}>
            🧠 Las alertas aparecen automáticamente en el <strong style={{color:T.white}}>Dashboard</strong> cuando detectan que estás violando una regla en tiempo real.
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── DASHBOARD PAGE
function Dashboard({account,trades,m,rules}){
  const depSum=(account?.deposits||[]).reduce((s,d)=>s+d.amount,0);
  const base=account?account.initialBalance+depSum:0;
  const curBal=base+(m?.totPnl||0);
  const gainPct=base>0?(m?.totPnl||0)/base*100:0;
  const goal=account?.goal||20;
  const prog=Math.min(100,Math.max(0,gainPct/goal*100));
  const alerts=useMemo(()=>checkRules(rules,trades,account),[rules,trades,account]);
  const monthlyData=useMemo(()=>{const now=new Date();return Array.from({length:12},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-11+i,1);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;return{label:MONTHS[d.getMonth()],pnl:m?.monM[k]?.pnl||0};});},[m]);
  const dayData=useMemo(()=>[1,2,3,4,5,6,0].map(d=>({label:DAYS[d],pnl:m?.dayM[d]?.pnl||0})),[m]);
  const topAssets=useMemo(()=>m?Object.entries(m.symM).sort((a,b)=>b[1].pnl-a[1].pnl).slice(0,5).map(([k,v])=>({sym:k,pnl:v.pnl,wr:v.n?v.w/v.n*100:0,n:v.n})):[],[m]);

  if(!account)return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:16}}>
      <div style={{width:80,height:80,background:T.orL,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,border:`1px solid ${T.orange}33`}}>📊</div>
      <div style={{textAlign:"center"}}><p style={{color:T.white,fontSize:15,fontWeight:600,margin:"0 0 6px"}}>Bienvenido a TradeLog Pro</p><p style={{color:T.muted,fontSize:13,margin:0,lineHeight:1.7}}>Crea tu primera cuenta con el botón <span style={{color:T.orange,fontWeight:700}}>+</span> en el panel izquierdo</p></div>
    </div>
  );

  const KPI=({label,val,sub,color})=>(
    <div style={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",flex:1,minWidth:100}}>
      <div style={{fontSize:9,color:T.text,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color:color||T.white,fontFamily:"'JetBrains Mono',monospace",marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{val}</div>
      {sub&&<div style={{fontSize:10,color:T.muted}}>{sub}</div>}
    </div>
  );

  return(
    <div style={{padding:20,overflow:"auto",height:"100%",boxSizing:"border-box"}}>
      {/* ALERTAS DE REGLAS */}
      {alerts.length>0&&(
        <div style={{marginBottom:14,display:"flex",flexDirection:"column",gap:8}}>
          {alerts.map((a,i)=>(
            <div key={i} style={{background:a.type==="danger"?T.reL:T.amL,border:`1px solid ${a.type==="danger"?T.red:T.amber}55`,borderRadius:10,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{a.icon}</span>
              <span style={{fontSize:13,fontWeight:600,color:a.type==="danger"?T.red:T.amber}}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}
      {/* Meta Progress */}
      <Card sx={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:10,color:T.text,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>PROGRESO HACIA LA META</span>
            <span style={{fontSize:10,color:T.muted}}>Objetivo: {fp(goal)}</span>
          </div>
          <span style={{fontSize:20,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:gainPct>=0?T.green:T.red}}>{fp(gainPct)}</span>
        </div>
        <div style={{background:T.s3,borderRadius:999,height:10,overflow:"hidden"}}>
          <div style={{width:`${prog}%`,height:"100%",background:"linear-gradient(90deg,#FF6B35,#FBBF24,#4ADE80)",borderRadius:999,transition:"width .7s ease",boxShadow:"0 0 12px rgba(255,107,53,.4)"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:T.muted}}>
          <span>Capital base: {fm(base,false)}</span>
          <span style={{color:T.orange,fontWeight:700}}>{prog.toFixed(0)}% completado</span>
          <span>Meta: {fm(base*(1+goal/100),false)}</span>
        </div>
      </Card>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <KPI label="Balance Actual" val={fm(curBal,false)} sub={`${fp(gainPct)} desde el inicio`} color={gainPct>=0?T.green:T.red}/>
        <KPI label="P&L Total" val={fm(m?.totPnl||0)} sub={`${m?.total||0} operaciones`} color={(m?.totPnl||0)>=0?T.green:T.red}/>
        <KPI label="Win Rate" val={m?`${m.wr.toFixed(1)}%`:"—"} sub={m?`${m.tp}✅ ${m.sl}❌ ${m.be}🎯`:"Sin ops"} color={m?.wr>=55?T.green:m?.wr>=45?T.amber:T.red}/>
        <KPI label="Profit Factor" val={m?m.pf.toFixed(2):"—"} sub={m?.pf>=1.5?"Bueno":m?.pf>=1?"Regular":"Bajo"} color={m?.pf>=1.5?T.green:m?.pf>=1?T.amber:T.red}/>
        <KPI label="Expectativa" val={m?fm(m.exp):"—"} sub="por operación" color={m?.exp>=0?T.green:T.red}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 230px",gap:14,marginBottom:16}}>
        <Card>
          <SLabel text="CURVA DE EQUITY"/>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={m?.equity||[{d:"—",v:0}]} margin={{top:5,right:5,bottom:5,left:10}}>
              <defs><linearGradient id="gEq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={.35}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="d" tick={{fill:T.text,fontSize:9}}/><YAxis tick={{fill:T.text,fontSize:9}} tickFormatter={v=>fm(v,false)} width={62}/><Tooltip content={<ChartTip/>}/><ReferenceLine y={0} stroke={T.muted} strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="v" name="P&L" stroke={T.green} fill="url(#gEq)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SLabel text="RESUMEN"/>
          {[["Ganancia media",m?fm(m.avgW):"-",T.green],["Pérdida media",m?fm(m.avgL):"-",T.red],["Ratio R:R",m?m.rr.toFixed(2)+"x":"-",T.blue],["Drawdown",m?fm(m.dd):"-",T.amber],["Buy WR",m?m.bwr.toFixed(1)+"%":"-",T.white],["Sell WR",m?m.swr.toFixed(1)+"%":"-",T.white],["Racha ✅",m?m.mws+" ops":"-",T.green],["Racha ❌",m?m.mls+" ops":"-",T.red]].map(([k,v,c])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}>
              <span style={{color:T.text}}>{k}</span><span style={{color:c,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
            </div>
          ))}
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <Card>
          <SLabel text="P&L MENSUAL (12M)"/>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={monthlyData} margin={{top:4,right:4,bottom:4,left:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="label" tick={{fill:T.text,fontSize:8}}/><YAxis tick={{fill:T.text,fontSize:8}} tickFormatter={v=>fm(v,false)} width={50}/><Tooltip content={<ChartTip/>}/><ReferenceLine y={0} stroke={T.muted}/>
              <Bar dataKey="pnl" name="P&L" radius={[3,3,0,0]}>{monthlyData.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.green:T.red}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SLabel text="POR DÍA DE SEMANA"/>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dayData} margin={{top:4,right:4,bottom:4,left:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="label" tick={{fill:T.text,fontSize:8}}/><YAxis tick={{fill:T.text,fontSize:8}} tickFormatter={v=>fm(v,false)} width={50}/><Tooltip content={<ChartTip/>}/><ReferenceLine y={0} stroke={T.muted}/>
              <Bar dataKey="pnl" name="P&L" radius={[3,3,0,0]}>{dayData.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.green:T.red}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SLabel text="TOP ACTIVOS"/>
          {topAssets.length===0?<p style={{color:T.muted,fontSize:12,lineHeight:1.6,marginTop:4}}>Registra operaciones para ver el ranking</p>:topAssets.map(a=>{
            const maxP=Math.max(...topAssets.map(x=>Math.abs(x.pnl)),1);
            return(<div key={a.sym} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:11}}><span style={{color:T.white,fontWeight:700}}>{a.sym}</span><span style={{color:a.pnl>=0?T.green:T.red,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fm(a.pnl)}</span></div>
              <div style={{background:T.s3,borderRadius:999,height:4}}><div style={{width:`${Math.abs(a.pnl)/maxP*100}%`,height:"100%",background:a.pnl>=0?T.green:T.red,borderRadius:999}}/></div>
              <div style={{fontSize:9,color:T.muted,marginTop:2}}>{a.n} ops · {a.wr.toFixed(0)}% WR</div>
            </div>);
          })}
        </Card>
      </div>
    </div>
  );
}

// ── OPERACIONES PAGE
function Operaciones({trades,accountId,onAdd,onEdit,onDelete}){
  const [view,setView]=useState("calendar");
  const [calDate,setCalDate]=useState(new Date());
  const [selDay,setSelDay]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [editT,setEditT]=useState(null);
  const [delId,setDelId]=useState(null);
  const [q,setQ]=useState("");
  const yr=calDate.getFullYear(),mo=calDate.getMonth();
  const firstOff=(new Date(yr,mo,1).getDay()+6)%7;
  const daysInMo=new Date(yr,mo+1,0).getDate();
  const byDate=useMemo(()=>{const m={};trades.forEach(t=>{if(!m[t.date])m[t.date]=[];m[t.date].push(t);});return m;},[trades]);
  const selTr=selDay?byDate[selDay]||[]:[];
  const moTr=trades.filter(t=>{const d=new Date(t.date+"T12:00:00");return d.getMonth()===mo&&d.getFullYear()===yr;});
  const moTp=moTr.filter(t=>t.result==="TP"),moSl=moTr.filter(t=>t.result==="SL"),moBe=moTr.filter(t=>t.result==="BE");
  const moPnl=moTr.reduce((s,t)=>s+(t.pnl||0),0),moWR=moTr.length?moTp.length/moTr.length*100:0;
  const moGW=moTp.reduce((s,t)=>s+(t.pnl||0),0),moGL=Math.abs(moSl.reduce((s,t)=>s+(t.pnl||0),0));
  const moPF=moGL>0?moGW/moGL:moGW>0?9.9:0;
  const filtTr=useMemo(()=>{const qq=q.toLowerCase();return trades.filter(t=>!qq||[t.symbol,t.strategy,t.session,t.notes,t.result].some(x=>(x||"").toLowerCase().includes(qq)));},[trades,q]);

  // Colores de celda del calendario con soporte BE
  const calBg=(dts,dpnl,isSel)=>{
    if(isSel)return T.s3;
    if(!dts.length)return T.s1;
    const allBE=dts.every(t=>t.result==="BE");
    if(allBE)return T.amL;
    return dpnl>=0?T.grL:T.reL;
  };
  const calBorder=(dts,dpnl,isSel,isToday)=>{
    if(isSel)return T.orange;
    if(isToday)return T.blue;
    if(!dts.length)return T.border;
    const allBE=dts.every(t=>t.result==="BE");
    if(allBE)return T.amber+"44";
    return dpnl>=0?T.green+"44":T.red+"44";
  };

  return(
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"10px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.s2}}>
          <div style={{display:"flex",gap:3,background:T.s3,borderRadius:8,padding:3}}>
            {["calendar","tabla"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{background:view===v?T.s1:"transparent",border:`1px solid ${view===v?T.border:"transparent"}`,borderRadius:6,padding:"6px 14px",color:view===v?T.white:T.text,cursor:"pointer",fontSize:12,fontWeight:view===v?700:400,fontFamily:"'DM Sans',sans-serif"}}>
                {v==="calendar"?"📅 Calendario":"≡ Tabla"}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            {view==="tabla"&&<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar símbolo, estrategia, TP/SL/BE..." style={{background:T.s3,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 12px",color:T.white,fontSize:12,outline:"none",fontFamily:"'DM Sans',sans-serif",width:220}}/>}
            <Btn onClick={()=>setShowAdd(true)}>+ Nueva operación</Btn>
          </div>
        </div>

        {view==="calendar"&&(
          <div style={{flex:1,overflow:"auto",padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <button onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))} style={{background:T.s3,border:`1px solid ${T.border}`,borderRadius:8,width:34,height:34,cursor:"pointer",color:T.white,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <h3 style={{margin:0,color:T.white,fontSize:16,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}}>{MONTHS_F[mo]} {yr}</h3>
              <button onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))} style={{background:T.s3,border:`1px solid ${T.border}`,borderRadius:8,width:34,height:34,cursor:"pointer",color:T.white,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            </div>
            {/* Leyenda */}
            <div style={{display:"flex",gap:12,marginBottom:10,fontSize:10}}>
              {[["#4ADE8044","#4ADE80","Ganancia"],["#F8717144","#F87171","Pérdida"],["#FBBF2444","#FBBF24","Break Even"]].map(([bg,color,label])=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:3,background:bg,border:`1px solid ${color}`}}/><span style={{color:T.muted}}>{label}</span></div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:14}}>
              {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:700,color:T.muted,padding:"5px 0",letterSpacing:.8,textTransform:"uppercase"}}>{d}</div>)}
              {Array(firstOff).fill(null).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({length:daysInMo},(_,i)=>{
                const day=i+1,ds=`${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const dts=byDate[ds]||[],dpnl=dts.reduce((s,t)=>s+(t.pnl||0),0);
                const isSel=selDay===ds,isToday=ds===tday(),hasTr=dts.length>0;
                const allBE=hasTr&&dts.every(t=>t.result==="BE");
                const pnlColor=allBE?T.amber:dpnl>=0?T.green:T.red;
                return(<div key={day} onClick={()=>setSelDay(isSel?null:ds)} style={{borderRadius:8,padding:"6px 5px",cursor:"pointer",minHeight:52,background:calBg(dts,dpnl,isSel),border:`1px solid ${calBorder(dts,dpnl,isSel,isToday)}`,transition:"all .1s"}}>
                  <div style={{fontSize:10,fontWeight:600,color:isToday?T.blue:T.text,marginBottom:hasTr?2:0}}>{day}</div>
                  {hasTr&&<><div style={{fontSize:10,fontWeight:700,color:pnlColor,fontFamily:"'JetBrains Mono',monospace"}}>{allBE?"BE":fm(dpnl)}</div><div style={{fontSize:8,color:T.muted}}>{dts.length} op{dts.length>1?"s":""}</div></>}
                </div>);
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,background:T.s2,borderRadius:10,padding:12,border:`1px solid ${T.border}`}}>
              {[["Ops",moTr.length,T.blue],["✅ TP",moTp.length,T.green],["❌ SL",moSl.length,T.red],["🎯 BE",moBe.length,T.amber],[`P&L ${MONTHS[mo]}`,fm(moPnl),moPnl>=0?T.green:T.red],["Win Rate",`${moWR.toFixed(1)}%`,moWR>=55?T.green:moWR>0?T.amber:T.muted],["PF",moPF>0?moPF.toFixed(2):"—",moPF>=1.5?T.green:moPF>=1?T.amber:T.red]].map(([k,v,c])=>(
                <div key={k} style={{textAlign:"center"}}><div style={{fontSize:8,color:T.muted,fontWeight:700,marginBottom:4,letterSpacing:.8,textTransform:"uppercase"}}>{k}</div><div style={{fontSize:13,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</div></div>
              ))}
            </div>
          </div>
        )}

        {view==="tabla"&&(
          <div style={{flex:1,overflow:"auto",padding:18}}>
            <div style={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:T.s3}}>{["Fecha","Símbolo","Dir.","Sesión","Estrategia","TF","Result","P&L",""].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:9,fontWeight:700,color:T.text,borderBottom:`1px solid ${T.border}`,textTransform:"uppercase",letterSpacing:.8}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtTr.length===0?<tr><td colSpan={9} style={{padding:"36px",textAlign:"center",color:T.muted,fontSize:13}}>Sin operaciones{q?" coincidentes":""}</td></tr>:
                  filtTr.sort((a,b)=>b.date>a.date?1:-1).map(t=>(
                    <tr key={t.id} style={{borderBottom:`1px solid ${T.border}`}} onMouseEnter={e=>e.currentTarget.style.background=T.s3} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"9px 12px",fontSize:10,color:T.text}}>{t.date}</td>
                      <td style={{padding:"9px 12px",fontSize:12,fontWeight:700,color:T.white}}>{t.symbol}</td>
                      <td style={{padding:"9px 12px"}}><span style={{background:t.direction==="Compra"?T.grL:T.reL,color:t.direction==="Compra"?T.green:T.red,border:`1px solid ${t.direction==="Compra"?T.green:T.red}44`,borderRadius:20,padding:"2px 7px",fontSize:9,fontWeight:700}}>{t.direction}</span></td>
                      <td style={{padding:"9px 12px",fontSize:10,color:T.text}}>{t.session||"—"}</td>
                      <td style={{padding:"9px 12px",fontSize:10,color:T.text}}>{t.strategy||"—"}</td>
                      <td style={{padding:"9px 12px",fontSize:10,color:T.muted}}>{t.timeframe||"—"}</td>
                      <td style={{padding:"9px 12px"}}><span style={{background:resBg(t.result),color:resColor(t.result),border:`1px solid ${resBorder(t.result)}`,borderRadius:20,padding:"2px 7px",fontSize:9,fontWeight:700}}>{t.result}</span></td>
                      <td style={{padding:"9px 12px",fontSize:12,fontWeight:700,color:t.result==="BE"?T.amber:t.pnl>=0?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{t.result==="BE"?"BE":fm(t.pnl)}</td>
                      <td style={{padding:"9px 12px"}}><div style={{display:"flex",gap:4}}><Btn variant="ghost" size="sm" onClick={()=>setEditT(t)}>✏️</Btn><Btn variant="danger" size="sm" onClick={()=>setDelId(t.id)}>🗑</Btn></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selDay&&view==="calendar"&&(
        <div style={{width:286,borderLeft:`1px solid ${T.border}`,overflow:"auto",flexShrink:0,background:T.s1}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.s2}}>
            <div><div style={{fontSize:9,color:T.text,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>DÍA SELECCIONADO</div><div style={{fontSize:14,fontWeight:700,color:T.white,marginTop:2}}>{selDay}</div></div>
            <button onClick={()=>setSelDay(null)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
          </div>
          <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
            {selTr.length===0?<p style={{color:T.muted,textAlign:"center",marginTop:20,fontSize:13}}>Sin operaciones este día</p>:selTr.map(t=>(
              <div key={t.id} style={{background:T.s2,border:`1px solid ${resBorder(t.result)}`,borderRadius:10,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{display:"flex",gap:5}}>
                    <span style={{background:resBg(t.result),color:resColor(t.result),border:`1px solid ${resBorder(t.result)}`,borderRadius:20,padding:"2px 7px",fontSize:9,fontWeight:700}}>{t.result}</span>
                    <span style={{background:t.direction==="Compra"?T.grL:T.reL,color:t.direction==="Compra"?T.green:T.red,border:`1px solid ${t.direction==="Compra"?T.green:T.red}44`,borderRadius:20,padding:"2px 7px",fontSize:9,fontWeight:700}}>{t.direction}</span>
                  </div>
                  <span style={{fontSize:15,fontWeight:700,color:resColor(t.result),fontFamily:"'JetBrains Mono',monospace"}}>{t.result==="BE"?"BE":fm(t.pnl)}</span>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:T.white,marginBottom:8}}>{t.symbol}</div>
                {[["Sesión",t.session],["TF",t.timeframe],["Estrategia",t.strategy],["R:R",t.rr?t.rr+"x":null],["Hora",t.time]].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:T.muted}}>{k}</span><span style={{color:T.text}}>{v}</span></div>
                ))}
                {t.notes&&<div style={{marginTop:8,fontSize:11,color:T.text,fontStyle:"italic",borderTop:`1px solid ${T.border}`,paddingTop:8,lineHeight:1.5}}>{t.notes}</div>}
                {[t.url1,t.url2,t.url3].filter(Boolean).map((url,i)=>(
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:T.blue,textDecoration:"none",background:T.blL,padding:"3px 7px",borderRadius:4,border:`1px solid ${T.blue}33`,display:"inline-block",marginTop:6,marginRight:4}}>📈 Gráfico {i+1}</a>
                ))}
                <div style={{display:"flex",gap:6,marginTop:10}}>
                  <Btn variant="ghost" size="sm" onClick={()=>setEditT(t)}>Editar</Btn>
                  <Btn variant="danger" size="sm" onClick={()=>setDelId(t.id)}>Eliminar</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showAdd&&<TradeModal accountId={accountId} onSave={t=>{onAdd(t);setShowAdd(false);}} onClose={()=>setShowAdd(false)}/>}
      {editT&&<TradeModal trade={editT} accountId={accountId} onSave={t=>{onEdit(t);setEditT(null);}} onClose={()=>setEditT(null)}/>}
      {delId&&<Moda title="Eliminar operación" onClose={()=>setDelId(null)} w={360}><p style={{color:T.text,marginBottom:20,lineHeight:1.6}}>¿Eliminar esta operación? Esta acción no se puede deshacer.</p><div style={{display:"flex",justifyContent:"flex-end",gap:10}}><Btn variant="ghost" onClick={()=>setDelId(null)}>Cancelar</Btn><Btn variant="danger" onClick={()=>{onDelete(delId);setDelId(null);}}>Sí, eliminar</Btn></div></Moda>}
    </div>
  );
}

// ── ESTADÍSTICAS PAGE
function Estadisticas({account,trades,m}){
  const depSum=(account?.deposits||[]).reduce((s,d)=>s+d.amount,0);
  const base=account?account.initialBalance+depSum:0;
  const gainPct=base>0?(m?.totPnl||0)/base*100:0;
  const yr=new Date().getFullYear();
  const rows=MONTHS.map((mon,i)=>{const k=`${yr}-${String(i+1).padStart(2,"0")}`,mv=m?.monM[k];return{mon,tp:mv?.w||0,sl:mv?.l||0,be:mv?.b||0,n:mv?.n||0,wr:mv?.n?mv.w/mv.n*100:0,pnl:mv?.pnl||0};});
  const yrTot=rows.reduce((s,r)=>({tp:s.tp+r.tp,sl:s.sl+r.sl,be:s.be+r.be,n:s.n+r.n,pnl:s.pnl+r.pnl}),{tp:0,sl:0,be:0,n:0,pnl:0});
  const yrWR=yrTot.n?yrTot.tp/yrTot.n*100:0;
  const dist=m&&m.total>0?[{name:"Ganadoras",value:m.tp,color:T.green},{name:"Perdedoras",value:m.sl,color:T.red},...(m.be>0?[{name:"Break Even",value:m.be,color:T.amber}]:[])]:[];
  if(!account)return (<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><p style={{color:T.muted}}>Selecciona una cuenta</p></div>);
  return(
    <div style={{padding:20,overflow:"auto",height:"100%",boxSizing:"border-box"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["P&L NETO",m?fm(m.totPnl):"—",`${fp(gainPct)} del capital`,m?.totPnl>=0?T.green:T.red],["OPERACIONES",m?.total||0,`${m?.tp||0}✅ ${m?.sl||0}❌ ${m?.be||0}🎯`,T.blue],["WIN RATE",m?`${m.wr.toFixed(1)}%`:"—",m?.wr>=65?"Excelente":m?.wr>=55?"Bueno":"Regular",m?.wr>=55?T.green:T.amber],["PROFIT FACTOR",m?m.pf.toFixed(2):"—",m?.pf>=1.5?"Bueno":m?.pf>=1?"Aceptable":"Bajo",m?.pf>=1.5?T.green:m?.pf>=1?T.amber:T.red],["GANANCIA MEDIA",m?fm(m.avgW):"—","por trade ganador",T.green],["PÉRDIDA MEDIA",m?fm(m.avgL):"—","por trade perdedor",T.red],["EXPECTATIVA",m?fm(m.exp):"—","por operación",m?.exp>=0?T.green:T.red],["MAX DRAWDOWN",m?fm(m.dd):"—",m?`${m.ddPct.toFixed(1)}% del capital`:"—",T.amber]].map(([k,v,sub,c])=>(
          <div key={k} style={{background:T.s2,border:`1px solid ${T.border}`,borderRadius:12,padding:14}}>
            <div style={{fontSize:9,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{k}</div>
            <div style={{fontSize:20,fontWeight:700,color:c,fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>{v}</div>
            <div style={{fontSize:10,color:T.muted}}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:14,marginBottom:16}}>
        <Card>
          <SLabel text="EVOLUCIÓN DEL CAPITAL"/>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={m?.equity||[{d:"—",v:0}]} margin={{top:5,right:5,bottom:5,left:10}}>
              <defs><linearGradient id="gSt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.blue} stopOpacity={.3}/><stop offset="95%" stopColor={T.blue} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="d" tick={{fill:T.text,fontSize:9}}/><YAxis tick={{fill:T.text,fontSize:9}} tickFormatter={v=>fm(v,false)} width={62}/><Tooltip content={<ChartTip/>}/><ReferenceLine y={0} stroke={T.muted} strokeDasharray="4 4"/>
              <Area type="monotone" dataKey="v" name="P&L" stroke={T.blue} fill="url(#gSt)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SLabel text="DISTRIBUCIÓN"/>
          <div style={{display:"flex",justifyContent:"center",position:"relative",height:140,marginBottom:6}}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={dist.length?dist:[{name:"Sin datos",value:1,color:T.border}]} dataKey="value" innerRadius={44} outerRadius={62} paddingAngle={dist.length?4:0}>
                  {(dist.length?dist:[{color:T.border}]).map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}>
              <div style={{fontSize:18,fontWeight:700,color:T.white}}>{m?.total||0}</div>
              <div style={{fontSize:8,color:T.muted,fontWeight:700,letterSpacing:.8}}>TOTAL</div>
            </div>
          </div>
          {dist.map(d=><div key={d.name} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:7,height:7,borderRadius:"50%",background:d.color}}/><span style={{color:T.text}}>{d.name}</span></div><span style={{color:d.color,fontWeight:700}}>{d.value} · {m?.total?((d.value/m.total)*100).toFixed(0):0}%</span></div>)}
          {m&&<div style={{marginTop:8}}>{[["Racha win máx.",`${m.mws} ops`,T.green],["Racha loss máx.",`${m.mls} ops`,T.red]].map(([k,v,c])=><div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:11}}><span style={{color:T.muted}}>{k}</span><span style={{color:c,fontWeight:700}}>{v}</span></div>)}</div>}
        </Card>
      </div>
      <Card>
        <SLabel text={`RENDIMIENTO MENSUAL ${yr}`}/>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:T.s3}}>{["MES","✅ TP","❌ SL","🎯 BE","TOTAL","WIN%","PROGRESO","P&L"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",color:T.text,fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:.8}}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(r=>{const maxP=Math.max(...rows.map(x=>Math.abs(x.pnl)),1);return(
                <tr key={r.mon} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:T.white}}>{r.mon}</td>
                  <td style={{padding:"8px 12px",color:T.green,fontWeight:600}}>{r.tp}</td>
                  <td style={{padding:"8px 12px",color:T.red,fontWeight:600}}>{r.sl}</td>
                  <td style={{padding:"8px 12px",color:T.amber,fontWeight:600}}>{r.be}</td>
                  <td style={{padding:"8px 12px",color:T.text}}>{r.n}</td>
                  <td style={{padding:"8px 12px",color:r.wr>=55?T.green:r.wr>0?T.amber:T.muted}}>{r.n?`${r.wr.toFixed(0)}%`:"—"}</td>
                  <td style={{padding:"8px 12px",width:90}}>{r.n>0?<div style={{background:T.s3,borderRadius:4,height:5}}><div style={{width:`${Math.abs(r.pnl)/maxP*100}%`,height:"100%",background:r.pnl>=0?T.green:T.red,borderRadius:4}}/></div>:"—"}</td>
                  <td style={{padding:"8px 12px",fontWeight:700,color:r.pnl>0?T.green:r.pnl<0?T.red:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{r.n?fm(r.pnl):"—"}</td>
                </tr>);
              })}
              <tr style={{background:T.s3,borderTop:`2px solid ${T.border}`}}>
                <td style={{padding:"9px 12px",fontWeight:700,color:T.white}}>TOTAL {yr}</td>
                <td style={{padding:"9px 12px",color:T.green,fontWeight:700}}>{yrTot.tp}</td>
                <td style={{padding:"9px 12px",color:T.red,fontWeight:700}}>{yrTot.sl}</td>
                <td style={{padding:"9px 12px",color:T.amber,fontWeight:700}}>{yrTot.be}</td>
                <td style={{padding:"9px 12px",color:T.text,fontWeight:700}}>{yrTot.n}</td>
                <td style={{padding:"9px 12px",color:yrWR>=55?T.green:T.amber,fontWeight:700}}>{yrTot.n?`${yrWR.toFixed(1)}%`:"—"}</td>
                <td/><td style={{padding:"9px 12px",fontWeight:700,color:yrTot.pnl>=0?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{fm(yrTot.pnl)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── ANÁLISIS AVANZADO
function Analisis({trades,m,account,onCopyIA}){
  const [tab,setTab]=useState("rendimiento");
  const TABS=[{id:"rendimiento",l:"Rendimiento"},{id:"instrumentos",l:"Instrumentos"},{id:"tiempo",l:"Tiempo"},{id:"sesiones",l:"Sesiones"},{id:"estrategias",l:"Estrategias"},{id:"recs",l:"⚡ Recomendaciones"}];
  const myRecs=useMemo(()=>calcRecs(m,trades),[m,trades]);
  const dayData=useMemo(()=>[1,2,3,4,5,6,0].map(d=>({label:DAYS[d],pnl:m?.dayM[d]?.pnl||0})),[m]);
  const hourData=useMemo(()=>m?Object.entries(m.hourM).sort((a,b)=>a[0]>b[0]?1:-1).map(([h,v])=>({label:`${h}:00`,pnl:v.pnl,n:v.n})):[],[m]);
  const recColors={ATENCIÓN:T.amber,OPORTUNIDAD:T.blue,RIESGO:T.red,FORTALEZA:T.green};

  const BarList=({data})=>{
    if(!data.length)return (<p style={{color:T.muted,fontSize:12,lineHeight:1.7}}>Sin datos suficientes (mínimo 3 ops por categoría)</p>);
    const sorted=[...data].sort((a,b)=>b.pnl-a.pnl),maxP=Math.max(...sorted.map(d=>Math.abs(d.pnl)),1);
    return sorted.map((d,i)=>(<div key={i} style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
        <div><span style={{color:T.white,fontWeight:700}}>{d.label}</span>{d.n!==undefined&&<span style={{color:T.muted,fontSize:10,marginLeft:8}}>{d.n} ops · {(d.wr||0).toFixed(0)}% WR</span>}</div>
        <span style={{color:d.pnl>=0?T.green:T.red,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fm(d.pnl)}</span>
      </div>
      <div style={{background:T.s3,borderRadius:4,height:6}}><div style={{width:`${Math.abs(d.pnl)/maxP*100}%`,height:"100%",background:d.pnl>=0?T.green:T.red,borderRadius:4}}/></div>
    </div>));
  };

  return(
    <div style={{height:"100%",overflow:"auto",padding:20,boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"flex",gap:3,background:T.s2,borderRadius:10,padding:4,flexWrap:"wrap",border:`1px solid ${T.border}`}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?T.s3:"transparent",border:`1px solid ${tab===t.id?T.border:"transparent"}`,borderRadius:7,padding:"7px 13px",color:tab===t.id?T.white:T.text,cursor:"pointer",fontSize:12,fontWeight:tab===t.id?700:400,fontFamily:"'DM Sans',sans-serif",transition:"all .15s"}}>{t.l}</button>)}
        </div>
        {m&&<Btn variant="amber" size="sm" onClick={onCopyIA}>🤖 Copiar para IA</Btn>}
      </div>

      {!m&&tab!=="recs"&&<div style={{textAlign:"center",paddingTop:40}}><div style={{fontSize:48,marginBottom:12}}>📊</div><p style={{color:T.muted,fontSize:14}}>Registra operaciones para activar el análisis avanzado</p></div>}

      {tab==="rendimiento"&&m&&<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <Card><SLabel text="MÉTRICAS PRINCIPALES"/>
            {[["Total TP",m.tp,T.green],["Total SL",m.sl,T.red],["Break Even",m.be,T.amber],["Win Rate",`${m.wr.toFixed(1)}%`,m.wr>=55?T.green:T.amber],["P&L Total",fm(m.totPnl),m.totPnl>=0?T.green:T.red],["Buy WR",`${m.bwr.toFixed(1)}%`,m.bwr>=55?T.green:T.amber],["Sell WR",`${m.swr.toFixed(1)}%`,m.swr>=55?T.green:T.amber]].map(([k,v,c])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.text}}>{k}</span><span style={{color:c,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span></div>
            ))}
          </Card>
          <Card><SLabel text="MÉTRICAS AVANZADAS"/>
            {[["Ganancia media",fm(m.avgW),T.green],["Pérdida media",fm(m.avgL),T.red],["Expectativa",fm(m.exp),m.exp>=0?T.green:T.red],["Max Drawdown",fm(m.dd),T.amber],["Ratio R:R",`${m.rr.toFixed(2)}x`,T.white],["Racha win máx.",`${m.mws} ops`,T.green],["Racha loss máx.",`${m.mls} ops`,T.red]].map(([k,v,c])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.text}}>{k}</span><span style={{color:c,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span></div>
            ))}
          </Card>
        </div>
        <Card><SLabel text="P&L POR DÍA DE SEMANA"/>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dayData} margin={{top:5,right:5,bottom:5,left:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="label" tick={{fill:T.text,fontSize:10}}/><YAxis tick={{fill:T.text,fontSize:10}} tickFormatter={v=>fm(v,false)} width={55}/><Tooltip content={<ChartTip/>}/><ReferenceLine y={0} stroke={T.muted}/>
              <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>{dayData.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.green:T.red}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>}

      {tab==="instrumentos"&&m&&<Card><SLabel text="RENDIMIENTO POR INSTRUMENTO"/><BarList data={Object.entries(m.symM).map(([k,v])=>({label:k,pnl:v.pnl,wr:v.n?v.w/v.n*100:0,n:v.n}))}/></Card>}

      {tab==="tiempo"&&m&&<div>
        <Card sx={{marginBottom:14}}><SLabel text="P&L POR DÍA DE SEMANA"/>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dayData} margin={{top:5,right:5,bottom:5,left:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="label" tick={{fill:T.text,fontSize:10}}/><YAxis tick={{fill:T.text,fontSize:10}} tickFormatter={v=>fm(v,false)} width={55}/><Tooltip content={<ChartTip/>}/><ReferenceLine y={0} stroke={T.muted}/>
              <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>{dayData.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.green:T.red}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        {hourData.length>0&&<Card><SLabel text="P&L POR HORA (UTC-5)"/>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={hourData} margin={{top:5,right:5,bottom:5,left:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border}/><XAxis dataKey="label" tick={{fill:T.text,fontSize:9}}/><YAxis tick={{fill:T.text,fontSize:9}} tickFormatter={v=>fm(v,false)} width={55}/><Tooltip content={<ChartTip/>}/><ReferenceLine y={0} stroke={T.muted}/>
              <Bar dataKey="pnl" name="P&L" radius={[4,4,0,0]}>{hourData.map((d,i)=><Cell key={i} fill={d.pnl>=0?T.green:T.red}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>}
        {hourData.length===0&&<div style={{textAlign:"center",padding:"32px 0"}}><p style={{color:T.muted,fontSize:13}}>Registra operaciones con hora para ver el análisis temporal</p></div>}
      </div>}

      {tab==="sesiones"&&m&&<Card><SLabel text="RENDIMIENTO POR SESIÓN"/><BarList data={Object.entries(m.sesM).map(([k,v])=>({label:k,pnl:v.pnl,wr:v.n?v.w/v.n*100:0,n:v.n}))}/></Card>}
      {tab==="estrategias"&&m&&<Card><SLabel text="RENDIMIENTO POR ESTRATEGIA"/><BarList data={Object.entries(m.strM).map(([k,v])=>({label:k,pnl:v.pnl,wr:v.n?v.w/v.n*100:0,n:v.n}))}/></Card>}

      {tab==="recs"&&<div>
        <div style={{background:T.blL,border:`1px solid ${T.blue}44`,borderRadius:10,padding:14,marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22}}>🧠</span>
          <div><div style={{color:T.blue,fontWeight:700,fontSize:13,marginBottom:4}}>Motor de recomendaciones automáticas</div><p style={{margin:0,color:T.text,fontSize:12,lineHeight:1.6}}>El sistema analiza tus operaciones y genera insights personalizados. Mínimo 3 operaciones por categoría para activar cada análisis.</p></div>
        </div>
        {myRecs.length===0?<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:48,marginBottom:12}}>📈</div><p style={{color:T.muted,fontSize:14}}>Registra más operaciones para generar recomendaciones.</p></div>:myRecs.map((r,i)=>(
          <div key={i} style={{background:T.s2,border:`1px solid ${(recColors[r.type]||T.border)}33`,borderLeft:`3px solid ${recColors[r.type]||T.border}`,borderRadius:12,padding:18,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <span style={{fontSize:22,flexShrink:0}}>{r.icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontWeight:700,color:T.white,fontSize:14}}>{r.title}</span>
                  <span style={{fontSize:9,fontWeight:700,color:recColors[r.type]||T.text,background:(recColors[r.type]||T.text)+"22",borderRadius:20,padding:"3px 10px",border:`1px solid ${(recColors[r.type]||T.text)}44`,letterSpacing:.8,textTransform:"uppercase"}}>{r.type}</span>
                </div>
                <p style={{margin:0,color:T.text,fontSize:12,lineHeight:1.6}}>{r.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}

// ── SIDEBAR
function Sidebar({accounts,selId,onSelect,onAdd,onEdit,onDelete,page,onPage,clock}){
  const NAV=[{id:"dashboard",icon:"◈",l:"Dashboard"},{id:"operaciones",icon:"≡",l:"Operaciones"},{id:"estadisticas",icon:"↗",l:"Estadísticas"},{id:"analisis",icon:"◉",l:"Análisis Avanzado"},{id:"calculadora",icon:"🧮",l:"Calculadora"},{id:"reglas",icon:"🎯",l:"Reglas de cuenta"}];
  return(
    <div style={{width:220,background:T.s1,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,height:"100%"}}>
      <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,#FF6B35,#FF9535)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff",letterSpacing:-1,flexShrink:0,boxShadow:"0 4px 12px rgba(255,107,53,.4)"}}>TL</div>
          <div><div style={{color:T.white,fontSize:14,fontWeight:700,letterSpacing:-.5,fontFamily:"'DM Sans',sans-serif"}}>TradeLog</div><div style={{color:T.orange,fontSize:8,fontWeight:700,letterSpacing:2,fontFamily:"'DM Sans',sans-serif"}}>JOURNAL PRO</div></div>
        </div>
      </div>
      <div style={{padding:"8px 8px 4px"}}>
        <div style={{fontSize:8,color:T.muted,fontWeight:700,letterSpacing:1.5,padding:"4px 8px 8px",textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>NAVEGACIÓN</div>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>onPage(n.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:page===n.id?T.orL:"transparent",border:`1px solid ${page===n.id?T.orange+"44":"transparent"}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",color:page===n.id?T.orange:T.text,fontSize:11,fontWeight:page===n.id?700:400,textAlign:"left",marginBottom:2,transition:"all .15s",fontFamily:"'DM Sans',sans-serif"}}>
            <span style={{fontSize:12}}>{n.icon}</span>{n.l}
          </button>
        ))}
      </div>
      <div style={{padding:"4px 8px",flex:1,overflow:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px 8px"}}>
          <div style={{fontSize:8,color:T.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif"}}>CUENTAS</div>
          <button onClick={onAdd} style={{background:"linear-gradient(135deg,#FF6B35,#FF9535)",border:"none",borderRadius:6,width:20,height:20,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,lineHeight:1,flexShrink:0,boxShadow:"0 2px 8px rgba(255,107,53,.4)"}}>+</button>
        </div>
        {accounts.length===0&&<p style={{color:T.muted,fontSize:10,textAlign:"center",padding:"12px 0",lineHeight:1.7,fontFamily:"'DM Sans',sans-serif"}}>Crea tu primera cuenta<br/>con el botón <span style={{color:T.orange,fontWeight:700}}>+</span></p>}
        {accounts.map(a=>{
          const isSel=a.id===selId;
          const depSum=(a.deposits||[]).reduce((s,d)=>s+d.amount,0);
          return(<div key={a.id} onClick={()=>onSelect(a.id)} style={{padding:"9px 10px",borderRadius:8,cursor:"pointer",marginBottom:3,background:isSel?T.s3:"transparent",border:`1px solid ${isSel?T.border:"transparent"}`,transition:"all .1s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0,flex:1}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:a.color,flexShrink:0,boxShadow:`0 0 6px ${a.color}88`}}/>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:11,fontWeight:600,color:T.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}}>{a.name}</div>
                  <div style={{fontSize:8,color:T.muted,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>{a.type||"—"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:1,flexShrink:0}}>
                <button onClick={e=>{e.stopPropagation();onEdit(a);}} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:11,padding:"2px 3px",lineHeight:1}}>✏️</button>
                <button onClick={e=>{e.stopPropagation();onDelete(a.id);}} style={{background:"none",border:"none",cursor:"pointer",color:T.red+"88",fontSize:11,padding:"2px 3px",lineHeight:1}}>🗑</button>
              </div>
            </div>
            <div style={{marginTop:3,fontSize:10,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{fm(a.initialBalance+depSum,false)}</div>
          </div>);
        })}
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${T.border}`,textAlign:"center",background:T.s2}}>
        <div style={{fontSize:17,fontWeight:700,color:T.white,fontFamily:"'JetBrains Mono',monospace",letterSpacing:2}}>{clock.time}</div>
        <div style={{fontSize:8,color:T.muted,marginTop:2,fontWeight:600,letterSpacing:.5,fontFamily:"'DM Sans',sans-serif"}}>{clock.date} · UTC-5</div>
      </div>
    </div>
  );
}

// ── ROOT APP
export default function App(){
  const [accounts,setAccounts]=useState([]);
  const [trades,setTrades]=useState([]);
  const [rulesMap,setRulesMap]=useState({});
  const [selId,setSelId]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [loading,setLoading]=useState(true);
  const [addAcc,setAddAcc]=useState(false);
  const [editAcc,setEditAcc]=useState(null);
  const [delAccId,setDelAccId]=useState(null);
  const [clock,setClock]=useState({time:"--:--:--",date:""});
  const [copied,setCopied]=useState(false);

  useEffect(()=>{
    const link=document.createElement("link");link.rel="stylesheet";link.href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap";document.head.appendChild(link);
    const style=document.createElement("style");style.textContent="*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif!important;background:#020812;color:#EEF5FF}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#06101E}::-webkit-scrollbar-thumb{background:#304060;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#3D5478}select option{background:#102040;color:#EEF5FF}input[type=number]::-webkit-inner-spin-button{opacity:.3}";document.head.appendChild(style);
  },[]);

  useEffect(()=>{DB.get().then(d=>{if(d){setAccounts(d.accounts||[]);setTrades(d.trades||[]);setSelId(d.selId||null);setRulesMap(d.rulesMap||{});}setLoading(false);});},[]);
  useEffect(()=>{if(!loading)DB.set({accounts,trades,selId,rulesMap});},[accounts,trades,selId,rulesMap,loading]);

  useEffect(()=>{
    const tick=()=>{const now=new Date(),utc5ms=now.getTime()-5*3600000,u=new Date(utc5ms);const h=String(u.getUTCHours()).padStart(2,"0"),mn=String(u.getUTCMinutes()).padStart(2,"0"),s=String(u.getUTCSeconds()).padStart(2,"0");const months=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];setClock({time:`${h}:${mn}:${s}`,date:`${u.getUTCDate()} ${months[u.getUTCMonth()]} ${u.getUTCFullYear()}`});};
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[]);

  const selAcc=accounts.find(a=>a.id===selId);
  const selTrades=trades.filter(t=>t.accountId===selId);
  const depSum=(selAcc?.deposits||[]).reduce((s,d)=>s+d.amount,0);
  const base=selAcc?selAcc.initialBalance+depSum:0;
  const m=useMemo(()=>selTrades.length&&selAcc?calcM(selTrades,base):null,[selTrades,selAcc,base]);
  const curBal=base+(m?.totPnl||0);
  const rules=selId?rulesMap[selId]:null;

  const saveAcc=form=>{
    if(editAcc){setAccounts(prev=>prev.map(a=>a.id===editAcc.id?{...editAcc,...form,id:editAcc.id}:a));setEditAcc(null);}
    else{const na={...form,id:uid(),deposits:form.deposits||[],created:tday()};setAccounts(prev=>[...prev,na]);if(!selId)setSelId(na.id);}
    setAddAcc(false);
  };
  const delAcc=id=>{
    setAccounts(prev=>{const r=prev.filter(a=>a.id!==id);if(selId===id)setSelId(r[0]?.id||null);return r;});
    setTrades(prev=>prev.filter(t=>t.accountId!==id));setDelAccId(null);
  };
  const saveRules=r=>{setRulesMap(p=>({...p,[selId]:r}));};

  const copyIA=()=>{
    if(!m||!selAcc)return;
    const lines=[
      `=== REPORTE DE TRADING — TradeLog Pro ===`,
      `Cuenta: ${selAcc.name} (${selAcc.broker||"—"}) | Tipo: ${selAcc.type}`,
      `Fecha del reporte: ${tday()}`,``,
      `--- CAPITAL ---`,
      `Balance inicial: ${fm(base,false)}`,
      `P&L total: ${fm(m.totPnl)}`,
      `Balance actual: ${fm(curBal,false)}`,
      `Rendimiento: ${fp((m.totPnl/base)*100)}`,``,
      `--- MÉTRICAS CLAVE ---`,
      `Operaciones totales: ${m.total} (${m.tp} TP | ${m.sl} SL | ${m.be} BE)`,
      `Win Rate: ${m.wr.toFixed(1)}%`,
      `Profit Factor: ${m.pf.toFixed(2)}`,
      `Expectativa por trade: ${fm(m.exp)}`,
      `Ganancia media: ${fm(m.avgW)}`,
      `Pérdida media: ${fm(m.avgL)}`,
      `Ratio R:R: ${m.rr.toFixed(2)}x`,
      `Max Drawdown: ${fm(m.dd)} (${m.ddPct.toFixed(1)}%)`,
      `Racha ganadora máx: ${m.mws} ops`,
      `Racha perdedora máx: ${m.mls} ops`,
      `Buy Win Rate: ${m.bwr.toFixed(1)}% | Sell Win Rate: ${m.swr.toFixed(1)}%`,``,
      `--- RENDIMIENTO POR DÍA ---`,
      ...[1,2,3,4,5,6,0].filter(d=>m.dayM[d]).map(d=>`${DAYS[d]}: ${m.dayM[d].n} ops | ${(m.dayM[d].w/m.dayM[d].n*100).toFixed(0)}% WR | ${fm(m.dayM[d].pnl)}`),``,
      `--- TOP ACTIVOS ---`,
      ...Object.entries(m.symM).sort((a,b)=>b[1].pnl-a[1].pnl).slice(0,6).map(([s,v])=>`${s}: ${v.n} ops | ${(v.w/v.n*100).toFixed(0)}% WR | ${fm(v.pnl)}`),``,
      `--- POR SESIÓN ---`,
      ...Object.entries(m.sesM).map(([s,v])=>`${s}: ${v.n} ops | ${(v.w/v.n*100).toFixed(0)}% WR | ${fm(v.pnl)}`),``,
      `--- POR ESTRATEGIA ---`,
      ...Object.entries(m.strM).map(([s,v])=>`${s}: ${v.n} ops | ${(v.w/v.n*100).toFixed(0)}% WR | ${fm(v.pnl)}`),``,
      `=== FIN DEL REPORTE ===`,
      `Analiza estos datos y dame recomendaciones específicas para mejorar mi trading.`,
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),3000);});
  };

  const exportCSV=()=>{
    const heads=["Fecha","Hora","Símbolo","Dirección","Sesión","Timeframe","Estrategia","Entrada","Salida","RR","P&L","Comisión","Resultado","URL1","URL2","URL3","Notas"];
    const rows=selTrades.map(t=>[t.date,t.time,t.symbol,t.direction,t.session,t.timeframe,t.strategy,t.entry,t.exit,t.rr,t.pnl,t.commission,t.result,t.url1||"",t.url2||"",t.url3||"",`"${(t.notes||"").replace(/"/g,"''")}"`]);
    const csv=[heads,...rows].map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`${selAcc?.name||"trades"}-${tday()}.csv`;a.click();
  };

  const PAGES={dashboard:"Dashboard",operaciones:"Operaciones",estadisticas:"Estadísticas",analisis:"Análisis Avanzado",calculadora:"Calculadora de Posición",reglas:"Reglas de Cuenta"};

  if(loading)return(
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,flexDirection:"column",gap:16}}>
      <div style={{width:48,height:48,background:"linear-gradient(135deg,#FF6B35,#FF9535)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff",boxShadow:"0 8px 24px rgba(255,107,53,.4)"}}>TL</div>
      <div style={{display:"flex",alignItems:"center",gap:10,color:T.text,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{width:20,height:20,border:`2px solid ${T.orange}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
        Cargando TradeLog Pro...
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",height:"100vh",background:T.bg,color:T.white,fontFamily:"'DM Sans',sans-serif",overflow:"hidden"}}>
      <Sidebar accounts={accounts} selId={selId} onSelect={setSelId} onAdd={()=>setAddAcc(true)} onEdit={a=>setEditAcc(a)} onDelete={id=>setDelAccId(id)} page={page} onPage={setPage} clock={clock}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <div style={{padding:"10px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.s1}}>
          <div>
            <h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.white,fontFamily:"'DM Sans',sans-serif"}}>{PAGES[page]}</h2>
            {selAcc&&<div style={{fontSize:10,color:T.muted,marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>{selAcc.name}<span style={{color:T.text,fontFamily:"'JetBrains Mono',monospace",marginLeft:8}}>{fm(curBal,false)}</span>{depSum>0&&<span style={{color:T.muted,marginLeft:6,fontSize:9}}>· incl. {fm(depSum)} en depósitos</span>}</div>}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {selTrades.length>0&&<Btn variant="ghost" size="sm" onClick={exportCSV}>↓ CSV</Btn>}
            {copied&&<span style={{fontSize:11,color:T.green,fontWeight:700}}>✓ ¡Copiado!</span>}
            <div style={{display:"flex",alignItems:"center",gap:6,background:T.s3,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:9}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:T.green,boxShadow:`0 0 6px ${T.green}`,animation:"pulse 2s ease-in-out infinite"}}/>
              <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}"}</style>
              <span style={{color:T.text,fontWeight:700,letterSpacing:.8,fontFamily:"'DM Sans',sans-serif"}}>EN VIVO</span>
            </div>
          </div>
        </div>
        <div style={{flex:1,overflow:"hidden"}}>
          {page==="dashboard"&&<Dashboard account={selAcc} trades={selTrades} m={m} rules={rules}/>}
          {page==="operaciones"&&<Operaciones trades={selTrades} accountId={selId} onAdd={t=>setTrades(p=>[...p,t])} onEdit={t=>setTrades(p=>p.map(x=>x.id===t.id?t:x))} onDelete={id=>setTrades(p=>p.filter(t=>t.id!==id))}/>}
          {page==="estadisticas"&&<Estadisticas account={selAcc} trades={selTrades} m={m}/>}
          {page==="analisis"&&<Analisis trades={selTrades} m={m} account={selAcc} onCopyIA={copyIA}/>}
          {page==="calculadora"&&<Calculadora/>}
          {page==="reglas"&&<Reglas account={selAcc} rules={rules} onSave={saveRules}/>}
        </div>
      </div>
      {addAcc&&<AccountModal onSave={saveAcc} onClose={()=>setAddAcc(false)}/>}
      {editAcc&&<AccountModal account={editAcc} onSave={saveAcc} onClose={()=>setEditAcc(null)}/>}
      {delAccId&&(
        <Moda title="Eliminar cuenta" onClose={()=>setDelAccId(null)} w={380}>
          <div style={{background:T.reL,border:`1px solid ${T.red}44`,borderRadius:10,padding:14,marginBottom:18}}>
            <p style={{margin:0,color:T.red,fontSize:13,lineHeight:1.6}}>⚠️ Esta acción eliminará la cuenta y <strong>todas sus operaciones</strong>. Es irreversible.</p>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <Btn variant="ghost" onClick={()=>setDelAccId(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={()=>delAcc(delAccId)}>Sí, eliminar cuenta</Btn>
          </div>
        </Moda>
      )}
    </div>
  );
}
