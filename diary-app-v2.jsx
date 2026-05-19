import React, { useState, useRef, useEffect, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDI2rlZvBRIytsrziXxxI3hsHtlft-xots",
  authDomain: "ascent-d0cfc.firebaseapp.com",
  projectId: "ascent-d0cfc",
  storageBucket: "ascent-d0cfc.firebasestorage.app",
  messagingSenderId: "332210861831",
  appId: "1:332210861831:web:c0c9b2f3f272b9732e77a2"
};

const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

/* ═══════════════════════════════════════════════════════
   유틸
═══════════════════════════════════════════════════════ */
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay    = (y, m) => new Date(y, m, 1).getDay();
const dateKey = (y, m, d) =>
  `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

const WEEKDAYS = ["일","월","화","수","목","금","토"];
const MONTHS   = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DEFAULT_FIXED = ["🏃 운동","📚 독서","💧 물 마시기","🧘 명상"];
const TABS = ["📅 일정","✅ 체크리스트","📝 기록"];

const EVENT_COLORS = [
  { bg:"#deeeff", border:"#4a90c8", text:"#1a4a70" },
  { bg:"#d8f0ff", border:"#3a80b8", text:"#1a3a60" },
  { bg:"#e0f4ff", border:"#5098d0", text:"#1a5080" },
  { bg:"#cce8ff", border:"#2878b8", text:"#103060" },
  { bg:"#d4ecff", border:"#4488c0", text:"#1a4070" },
  { bg:"#fde8f5", border:"#e8a0cc", text:"#8b2a60" },
];

/* ═══════════════════════════════════════════════════════
   테마 (심플 화이트)
═══════════════════════════════════════════════════════ */
const SEASONS = {
  spring: {
    name:"봄", emoji:"🌸",
    pageBg:"#f7f7f7", bookBg:"#ffffff", binding:"linear-gradient(180deg,#e0e0e0,#c8c8c8,#e0e0e0)",
    headerBg:"#ffffff", accent:"#1a1a1a", accentRgb:"26,26,26",
    accentSoft:"#f5f5f5", accentMid:"#e8e8e8",
    cellBg:"#ffffff", border:"#e8e8e8", borderLight:"#f0f0f0",
    dateSel:"#1a1a1a", dateToday:"#f0f0f0",
    tabActive:"#1a1a1a", tabBg:"#1a1a1a",
    noteLines:"#f0f0f0", todoFixed:"#fafafa", todoDone:"#f5f5f5",
    deco:[""], pattern:"",
  },
  summer: {
    name:"여름", emoji:"☀️",
    pageBg:"#f7f7f7", bookBg:"#ffffff", binding:"linear-gradient(180deg,#e0e0e0,#c8c8c8,#e0e0e0)",
    headerBg:"#ffffff", accent:"#1a1a1a", accentRgb:"26,26,26",
    accentSoft:"#f5f5f5", accentMid:"#e8e8e8",
    cellBg:"#ffffff", border:"#e8e8e8", borderLight:"#f0f0f0",
    dateSel:"#1a1a1a", dateToday:"#f0f0f0",
    tabActive:"#1a1a1a", tabBg:"#1a1a1a",
    noteLines:"#f0f0f0", todoFixed:"#fafafa", todoDone:"#f5f5f5",
    deco:[""], pattern:"",
  },
  autumn: {
    name:"가을", emoji:"🍂",
    pageBg:"#f7f7f7", bookBg:"#ffffff", binding:"linear-gradient(180deg,#e0e0e0,#c8c8c8,#e0e0e0)",
    headerBg:"#ffffff", accent:"#1a1a1a", accentRgb:"26,26,26",
    accentSoft:"#f5f5f5", accentMid:"#e8e8e8",
    cellBg:"#ffffff", border:"#e8e8e8", borderLight:"#f0f0f0",
    dateSel:"#1a1a1a", dateToday:"#f0f0f0",
    tabActive:"#1a1a1a", tabBg:"#1a1a1a",
    noteLines:"#f0f0f0", todoFixed:"#fafafa", todoDone:"#f5f5f5",
    deco:[""], pattern:"",
  },
  winter: {
    name:"겨울", emoji:"❄️",
    pageBg:"#f7f7f7", bookBg:"#ffffff", binding:"linear-gradient(180deg,#e0e0e0,#c8c8c8,#e0e0e0)",
    headerBg:"#ffffff", accent:"#1a1a1a", accentRgb:"26,26,26",
    accentSoft:"#f5f5f5", accentMid:"#e8e8e8",
    cellBg:"#ffffff", border:"#e8e8e8", borderLight:"#f0f0f0",
    dateSel:"#1a1a1a", dateToday:"#f0f0f0",
    tabActive:"#1a1a1a", tabBg:"#1a1a1a",
    noteLines:"#f0f0f0", todoFixed:"#fafafa", todoDone:"#f5f5f5",
    deco:[""], pattern:"",
  },
};

/* ═══════════════════════════════════════════════════════
   유틸
═══════════════════════════════════════════════════════ */



function getSeason(month) {
  if (month >= 2 && month <= 4) return SEASONS.spring;
  if (month >= 5 && month <= 7) return SEASONS.summer;
  if (month >= 8 && month <= 10) return SEASONS.autumn;
  return SEASONS.winter;
}

/* ═══════════════════════════════════════════════════════
   알람
═══════════════════════════════════════════════════════ */
const notifSupported = typeof window !== "undefined" && "Notification" in window;
const getNotifPerm   = () => notifSupported ? Notification.permission : "denied";

function playAlarmSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [523,659,784,659,784].forEach((freq,i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      const t = ctx.currentTime + i*0.18;
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(0.4,t+0.05);
      gain.gain.linearRampToValueAtTime(0,t+0.16);
      osc.start(t); osc.stop(t+0.18);
    });
  } catch(e) {}
}
function sendBrowserNotif(title,body) {
  try { if (notifSupported && Notification.permission==="granted") new Notification(title,{body}); } catch(e) {}
}

/* ═══════════════════════════════════════════════════════
   공통 컴포넌트
═══════════════════════════════════════════════════════ */
function ScrollCell({ children, style={}, th }) {
  const ref = useRef(null);
  const scroll = dir => ref.current?.scrollBy({top:dir*80,behavior:"smooth"});
  return (
    <div style={{display:"flex",flexDirection:"column",overflow:"hidden",...style}}>
      <button onClick={()=>scroll(-1)} style={{width:"100%",background:th.accentSoft,border:"none",borderBottom:`1px solid ${th.border}`,cursor:"pointer",color:th.accent,fontSize:10,padding:"5px 0",flexShrink:0}}>▲</button>
      <div ref={ref} style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>{children}</div>
      <button onClick={()=>scroll(1)}  style={{width:"100%",background:th.accentSoft,border:"none",borderTop:`1px solid ${th.border}`,cursor:"pointer",color:th.accent,fontSize:10,padding:"5px 0",flexShrink:0}}>▼</button>
    </div>
  );
}

function AlarmToast({ alarms, onDismiss }) {
  if (!alarms.length) return null;
  return (
    <div style={{position:"fixed",top:16,right:16,zIndex:999,display:"flex",flexDirection:"column",gap:8}}>
      {alarms.map(a => (
        <div key={a.id} style={{background:"#ffffff",border:"1px solid rgba(0,0,0,0.08)",borderRadius:16,padding:"14px 16px",boxShadow:"0 8px 32px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.06)",minWidth:260,maxWidth:320,animation:"slideIn .3s cubic-bezier(.4,0,.2,1)",borderLeft:`4px solid ${a.color||"#c9a96e"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:"bold",color:"#4a3728",marginBottom:3}}>{a.icon} {a.title}</div>
              <div style={{fontSize:11,color:"#9b8b7a"}}>{a.body}</div>
            </div>
            <button onClick={()=>onDismiss(a.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#c0a090",fontSize:18,padding:0,lineHeight:1,flexShrink:0}}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   셀 컨텐츠
═══════════════════════════════════════════════════════ */

function CalendarContent({ th, currentYear, currentMonth, selectedDay, today, data, firstDay, daysInMonth, onPrevMonth, onNextMonth, onSelectDay, onAddEvent, dayData, removeEvent, openEditEvent, updateDayDone }) {
  const [snap, setSnap] = useState(0); // 0=월간 1=월간축소+일정 2=주간+일정크게
  const touchStartY = useRef(0);

  const onTouchStart = e => { touchStartY.current = e.touches[0].clientY; };
  const onTouchEnd = e => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (dy > 30) setSnap(s => Math.min(s+1, 1));
    if (dy < -30) setSnap(s => Math.max(s-1, 0));
  };

  // 선택된 날이 속한 주 날짜들
  const selDow = (firstDay + selectedDay - 1) % 7;
  const weekStart = selectedDay - selDow;
  const weekDays = Array(7).fill(null).map((_,i) => weekStart + i);

  const cellH = snap===0 ? 68 : 56;

  const renderCell = (day, isWeekView=false) => {
    const valid = day >= 1 && day <= daysInMonth;
    if (!valid) return <div style={{height:cellH}}/>;
    const dk = dateKey(currentYear,currentMonth,day);
    const dd = data[dk];
    const isToday = day===today.getDate()&&currentMonth===today.getMonth()&&currentYear===today.getFullYear();
    const isSel = day===selectedDay;
    const events = [...(dd?.events||[])].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"));
    const dw = (firstDay+day-1)%7;
    return (
      <div onClick={()=>onSelectDay(day)} style={{
        height:cellH, cursor:"pointer",
        background:isSel?"#f5f5f5":"transparent",
        transition:"all .3s",
        overflow:"hidden", display:"flex", flexDirection:"column",
        alignItems:"center", paddingTop:3, minWidth:0,
      }}>
        <div style={{
          width:22,height:22,borderRadius:6,flexShrink:0,marginBottom:1,
          display:"flex",alignItems:"center",justifyContent:"center",
          border:isSel?"2px solid #1a1a1a":isToday?"2px solid #c0c0c0":"2px solid transparent",
          fontSize:13,fontWeight:isSel||isToday?700:400,fontFamily:"'DM Sans','Noto Sans KR',sans-serif",
          color:isSel?"#1a1a1a":isToday?"#aaaaaa":dw===0?"#e05060":dw===6?"#3a7abf":"#1a1a1a",
        }}>{day}</div>
        {/* snap0: 일정 텍스트 / snap1,2: 바 또는 숫자 */}
        {snap===0 && (
          <div style={{width:"100%",padding:"0 2px",display:"flex",flexDirection:"column",gap:1,overflow:"hidden",maxHeight:cellH-26,maxWidth:"100%"}}>
            {events.slice(0,2).map((ev,i)=>{
              const c=EVENT_COLORS[ev.color]||EVENT_COLORS[0];
              const isDone=(dd?.eventDone||{})[i];
              return <div key={i} style={{fontSize:9,lineHeight:"13px",padding:"0 3px",borderRadius:2,background:c.bg,borderLeft:`2px solid ${c.border}`,color:c.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600,pointerEvents:"none",opacity:isDone?0.45:1}}>
                {isDone?"✓ ":""}{ev.text.length>3?<>{ev.text.slice(0,3)}<span style={{verticalAlign:"middle",fontSize:8,letterSpacing:1}}>··</span></>:ev.text}
              </div>;
            })}
            {events.length>2&&<div style={{fontSize:7,color:th.accent,opacity:0.4,textAlign:"center"}}>+{events.length-2}</div>}
          </div>
        )}
        {snap>=1 && events.length>0 && (
          <div style={{fontSize:10,color:"#1a1a1a",fontWeight:700,lineHeight:"14px",textAlign:"center"}}>
            일정 {events.length}
          </div>
        )}
      </div>
    );
  };

  const evTotal=(dayData.events||[]).length;
  const evDone=Object.values(dayData.eventDone||{}).filter(Boolean).length;
  const evPct=evTotal?Math.round(evDone/evTotal*100):0;

  const EventList = () => (
    <div style={{flex:1,overflowY:"auto",scrollbarWidth:"none"}}>
      {/* 날짜 헤더 */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"14px 16px 10px",
        borderBottom:`1px solid ${th.borderLight}`,
        position:"sticky",top:0,background:th.bookBg,zIndex:1,
      }}>
        <div>
          <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:snap===1&&evTotal>0?6:0}}>
            <span style={{fontSize:snap===1?30:22,fontWeight:700,color:th.accent,lineHeight:1,transition:"font-size .3s"}}>{selectedDay}</span>
            <span style={{fontSize:12,color:th.accent,opacity:0.4}}>{WEEKDAYS[(firstDay+selectedDay-1)%7]}요일</span>
          </div>
          {snap===1&&evTotal>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:100,height:5,background:th.borderLight,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${evPct}%`,background:"#1a1a1a",borderRadius:99,transition:"width .4s"}}/>
              </div>
              <span style={{fontSize:11,color:th.accent,opacity:0.5}}>{evDone}/{evTotal} 완료</span>
            </div>
          )}
        </div>
        <button onClick={onAddEvent} style={{background:th.accent,color:"#fff",border:"none",borderRadius:20,padding:snap===1?"9px 22px":"7px 16px",cursor:"pointer",fontSize:snap===1?14:12,fontWeight:600,boxShadow:`0 3px 12px rgba(${th.accentRgb},0.3)`,transition:"all .3s"}}>+ 일정</button>
      </div>
      {/* 일정 목록 */}
      <div style={{padding:"0 16px 32px"}}>
        {!(dayData.events||[]).length
          ? <div style={{fontSize:13,color:th.accent,opacity:0.3,textAlign:"center",padding:"24px 0"}}>일정이 없어요</div>
          : [...(dayData.events||[])].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")).map((ev,idx)=>{
              const c=EVENT_COLORS[ev.color]||EVENT_COLORS[0];
              return (
                <div key={idx} style={{
                  display:"flex",alignItems:"flex-start",gap:12,
                  padding:snap===1?"16px 0":"12px 0",
                  borderBottom:`1px solid ${th.borderLight}`,
                  transition:"all .2s",
                  opacity:(dayData.eventDone||{})[idx]?0.45:1,
                }}>
                  {snap===1&&(
                    <div
                      onPointerDown={e=>{e.stopPropagation();e.preventDefault();updateDayDone(idx);}}
                      style={{
                        width:22,height:22,borderRadius:6,flexShrink:0,marginTop:2,cursor:"pointer",
                        border:`2px solid ${(dayData.eventDone||{})[idx]?"#1a1a1a":th.border}`,
                        background:(dayData.eventDone||{})[idx]?"#1a1a1a":"transparent",
                        display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",
                        touchAction:"manipulation",WebkitTapHighlightColor:"transparent",
                        userSelect:"none",
                      }}
                    >
                      {(dayData.eventDone||{})[idx]&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
                    </div>
                  )}
                  <div onClick={()=>openEditEvent(idx)} style={{flex:1,display:"flex",gap:14,cursor:"pointer",minWidth:0}}>
                    <div style={{width:44,flexShrink:0,textAlign:"right",paddingTop:2}}>
                      <span style={{fontSize:snap===1?14:12,fontWeight:600,color:th.accent,opacity:0.5}}>{ev.time||"종일"}</span>
                    </div>
                    <div style={{width:snap===1?4:3,minHeight:20,borderRadius:2,background:c.border,flexShrink:0,alignSelf:"stretch"}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:snap===1?17:14,fontWeight:600,color:th.accent,marginBottom:2,textDecoration:(dayData.eventDone||{})[idx]?"line-through":"none"}}>{ev.text}</div>
                      {ev.place&&<div style={{fontSize:snap===1?13:11,color:th.accent,opacity:0.5,marginBottom:1}}>📍 {ev.place}</div>}
                      {ev.note&&<div style={{fontSize:snap===1?13:11,color:th.accent,opacity:0.45,lineHeight:1.5}}>{ev.note}</div>}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();removeEvent(idx);}} style={{
                    background:"#fff0f0",border:"none",cursor:"pointer",
                    color:"#d04040",fontSize:13,padding:"3px 7px",
                    borderRadius:6,fontWeight:600,flexShrink:0,
                    touchAction:"manipulation",
                  }}>삭제</button>
                </div>
              );
            })
        }
      </div>
    </div>
  );

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      style={{display:"flex",flexDirection:"column",height:"100%",background:th.bookBg,overflow:"hidden"}}>

      {/* 월 헤더 */}
      <div style={{flexShrink:0,padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <button onClick={onPrevMonth} style={{background:"none",border:"none",cursor:"pointer",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",color:th.accent,fontSize:22,opacity:0.5}}>‹</button>
        <div style={{fontSize:snap===2?18:26,fontWeight:700,color:th.accent,letterSpacing:"-1px",transition:"font-size .3s",fontFamily:"'Noto Sans KR',sans-serif"}}>{MONTHS[currentMonth]}</div>
        <button onClick={onNextMonth} style={{background:"none",border:"none",cursor:"pointer",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",color:th.accent,fontSize:22,opacity:0.5}}>›</button>
      </div>

      {/* 요일 헤더 - 항상 표시 */}
      <div style={{flexShrink:0,display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderTop:`1px solid ${th.borderLight}`}}>
        {WEEKDAYS.map((d,i)=>(
          <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,padding:"4px 0",color:i===0?"#e05060":i===6?"#3a7abf":th.accent,opacity:0.5,borderBottom:`1px solid ${th.borderLight}`}}>{d}</div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div style={{flexShrink:0,display:"grid",gridTemplateColumns:"repeat(7,1fr)",transition:"all .3s"}}>
        {snap < 1
          ? /* snap 0,1: 월간 */ <>
              {Array(firstDay).fill(null).map((_,i)=>(
                <div key={`e${i}`} style={{height:cellH,borderBottom:`1px solid ${th.borderLight}`}}/>
              ))}
              {Array(daysInMonth).fill(null).map((_,i)=>(
                <div key={i} style={{borderBottom:`1px solid ${th.borderLight}`}}>
                  {renderCell(i+1)}
                </div>
              ))}
            </>
          : /* snap 1: 주간만 */
            weekDays.map((day,i)=>(
              <div key={i} style={{borderBottom:`1px solid ${th.borderLight}`}}>
                {renderCell(day, true)}
              </div>
            ))
        }
      </div>

      {/* 스냅 핸들 */}
      <div onClick={()=>setSnap(s=>s<2?s+1:0)} style={{flexShrink:0,display:"flex",justifyContent:"center",alignItems:"center",gap:4,padding:"5px 0",cursor:"pointer"}}>
        {[0,1].map(i=>(
          <div key={i} style={{width:snap===i?16:5,height:4,borderRadius:99,background:snap===i?th.accent:th.border,opacity:snap===i?1:0.4,transition:"all .3s"}}/>
        ))}
      </div>

      {/* 일정 영역 */}
      {snap===0 ? (
        /* snap0: 날짜+추가버튼만 */
        <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontSize:16,fontWeight:700,color:th.accent}}>{selectedDay}</span>
            <span style={{fontSize:11,color:th.accent,opacity:0.4}}>{WEEKDAYS[(firstDay+selectedDay-1)%7]}요일</span>
          </div>
          <button onClick={onAddEvent} style={{background:th.accent,color:"#fff",border:"none",borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:11,fontWeight:600,boxShadow:`0 2px 8px rgba(${th.accentRgb},0.25)`}}>+ 일정</button>
        </div>
      ) : (
        /* snap1,2: 일정 목록 */
        <EventList/>
      )}
    </div>
  );
}

function MonthChart({ currentYear, currentMonth, selectedDay, data, fixedTodos, fixedDays }) {
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
  const getAch = (d) => {
    const dk = `${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dd = data[dk];
    if(!dd) return null;
    const fixed = fixedTodos.filter(item=>(fixedDays[item]||[0,1,2,3,4,5,6]).includes(new Date(currentYear,currentMonth,d).getDay()));
    const fixedDone = fixed.filter(item=>dd.fixedDone?.[item]).length;
    const extraDone = Array.isArray(dd.extraDone)?dd.extraDone.filter(Boolean).length:Object.values(dd.extraDone||{}).filter(Boolean).length;
    const total = fixed.length+(dd.extraTodos||[]).length;
    return total>0?Math.round((fixedDone+extraDone)/total*100):0;
  };

  const H = 36;
  const bars = Array(daysInMonth).fill(null).map((_,i)=>({
    d: i+1,
    val: i+1<=selectedDay ? getAch(i+1) : null,
  }));

  return (
    <div style={{display:"flex",alignItems:"flex-end",height:H,gap:1.5}}>
      {bars.map(({d,val})=>{
        if(val===null) return (
          <div key={d} style={{flex:1,height:2,borderRadius:99,background:"#e8e8e8"}}/>
        );
        const barH = Math.max(Math.round(val/100*H), 2);
        const color = val>=50 ? "#e05060" : "#4a90c8";
        const isToday = d===selectedDay;
        return (
          <div key={d} style={{
            flex:1,
            height:barH,
            borderRadius:2,
            background:color,
            opacity: 1,
            boxShadow: isToday?`0 0 4px ${color}55`:"none",
            transition:"height .3s",
          }}/>
        );
      })}
    </div>
  );
}


function TodoContent({ th, currentMonth, currentYear, selectedDay, selectedDayOfWeek, dayData, data, fixedTodos, fixedAlarms, fixedDays, editingFixed, achColor, achievement, doneTodos, allTodos, onToggleFixed, onToggleExtra, onAddFixed, onRemoveFixed, onRenameFixed, onAddExtra, onRemoveExtra, onSetEditingFixed, onSetFixedAlarm, onSetExtraAlarm, onSetFixedDays, newFixed, setNewFixed, newExtra, setNewExtra }) {
  const iStyle = {
    flex:1, padding:"9px 12px", fontSize:13,
    border:`1px solid ${th.border}`, borderRadius:10,
    background:th.bookBg, fontFamily:"inherit",
    color:th.accent, outline:"none",
    boxShadow:"inset 0 1px 3px rgba(0,0,0,0.04)",
  };
  const bStyle = {
    padding:"9px 16px", background:th.accent, color:"#fff",
    border:"none", borderRadius:10, cursor:"pointer", fontSize:18, fontWeight:300,
    boxShadow:`0 4px 12px rgba(${th.accentRgb},0.3)`,
  };

  return (
    <div style={{padding:"24px 20px",background:th.bookBg,minHeight:"100%"}}>

      {/* 헤더 */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:th.accent,letterSpacing:"0.15em",opacity:0.5,marginBottom:4,fontWeight:500}}>CHECKLIST</div>
        <div style={{fontSize:22,fontWeight:700,color:th.accent,letterSpacing:"-0.3px"}}>{currentMonth+1}월 {selectedDay}일</div>
      </div>

      {/* 달성도 카드 */}
      <div style={{
        background:th.headerBg, borderRadius:16, padding:"16px",
        border:`1px solid ${th.borderLight}`,
        boxShadow:`0 2px 12px rgba(${th.accentRgb},0.06)`,
        marginBottom:20,
      }}>
        <div style={{display:"flex",gap:12,alignItems:"stretch"}}>
          {/* 오늘의 달성도 - 반 너비 */}
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:8}}>
              <span style={{fontSize:11,color:th.accent,opacity:0.6,fontWeight:500}}>오늘</span>
              <span style={{fontSize:22,fontWeight:700,color:achColor,lineHeight:1}}>{achievement}<span style={{fontSize:12}}>%</span></span>
            </div>
            <div style={{height:5,background:th.borderLight,borderRadius:99,overflow:"hidden",marginBottom:4}}>
              <div style={{height:"100%",width:`${achievement}%`,background:achColor,borderRadius:99,transition:"width .5s cubic-bezier(.4,0,.2,1)"}}/>
            </div>
            <div style={{fontSize:10,color:th.accent,opacity:0.4,textAlign:"right"}}>{doneTodos}/{allTodos}</div>
          </div>

          {/* 구분선 */}
          <div style={{width:1,background:th.borderLight,flexShrink:0}}/>

          {/* 이달 달성도 차트 - MonthChart 컴포넌트로 분리 */}
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:th.accent,opacity:0.6,fontWeight:500,marginBottom:8}}>이번 달</div>
            <MonthChart currentYear={currentYear} currentMonth={currentMonth} selectedDay={selectedDay} data={data} fixedTodos={fixedTodos} fixedDays={fixedDays} achColor={achColor}/>
          </div>
        </div>
      </div>

      {/* 고정 항목 */}
      <div style={{fontSize:10,color:th.accent,marginBottom:10,letterSpacing:"0.12em",opacity:0.4,fontWeight:600}}>📌 고정 항목</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {fixedTodos.map((item,idx)=>{
          const days=fixedDays[item]||[0,1,2,3,4,5,6];
          const isActiveToday=days.includes(selectedDayOfWeek);
          const isDone=!!dayData.fixedDone[item];
          return (
            <div key={idx} style={{
              borderRadius:14,overflow:"hidden",
              background:th.headerBg,
              border:`1px solid ${th.borderLight}`,
              boxShadow:`0 1px 6px rgba(${th.accentRgb},0.05)`,
              opacity:isActiveToday?1:0.4,
              transition:"opacity .2s",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:isDone?th.todoDone:th.headerBg,transition:"background .2s"}}>
                {/* 커스텀 체크박스 */}
                <div onPointerDown={e=>{e.preventDefault();isActiveToday&&onToggleFixed(item);}} style={{
                  width:20,height:20,borderRadius:6,flexShrink:0,cursor:isActiveToday?"pointer":"not-allowed",
                  border:`2px solid ${isDone?th.accent:th.border}`,
                  background:isDone?th.accent:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all .2s",
                }}>
                  {isDone&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
                </div>
                {editingFixed===idx
                  ? <input autoFocus defaultValue={item}
                      onBlur={e=>onRenameFixed(idx,e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter")e.target.blur();if(e.key==="Escape")onSetEditingFixed(null);}}
                      style={{flex:1,fontSize:13,border:"none",background:"transparent",fontFamily:"inherit",color:th.accent,outline:`1px solid ${th.border}`,borderRadius:4,padding:"0 4px"}}/>
                  : <span onDoubleClick={()=>onSetEditingFixed(idx)} style={{
                      flex:1,fontSize:13,color:th.accent,cursor:"text",fontWeight:isDone?400:500,
                      textDecoration:isDone?"line-through":"none",opacity:isDone?0.4:1,transition:"all .2s",
                    }}>{item}</span>
                }
                {fixedAlarms[item]&&isActiveToday&&<span style={{fontSize:10,opacity:0.4}}>🔔</span>}
                <button onClick={()=>onRemoveFixed(idx)} style={{
                  background:"#fff0f0",border:"none",cursor:"pointer",
                  color:"#d04040",fontSize:13,padding:"3px 7px",
                  lineHeight:1,borderRadius:6,fontWeight:600,
                  touchAction:"manipulation",
                }}>삭제</button>
              </div>
              {/* 요일 + 알람 행 */}
              <div style={{display:"flex",alignItems:"center",padding:"7px 14px",background:th.accentSoft,borderTop:`1px solid ${th.borderLight}`,gap:4,flexWrap:"wrap"}}>
                {["일","월","화","수","목","금","토"].map((d,di)=>{
                  const active=days.includes(di);
                  return (
                    <button key={di} onPointerDown={e=>{
                      e.preventDefault();
                      const next=active?days.filter(x=>x!==di):[...days,di].sort();
                      onSetFixedDays(item,next.length===7?[0,1,2,3,4,5,6]:next);
                    }} style={{
                      width:22,height:22,borderRadius:6,border:"none",cursor:"pointer",
                      fontSize:9,fontFamily:"inherit",fontWeight:active?700:400,
                      background:active?th.accent:"transparent",
                      color:active?"#fff":th.accent,
                      border:active?"none":`1px solid ${th.border}`,
                      opacity:active?1:0.45,
                      transition:"all .15s",flexShrink:0,
                    }}>{d}</button>
                  );
                })}
                <div style={{flex:1}}/>
                <span style={{fontSize:9,color:th.accent,opacity:0.4}}>⏰</span>
                <input type="time" value={fixedAlarms[item]||""} onChange={e=>onSetFixedAlarm(item,e.target.value)}
                  style={{fontSize:10,border:`1px solid ${th.border}`,borderRadius:6,padding:"2px 6px",background:th.bookBg,color:th.accent,fontFamily:"inherit",outline:"none"}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:24}}>
        <input value={newFixed} onChange={e=>setNewFixed(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onAddFixed()} placeholder="고정 항목 추가..." style={iStyle}/>
        <button onClick={onAddFixed} style={bStyle}>+</button>
      </div>

      <div style={{borderTop:`1px solid ${th.borderLight}`,marginBottom:20}}/>

      {/* 오늘 추가 */}
      <div style={{fontSize:10,color:th.accent,marginBottom:10,letterSpacing:"0.12em",opacity:0.4,fontWeight:600}}>✏️ 오늘 추가</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {!(dayData.extraTodos||[]).length&&(
          <div style={{fontSize:12,color:th.accent,padding:"12px",opacity:0.3,textAlign:"center"}}>할 일을 추가해보세요</div>
        )}
        {(dayData.extraTodos||[]).map((item,idx)=>(
          <div key={idx} style={{borderRadius:14,overflow:"hidden",background:th.headerBg,border:`1px solid ${th.borderLight}`,boxShadow:`0 1px 6px rgba(${th.accentRgb},0.05)`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:dayData.extraDone[idx]?th.todoDone:th.headerBg,transition:"background .2s"}}>
              <div onPointerDown={e=>{e.preventDefault();onToggleExtra(idx);}} style={{
                width:20,height:20,borderRadius:6,flexShrink:0,cursor:"pointer",
                border:`2px solid ${dayData.extraDone[idx]?th.accent:th.border}`,
                background:dayData.extraDone[idx]?th.accent:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",
              }}>
                {dayData.extraDone[idx]&&<span style={{color:"#fff",fontSize:11,lineHeight:1}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:13,color:th.accent,fontWeight:dayData.extraDone[idx]?400:500,textDecoration:dayData.extraDone[idx]?"line-through":"none",opacity:dayData.extraDone[idx]?0.4:1}}>{item}</span>
              {(dayData.extraAlarms||{})[idx]&&<span style={{fontSize:10,opacity:0.4}}>🔔</span>}
              <button onClick={()=>onRemoveExtra(idx)} style={{background:"none",border:"none",cursor:"pointer",color:th.border,fontSize:16,padding:0,lineHeight:1,opacity:0.5}}>×</button>
            </div>
            <div style={{display:"flex",alignItems:"center",padding:"7px 14px",background:th.accentSoft,borderTop:`1px solid ${th.borderLight}`,gap:4}}>
              <span style={{fontSize:9,color:th.accent,opacity:0.4}}>⏰ 10분 전 알람</span>
              <input type="time" value={(dayData.extraAlarms||{})[idx]||""} onChange={e=>onSetExtraAlarm(idx,e.target.value)}
                style={{fontSize:10,border:`1px solid ${th.border}`,borderRadius:6,padding:"2px 6px",background:th.bookBg,color:th.accent,fontFamily:"inherit",outline:"none",marginLeft:"auto"}}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <input value={newExtra} onChange={e=>setNewExtra(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onAddExtra()} placeholder="오늘 할 일 추가..." style={iStyle}/>
        <button onClick={onAddExtra} style={bStyle}>+</button>
      </div>
    </div>
  );
}

/* ── 펜 색상 팔레트 ── */
const PEN_COLORS  = ["#1a1a1a","#c8506a","#1a7ab0","#2a8a2a","#a04010","#6030a0","#ffffff"];
const MKR_COLORS  = ["#ffe066","#b6f0a0","#a0d8f8","#ffb0d0","#d0b0f8","#ffd0a0"];

function NoteContent({ th, currentYear, currentMonth, selectedDay, note, onNoteChange, drawData, onDrawChange, extMode, undoRef, clearRef }) {
  const [mode,       setMode]       = useState("text");
  const [penColor,   setPenColor]   = useState("#1a1a1a");
  const [mkrColor,   setMkrColor]   = useState("#ffe066");
  const [penSize,    setPenSize]    = useState(3);
  const [mkrSize,    setMkrSize]    = useState(18);
  const [eraserSize, setEraserSize] = useState(24);
  const [showColors, setShowColors] = useState(false);

  const canvasRef  = useRef(null);
  const overlayRef = useRef(null);
  const scrollRef  = useRef(null);
  const innerRef   = useRef(null);
  const drawing    = useRef(false);
  const lastPt     = useRef(null);
  const strokePts  = useRef([]);
  const historyRef = useRef([]);

  useEffect(()=>{ if(extMode) setMode(extMode); },[extMode]);

  // drawData 복원 - 날짜 바뀔 때만 (drawing 중에는 무시)
  const lastDrawData = useRef(drawData);
  useEffect(()=>{
    // drawing 중이면 무시 (undo 후 onDrawChange로 인한 재렌더 방지)
    if(drawing.current) return;
    // 실제로 다른 데이터일 때만 복원
    if(lastDrawData.current === drawData) return;
    lastDrawData.current = drawData;
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    historyRef.current=[];
    if(drawData){
      const img=new Image();
      img.onload=()=>ctx.drawImage(img,0,0);
      img.src=drawData;
    }
  },[drawData]);

  // 캔버스 크기 = innerRef 크기
  useEffect(()=>{
    const cv=canvasRef.current; const ov=overlayRef.current; const inner=innerRef.current;
    if(!cv||!ov||!inner) return;
    const fit=()=>{
      const w=inner.clientWidth; const h=inner.clientHeight;
      cv.width=w; cv.height=h; ov.width=w; ov.height=h;
      if(drawData){
        const img=new Image();
        img.onload=()=>cv.getContext("2d").drawImage(img,0,0);
        img.src=drawData;
      }
    };
    fit();
    const ro=new ResizeObserver(fit); ro.observe(inner);
    return()=>ro.disconnect();
  },[drawData]);

  const getXY=(e)=>{
    const cv=canvasRef.current; if(!cv) return {x:0,y:0};
    const r=cv.getBoundingClientRect();
    const s=e.touches?e.touches[0]:e;
    return {x:Math.max(0,Math.min(s.clientX-r.left,cv.width-1)), y:Math.max(0,Math.min(s.clientY-r.top,cv.height-1))};
  };

  const drawMarkerOverlay=(pts)=>{
    const ov=overlayRef.current; if(!ov||pts.length<2) return;
    const ctx=ov.getContext("2d");
    ctx.clearRect(0,0,ov.width,ov.height);
    ctx.save(); ctx.globalAlpha=0.38; ctx.strokeStyle=mkrColor;
    ctx.lineWidth=mkrSize; ctx.lineCap="square"; ctx.lineJoin="square";
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
    ctx.stroke(); ctx.restore();
  };

  const onDown=(e)=>{
    e.preventDefault();
    const cv=canvasRef.current; if(!cv) return;
    historyRef.current.push(cv.toDataURL());
    if(historyRef.current.length>40) historyRef.current.shift();
    drawing.current=true;
    const pt=getXY(e); lastPt.current=pt;
    if(mode==="marker"){ strokePts.current=[pt]; }
    else if(mode==="eraser"){ cv.getContext("2d").clearRect(pt.x-eraserSize/2,pt.y-eraserSize/2,eraserSize,eraserSize); }
    else {
      const ctx=cv.getContext("2d");
      ctx.save(); ctx.globalAlpha=1; ctx.fillStyle=penColor;
      ctx.beginPath(); ctx.arc(pt.x,pt.y,penSize/2,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
  };

  const onMove=(e)=>{
    if(!drawing.current) return;
    e.preventDefault();
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d");
    const pt=getXY(e); const lp=lastPt.current;
    if(mode==="eraser"){ ctx.clearRect(pt.x-eraserSize/2,pt.y-eraserSize/2,eraserSize,eraserSize); }
    else if(mode==="marker"){ strokePts.current.push(pt); drawMarkerOverlay(strokePts.current); }
    else {
      ctx.save(); ctx.globalAlpha=1; ctx.strokeStyle=penColor;
      ctx.lineWidth=penSize; ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.beginPath(); ctx.moveTo(lp.x,lp.y); ctx.lineTo(pt.x,pt.y); ctx.stroke(); ctx.restore();
    }
    lastPt.current=pt;
  };

  const onUp=(e)=>{
    if(!drawing.current) return;
    drawing.current=false;
    const cv=canvasRef.current; const ov=overlayRef.current; if(!cv) return;
    if(mode==="marker"&&strokePts.current.length>0){
      const ctx=cv.getContext("2d");
      ctx.save(); ctx.globalAlpha=1; ctx.drawImage(ov,0,0); ctx.restore();
      ov.getContext("2d").clearRect(0,0,ov.width,ov.height);
      strokePts.current=[];
    }
    onDrawChange(cv.toDataURL());
  };

  const undo=useCallback(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const prev=historyRef.current.pop(); if(!prev) return;
    const ctx=cv.getContext("2d");
    const img=new Image();
    img.onload=()=>{
      ctx.clearRect(0,0,cv.width,cv.height);
      ctx.drawImage(img,0,0);
      const newData = cv.toDataURL();
      lastDrawData.current = newData; // useEffect가 무시하도록 미리 업데이트
      onDrawChange(newData);
    };
    img.src=prev;
  },[onDrawChange]);

  const clearDraw=useCallback(()=>{
    const cv=canvasRef.current; if(!cv) return;
    historyRef.current.push(cv.toDataURL());
    cv.getContext("2d").clearRect(0,0,cv.width,cv.height);
    onDrawChange(null);
  },[onDrawChange]);

  useEffect(()=>{
    if(undoRef)  undoRef.current=undo;
    if(clearRef) clearRef.current=clearDraw;
  },[undo,clearDraw]);

  const isDrawMode=mode!=="text";

  const mBtn=(m)=>({
    padding:"6px 10px", borderRadius:10, border:"none", cursor:"pointer",
    fontSize:11, fontFamily:"inherit", fontWeight:mode===m?600:400,
    background:mode===m?th.accent:"transparent",
    color:mode===m?"#fff":th.accent,
    transition:"all .2s",
    boxShadow:mode===m?`0 2px 8px rgba(${th.accentRgb},0.3)`:"none",
    touchAction:"manipulation",
  });

  return (
    <div
      style={{display:"flex",flexDirection:"column",height:"100%",background:th.cellBg}}
      onTouchStart={e=>e.stopPropagation()}
      onTouchEnd={e=>e.stopPropagation()}
    >
      {/* 헤더 + 툴바 */}
      <div style={{padding:"14px 16px 0",flexShrink:0}}>
        <div style={{fontSize:11,color:th.accent,opacity:0.4,letterSpacing:"0.15em",marginBottom:3,fontWeight:500}}>NOTES</div>
        <div style={{fontSize:19,fontWeight:700,color:th.accent,marginBottom:10}}>{currentYear}년 {currentMonth+1}월 {selectedDay}일</div>

        <div style={{display:"flex",alignItems:"center",gap:4,padding:"5px",background:th.accentSoft,borderRadius:12,marginBottom:6}}>
          <button onClick={()=>{setMode("text");setShowColors(false);}} style={mBtn("text")}>⌨️</button>
          <button onClick={()=>{setMode("pen");setShowColors(true);}}    style={mBtn("pen")}>🖊</button>
          <button onClick={()=>{setMode("marker");setShowColors(true);}} style={mBtn("marker")}>🖍</button>
          <button onClick={()=>{setMode("eraser");setShowColors(false);}} style={mBtn("eraser")}>🧹</button>
          <div style={{flex:1}}/>
          <button onClick={undo} style={{...mBtn("_"),padding:"5px 10px",opacity:0.8}}>↩</button>
          <button onClick={clearDraw} style={{...mBtn("_"),padding:"5px 10px",color:"#d04040",opacity:0.8}}>🗑</button>
        </div>

        {showColors&&(
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:th.accentSoft,borderRadius:10,border:`1px solid ${th.border}`,marginBottom:6,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:5}}>
              {(mode==="marker"?MKR_COLORS:PEN_COLORS).map(c=>(
                <button key={c} onClick={()=>mode==="marker"?setMkrColor(c):setPenColor(c)} style={{
                  width:20,height:20,borderRadius:"50%",background:c,border:"none",cursor:"pointer",
                  boxShadow:(mode==="marker"?mkrColor:penColor)===c?`0 0 0 2px #fff,0 0 0 4px ${th.accent}`:"0 0 0 1px #ccc",
                }}/>
              ))}
            </div>
            <div style={{width:1,height:20,background:th.border}}/>
            <input type="range" min={mode==="marker"?8:1} max={mode==="marker"?40:12}
              value={mode==="marker"?mkrSize:penSize}
              onChange={e=>mode==="marker"?setMkrSize(+e.target.value):setPenSize(+e.target.value)}
              style={{width:70,accentColor:th.accent}}/>
            <span style={{fontSize:10,color:th.accent}}>{mode==="marker"?mkrSize:penSize}</span>
          </div>
        )}
        {mode==="eraser"&&(
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:th.accentSoft,borderRadius:10,border:`1px solid ${th.border}`,marginBottom:6}}>
            <span style={{fontSize:10,color:th.accent,opacity:0.7}}>지우개 크기</span>
            <input type="range" min={8} max={60} value={eraserSize} onChange={e=>setEraserSize(+e.target.value)} style={{width:80,accentColor:th.accent}}/>
            <span style={{fontSize:10,color:th.accent}}>{eraserSize}</span>
          </div>
        )}
      </div>

      {/* 편집 영역 */}
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",scrollbarWidth:"none",margin:"0 16px 16px",borderRadius:10,border:`1px solid ${th.border}`,touchAction:isDrawMode?"none":"auto"}}>
        {/* innerRef: textarea 높이만큼 늘어남 → 캔버스도 동일 크기 */}
        <div ref={innerRef} style={{position:"relative",touchAction:isDrawMode?"none":"auto"}}>
          {/* 워터마크 */}
          <div style={{position:"absolute",bottom:10,right:10,fontSize:70,opacity:0.04,pointerEvents:"none",userSelect:"none",zIndex:0}}>{th.emoji}</div>
          {/* textarea: static 배치로 높이 자동 늘어남 */}
          <textarea
            value={note||""}
            onChange={e=>onNoteChange(e.target.value)}
            placeholder="오늘의 기록을 남겨보세요..."
            style={{
              display:"block",width:"100%",minHeight:"100vh",
              border:"none",background:"transparent",
              resize:"none",fontFamily:"'Georgia',serif",fontSize:15,
              color:th.accent,lineHeight:"32px",outline:"none",
              padding:"10px 16px 120px",boxSizing:"border-box",
              pointerEvents:isDrawMode?"none":"auto",
              position:"relative",zIndex:1,
            }}
          />
          {/* 캔버스: innerRef와 동일 크기로 오버레이 */}
          <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:2}}/>
          <canvas ref={overlayRef} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:3}}/>
          {isDrawMode&&(
            <div style={{position:"absolute",inset:0,zIndex:4,cursor:mode==="eraser"?"cell":"crosshair",touchAction:"none"}}
              onMouseDown={onDown}
              onTouchStart={onDown}
              onTouchMove={onMove}
              onTouchEnd={onUp}
            />
          )}
        </div>
      </div>

      {mode==="text"&&(
        <div style={{textAlign:"right",fontSize:10,color:th.accent,opacity:0.4,paddingRight:16,paddingBottom:6,flexShrink:0}}>
          {(note||"").length}자
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   메인 앱
═══════════════════════════════════════════════════════ */
/* ── localStorage 헬퍼 ── */
const LS_DATA        = "diary_data_v2";   // drawData 제외한 날짜별 데이터
const LS_FIXED       = "diary_fixed_v1";
const LS_FIXED_ALARM = "diary_fixedAlarms_v1";
const LS_DRAW_PREFIX = "diary_draw_";     // 날짜별 드로잉: diary_draw_YYYY-MM-DD

function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {
    console.warn("localStorage 저장 실패:", key, e);
  }
}
// 앱 시작 시 저장 가능 여부 체크
function checkStorage() {
  try {
    localStorage.setItem("__test__","1");
    localStorage.removeItem("__test__");
    return true;
  } catch { return false; }
}

// 드로잉 별도 저장/로드 (base64 이미지는 날짜키별 독립 저장)
function drawSave(dateKey, dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(LS_DRAW_PREFIX + dateKey, dataUrl);
    else localStorage.removeItem(LS_DRAW_PREFIX + dateKey);
  } catch(e) {
    // 용량 초과 시 오래된 드로잉 삭제 후 재시도
    const keys = Object.keys(localStorage).filter(k => k.startsWith(LS_DRAW_PREFIX));
    keys.sort(); // 날짜순 정렬, 오래된 것 먼저
    if (keys.length > 0) {
      localStorage.removeItem(keys[0]);
      try { if (dataUrl) localStorage.setItem(LS_DRAW_PREFIX + dateKey, dataUrl); } catch {}
    }
  }
}
function drawLoad(dateKey) {
  try { return localStorage.getItem(LS_DRAW_PREFIX + dateKey) || null; }
  catch { return null; }
}

// data 저장 시 drawData 필드 제외
function saveData(data) {
  try {
    const slim = {};
    for (const [k, v] of Object.entries(data)) {
      const { drawData, ...rest } = v;
      slim[k] = rest;
    }
    localStorage.setItem(LS_DATA, JSON.stringify(slim));
  } catch(e) { console.warn("data 저장 실패", e); }
}

export default function DiaryApp() {
  const today = new Date();
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay,  setSelectedDay]  = useState(today.getDate());

  // localStorage에서 초기값 로드
  const [data,        setData]        = useState(()=> lsGet(LS_DATA, {}));
  const [fixedTodos,  setFixedTodos]  = useState(()=> lsGet(LS_FIXED, DEFAULT_FIXED));
  const [fixedAlarms, setFixedAlarms] = useState(()=> lsGet(LS_FIXED_ALARM, {}));
  const [fixedDays,   setFixedDays]   = useState(()=> lsGet("diary_fixedDays_v1", {}));

  // data 변경 시 자동 저장 (drawData 제외)
  useEffect(()=>{ saveData(data); }, [data]);
  useEffect(()=>{ lsSet(LS_FIXED, fixedTodos); }, [fixedTodos]);
  useEffect(()=>{ lsSet(LS_FIXED_ALARM, fixedAlarms); }, [fixedAlarms]);
  useEffect(()=>{ lsSet("diary_fixedDays_v1", fixedDays); }, [fixedDays]);

  const [newFixed,     setNewFixed]     = useState("");
  const [newExtra,     setNewExtra]     = useState("");
  const [editingFixed, setEditingFixed] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventText,   setNewEventText]   = useState("");
  const [newEventTime,   setNewEventTime]   = useState("");
  const [newEventColor,  setNewEventColor]  = useState(0);
  const [newEventPlace,  setNewEventPlace]  = useState("");
  const [newEventNote,   setNewEventNote]   = useState("");
  const [editingEventIdx, setEditingEventIdx] = useState(null); // 수정 중인 일정 인덱스
  const [newEventDate,   setNewEventDate]   = useState(""); // 일정 날짜 (다른 날 지정 시)
  const [newEventEndDate,setNewEventEndDate]= useState(""); // 종료 날짜 (기간 일정)
  const [notifPerm,    setNotifPerm]    = useState(()=>getNotifPerm());
  const [storageOk,    setStorageOk]    = useState(true);
  const [user,         setUser]         = useState(null);  // Firebase 로그인 유저
  const [syncing,      setSyncing]      = useState(false); // 동기화 중

  // ── Google 로그인 ──
  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch(e) {
      if(e.code === "auth/popup-blocked" || e.code === "auth/popup-closed-by-user") {
        await signInWithRedirect(auth, googleProvider);
      } else {
        console.error("로그인 실패", e);
      }
    }
  };
  const signOutUser = async () => {
    try { await signOut(auth); }
    catch(e) { console.error("로그아웃 실패", e); }
  };

  // ── Auth 상태 감지 ──
  useEffect(()=>{
    // 리디렉션 후 결과 처리
    getRedirectResult(auth)
      .then(result => { if(result?.user) setUser(result.user); })
      .catch(e => console.log("redirect result:", e));
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // ── Firestore 실시간 동기화 ──
  useEffect(()=>{
    if(!user) return;
    const ref = doc(db, "users", user.uid, "appData", "main");

    // Firestore → 앱 (최초 1회만 로드, 이후는 앱→Firestore 방향)
    let initialLoad = true;
    const unsub = onSnapshot(ref, snap => {
      if(!initialLoad) return; // 최초 1회만 받음
      initialLoad = false;
      if(snap.exists()){
        const d = snap.data();
        // 데이터가 실제로 있을 때만 덮어씀
        if(d.data && Object.keys(JSON.parse(d.data)).length > 0)
          setData(JSON.parse(d.data));
        if(d.fixedTodos && JSON.parse(d.fixedTodos).length > 0)
          setFixedTodos(JSON.parse(d.fixedTodos));
        if(d.fixedDays)  setFixedDays(JSON.parse(d.fixedDays));
        if(d.fixedAlarms)setFixedAlarms(JSON.parse(d.fixedAlarms));
      }
    });
    return () => unsub();
  }, [user]);

  // ── 앱 → Firestore (데이터 변경 시 저장) ──
  const syncToFirebase = useCallback(async (newData, newFixedTodos, newFixedDays, newFixedAlarms) => {
    if(!user) return;
    setSyncing(true);
    try {
      const ref = doc(db, "users", user.uid, "appData", "main");
      // drawData 제외하고 저장 (용량 절약)
      const slim = {};
      for(const [k,v] of Object.entries(newData||data)){
        const { drawData, ...rest } = v;
        slim[k] = rest;
      }
      await setDoc(ref, {
        data: JSON.stringify(slim),
        fixedTodos: JSON.stringify(newFixedTodos||fixedTodos),
        fixedDays:  JSON.stringify(newFixedDays||fixedDays),
        fixedAlarms:JSON.stringify(newFixedAlarms||fixedAlarms),
        updatedAt: Date.now(),
      }, { merge: true });
    } catch(e){ console.error("동기화 실패", e); }
    setSyncing(false);
  }, [user, data, fixedTodos, fixedDays, fixedAlarms]);

  // data 변경 시 Firebase 동기화
  useEffect(()=>{ if(user) syncToFirebase(data); }, [data]);
  useEffect(()=>{ if(user) syncToFirebase(null, fixedTodos); }, [fixedTodos]);
  useEffect(()=>{ if(user) syncToFirebase(null, null, fixedDays); }, [fixedDays]);
  useEffect(()=>{ if(user) syncToFirebase(null, null, null, fixedAlarms); }, [fixedAlarms]);

  // localStorage 용량 체크
  useEffect(()=>{
    setStorageOk(checkStorage());
  },[]);
  const [toastAlarms,  setToastAlarms]  = useState([]);
  const [mobileTab,    setMobileTab]    = useState(0);
  const [noteMode,     setNoteMode]     = useState("text");
  const [noteUndo,     setNoteUndo]     = useState(0);
  const [noteClear,    setNoteClear]    = useState(0);
  const swipeStart = useRef(null);
  const [isTablet, setIsTablet] = useState(()=>window.innerWidth>=900);

  useEffect(()=>{
    const h=()=>setIsTablet(window.innerWidth>=900);
    window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h);
  },[]);

  // 현재 달 기준 계절 테마
  const th = getSeason(currentMonth);

  const key = dateKey(currentYear,currentMonth,selectedDay);
  const dayData = data[key]||{fixedDone:{},extraTodos:[],extraDone:{},extraAlarms:{},note:"",events:[]};
  const updateDay = u => {
    // drawData는 별도 localStorage에 즉시 저장
    if ("drawData" in u) drawSave(key, u.drawData);
    setData(d=>({...d,[key]:{...dayData,...u}}));
  };

  const firstDay    = getFirstDay(currentYear,currentMonth);
  const daysInMonth = getDaysInMonth(currentYear,currentMonth);
  // 선택된 날의 요일 (0=일, 1=월 ... 6=토)
  const selectedDayOfWeek = (firstDay + selectedDay - 1) % 7;

  const activeFixed = fixedTodos.filter(item=>(fixedDays[item]||[0,1,2,3,4,5,6]).includes(selectedDayOfWeek));
  const allTodos  = activeFixed.length+(dayData.extraTodos?.length||0);
  const doneTodos = activeFixed.filter(i=>dayData.fixedDone[i]).length+(dayData.extraTodos||[]).filter((_,i)=>dayData.extraDone[i]).length;
  const achievement = allTodos>0?Math.round(doneTodos/allTodos*100):0;
  const achColor = achievement>=80?"#4caf50":achievement>=50?"#ff9800":"#f44336";

  const firedRef = useRef(new Set());
  const fireAlarm = useCallback((icon,title,body)=>{
    playAlarmSound(); sendBrowserNotif(title,body);
    const id=Date.now()+Math.random();
    setToastAlarms(p=>[...p,{id,icon,title,body}]);
    setTimeout(()=>setToastAlarms(p=>p.filter(a=>a.id!==id)),8000);
  },[]);

  useEffect(()=>{
    const check=()=>{
      const now=new Date();
      const hh=String(now.getHours()).padStart(2,"0");
      const mm=String(now.getMinutes()).padStart(2,"0");
      const tk=dateKey(now.getFullYear(),now.getMonth(),now.getDate());
      const td=data[tk]||{};
      (td.events||[]).forEach((ev,i)=>{
        if(!ev.time) return;
        const k=`ev-${tk}-${i}-${ev.time}`;
        if(ev.time===`${hh}:${mm}`&&!firedRef.current.has(k)){firedRef.current.add(k);fireAlarm("📅","일정 알림",`${ev.time} · ${ev.text}`);}
      });
      fixedTodos.forEach(item=>{
        const t=fixedAlarms[item]; if(!t) return;
        const [fh,fm]=t.split(":").map(Number);
        const tgt=new Date(now); tgt.setHours(fh,fm,0,0);
        const diff=Math.round((tgt-now)/60000);
        const k=`fi-${tk}-${item}-${t}`;
        if(diff===10&&!firedRef.current.has(k)){firedRef.current.add(k);fireAlarm("📌","할 일 알림 (10분 전)",`${t} · ${item}`);}
      });
      (td.extraTodos||[]).forEach((item,i)=>{
        const t=(td.extraAlarms||{})[i]; if(!t) return;
        const [fh,fm]=t.split(":").map(Number);
        const tgt=new Date(now); tgt.setHours(fh,fm,0,0);
        const diff=Math.round((tgt-now)/60000);
        const k=`ex-${tk}-${i}-${t}`;
        if(diff===10&&!firedRef.current.has(k)){firedRef.current.add(k);fireAlarm("✏️","할 일 알림 (10분 전)",`${t} · ${item}`);}
      });
    };
    check(); const id=setInterval(check,30000); return ()=>clearInterval(id);
  },[data,fixedTodos,fixedAlarms,fireAlarm]);

  const prevMonth=()=>{if(currentMonth===0){setCurrentYear(y=>y-1);setCurrentMonth(11);}else setCurrentMonth(m=>m-1);setSelectedDay(1);};
  const nextMonth=()=>{if(currentMonth===11){setCurrentYear(y=>y+1);setCurrentMonth(0);}else setCurrentMonth(m=>m+1);setSelectedDay(1);};

  const addEvent=()=>{
    if(!newEventText.trim()) return;
    const ev = {text:newEventText.trim(),time:newEventTime,color:newEventColor,place:newEventPlace.trim(),note:newEventNote.trim(),date:newEventDate,endDate:newEventEndDate};
    if (editingEventIdx !== null) {
      // 수정 모드
      const events = [...(dayData.events||[])];
      events[editingEventIdx] = ev;
      updateDay({events});
    } else {
      // 추가 모드
      updateDay({events:[...(dayData.events||[]),ev]});
    }
    setNewEventText(""); setNewEventTime(""); setNewEventColor(0);
    setNewEventPlace(""); setNewEventNote("");
    setEditingEventIdx(null); setShowEventModal(false);
  };

  // 일정 수정 모달 열기
  const openEditEvent = (idx) => {
    const ev = (dayData.events||[])[idx];
    if (!ev) return;
    setNewEventText(ev.text||"");
    setNewEventTime(ev.time||"");
    setNewEventColor(ev.color||0);
    setNewEventPlace(ev.place||"");
    setNewEventNote(ev.note||"");
    setNewEventDate(ev.date||"");
    setNewEventEndDate(ev.endDate||"");
    setEditingEventIdx(idx);
    setShowEventModal(true);
  };
  const updateDayDone = idx => {
    const done = {...(dayData.eventDone||{})};
    done[idx] = !done[idx];
    updateDay({eventDone: done});
  };
  const removeEvent = idx => updateDay({events:(dayData.events||[]).filter((_,i)=>i!==idx)});
  const toggleFixed = item => updateDay({fixedDone:{...dayData.fixedDone,[item]:!dayData.fixedDone[item]}});
  const toggleExtra = idx  => updateDay({extraDone:{...dayData.extraDone,[idx]:!dayData.extraDone[idx]}});
  const addFixed=()=>{if(!newFixed.trim())return;setFixedTodos(f=>[...f,newFixed.trim()]);setNewFixed("");};
  const removeFixed=idx=>{
    const rm=fixedTodos[idx]; setFixedTodos(f=>f.filter((_,i)=>i!==idx));
    const fd={...dayData.fixedDone};delete fd[rm];updateDay({fixedDone:fd});
    setFixedAlarms(a=>{const n={...a};delete n[rm];return n;});
  };
  const renameFixed=(idx,val)=>{if(val.trim())setFixedTodos(f=>f.map((x,i)=>i===idx?val.trim():x));setEditingFixed(null);};
  const addExtra=()=>{if(!newExtra.trim())return;updateDay({extraTodos:[...(dayData.extraTodos||[]),newExtra.trim()]});setNewExtra("");};
  const removeExtra=idx=>{
    const et=(dayData.extraTodos||[]).filter((_,i)=>i!==idx);
    const ed=Object.fromEntries(Object.entries(dayData.extraDone||{}).filter(([k])=>Number(k)!==idx).map(([k,v])=>[Number(k)>idx?Number(k)-1:k,v]));
    const ea=Object.fromEntries(Object.entries(dayData.extraAlarms||{}).filter(([k])=>Number(k)!==idx).map(([k,v])=>[Number(k)>idx?Number(k)-1:k,v]));
    updateDay({extraTodos:et,extraDone:ed,extraAlarms:ea});
  };
  const setFixedAlarm=(item,val)=>setFixedAlarms(a=>({...a,[item]:val}));
  const setFixedDaysFn=(item,days)=>setFixedDays(d=>({...d,[item]:days}));
  const setExtraAlarm=(idx,val)=>updateDay({extraAlarms:{...(dayData.extraAlarms||{}),[idx]:val}});

  const handleTouchStart=e=>{swipeStart.current=e.touches[0].clientX;};
  const handleTouchEnd=e=>{
    if(swipeStart.current===null)return;
    const dx=e.changedTouches[0].clientX-swipeStart.current;
    const dy=Math.abs(e.changedTouches[0].clientY-(e.touches[0]?.clientY||0));
    // 탭(dx<10)이면 아무것도 안 함 — 버튼 클릭 허용
    if(Math.abs(dx)>50&&Math.abs(dx)>dy) setMobileTab(t=>dx<0?Math.min(t+1,2):Math.max(t-1,0));
    swipeStart.current=null;
  };

  // ── 코드 파일 다운로드 ──
  const downloadCode = async () => {
    try {
      const res  = await fetch(window.location.href);
      // fetch로 못 가져올 경우 대비 — 현재 스크립트 태그에서 찾기
      const scripts = Array.from(document.querySelectorAll("script[src]")).map(s=>s.src);
      // 코드를 직접 문자열로 내장해서 다운로드
      const code = document.querySelector("script:not([src])")?.textContent || "";
      const blob = new Blob([code], {type:"text/javascript"});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = "diary-app.jsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      alert("코드 다운로드는 Claude.ai 미리보기 환경에서는 직접 지원되지 않아요.\n\n대신 이 대화를 저장해두면 언제든 코드를 다시 받을 수 있어요!");
    }
  };

  // ── 데이터 내보내기 ──
  const exportData = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
      fixedTodos,
      fixedAlarms,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `diary-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── 데이터 불러오기 ──
  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target.result);
        if (payload.version !== 1) { alert("지원하지 않는 백업 파일입니다."); return; }
        if (payload.data)        setData(payload.data);
        if (payload.fixedTodos)  setFixedTodos(payload.fixedTodos);
        if (payload.fixedAlarms) setFixedAlarms(payload.fixedAlarms);
        alert("✅ 데이터를 불러왔어요!");
      } catch { alert("❌ 파일을 읽을 수 없어요."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const calProps  = {th,currentYear,currentMonth,selectedDay,today,data,firstDay,daysInMonth,onPrevMonth:prevMonth,onNextMonth:nextMonth,onSelectDay:setSelectedDay,onAddEvent:()=>{setEditingEventIdx(null);setNewEventText("");setNewEventTime("");setNewEventColor(0);setNewEventPlace("");setNewEventNote("");setNewEventDate("");setNewEventEndDate("");setShowEventModal(true);},dayData,removeEvent,openEditEvent,updateDayDone};
  const todoProps = {th,currentMonth,currentYear,selectedDay,selectedDayOfWeek,dayData,data,fixedTodos,fixedAlarms,fixedDays,editingFixed,achColor,achievement,doneTodos,allTodos,onToggleFixed:toggleFixed,onToggleExtra:toggleExtra,onAddFixed:addFixed,onRemoveFixed:removeFixed,onRenameFixed:renameFixed,onAddExtra:addExtra,onRemoveExtra:removeExtra,onSetEditingFixed:setEditingFixed,onSetFixedAlarm:setFixedAlarm,onSetExtraAlarm:setExtraAlarm,onSetFixedDays:setFixedDaysFn,newFixed,setNewFixed,newExtra,setNewExtra};
  const noteUndoRef  = useRef(null);
  const noteClearRef = useRef(null);
  const noteProps = {th,currentYear,currentMonth,selectedDay,note:dayData.note,onNoteChange:v=>updateDay({note:v}),drawData:drawLoad(key),onDrawChange:v=>updateDay({drawData:v}),extMode:noteMode,undoRef:noteUndoRef,clearRef:noteClearRef};

  return (
    <div style={{minHeight:"100vh",background:th.pageBg,fontFamily:"'Georgia','Batang',serif",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        @keyframes slideIn{from{opacity:0;transform:translateX(20px) scale(0.97)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        input[type="time"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.5}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        ::-webkit-scrollbar{display:none}
        body{font-family:'Noto Sans KR','DM Sans',sans-serif}
        button:hover{opacity:0.85}
      `}</style>

      {/* 배경 패턴 오버레이 */}
      <div style={{position:"fixed",inset:0,background:th.pattern,pointerEvents:"none",zIndex:0}}/>

      {/* 알림 배너 */}
      {notifSupported&&notifPerm==="default"&&(
        <div style={{position:"relative",zIndex:10,background:th.tabBg,color:"rgba(255,255,255,0.85)",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,letterSpacing:"0.02em"}}>
          <span>🔔 알람 기능을 사용하려면 알림을 허용해 주세요</span>
          <button onClick={async()=>{const r=await Notification.requestPermission();setNotifPerm(r);}} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:20,padding:"4px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:11,backdropFilter:"blur(4px)"}}>허용하기</button>
        </div>
      )}

      {/* ── 백업/복원 툴바 ── */}
      <div style={{position:"relative",zIndex:10,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:6,padding:"7px 16px",background:th.headerBg,borderBottom:`1px solid ${th.borderLight}`}}>
        {user ? (
          <div style={{display:"flex",alignItems:"center",gap:6,marginRight:"auto"}}>
            <img src={user.photoURL} alt="" style={{width:18,height:18,borderRadius:"50%"}}/>
            <span style={{fontSize:10,color:th.accent,opacity:0.6}}>{user.displayName}</span>
            {syncing && <span style={{fontSize:9,color:th.accent,opacity:0.4}}>↑ 동기화 중...</span>}
            {!syncing && <span style={{fontSize:9,color:"#4a9",opacity:0.7}}>● 동기화됨</span>}
          </div>
        ) : (
          <span style={{fontSize:10,color:th.accent,opacity:0.35,marginRight:"auto"}}>● 로컬 저장 중</span>
        )}
        <button onClick={downloadCode} style={{padding:"4px 10px",background:"rgba(0,0,0,0.06)",color:th.accent,border:`1px solid ${th.borderLight}`,borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:10,opacity:0.7}}>
          코드 저장
        </button>
        {user ? (
          <button onClick={signOutUser} style={{padding:"4px 10px",background:"rgba(0,0,0,0.06)",color:th.accent,border:`1px solid ${th.borderLight}`,borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:10}}>
            로그아웃
          </button>
        ) : (
          <button onClick={signIn} style={{padding:"4px 12px",background:"#4285f4",color:"#fff",border:"none",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:10,fontWeight:600}}>
            G 로그인
          </button>
        )}
        <button onClick={exportData} style={{padding:"4px 12px",background:th.accent,color:"#fff",border:"none",borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:10,boxShadow:`0 2px 8px rgba(${th.accentRgb},0.3)`}}>
          백업
        </button>
        <label style={{padding:"4px 12px",background:"transparent",color:th.accent,border:`1px solid ${th.border}`,borderRadius:20,cursor:"pointer",fontFamily:"inherit",fontSize:10}}>
          불러오기
          <input type="file" accept=".json" onChange={importData} style={{display:"none"}}/>
        </label>
      </div>

      {/* ════ 태블릿 레이아웃 ════ */}
      {isTablet&&(
        <div style={{display:"flex",alignItems:"stretch",justifyContent:"center",height:"100vh",padding:0,position:"relative",zIndex:1}}>
          <div style={{display:"flex",width:"100%",maxWidth:"100%",height:"100%",background:th.bookBg,overflow:"hidden",border:`1px solid ${th.borderLight}`,boxShadow:"0 8px 32px rgba(0,0,0,0.10)"}}>
            <div style={{width:4,background:th.binding,flexShrink:0}}/>
            <ScrollCell th={th} style={{flex:1,borderRight:`1px solid ${th.borderLight}`,minWidth:0,maxWidth:"25%"}}>
              <CalendarContent {...calProps}/>
            </ScrollCell>
            <ScrollCell th={th} style={{flex:1,borderRight:`1px solid ${th.borderLight}`,minWidth:0,maxWidth:"25%"}}>
              <TodoContent {...todoProps}/>
            </ScrollCell>
            <div style={{flex:2,minWidth:0,maxWidth:"50%",display:"flex",flexDirection:"column",overflow:"hidden"}}><NoteContent {...noteProps}/></div>
          </div>
        </div>
      )}

      {/* ════ 모바일 레이아웃 ════ */}
      {!isTablet&&(
        <div style={{display:"flex",flexDirection:"column",height:"100vh",position:"relative",zIndex:1}}>
          {/* 탭 바 */}
          <div style={{display:"flex",background:th.tabBg,flexShrink:0,padding:"0 4px"}}>
            {TABS.map((label,i)=>(
              <button key={i} onClick={()=>setMobileTab(i)} style={{
                flex:1,padding:"14px 4px 12px",border:"none",cursor:"pointer",
                background:"transparent",
                color:mobileTab===i?"#fff":"rgba(255,255,255,0.4)",
                fontFamily:"'Inter',sans-serif",fontSize:11,
                fontWeight:mobileTab===i?600:400,
                letterSpacing:"0.03em",
                borderBottom:mobileTab===i?`2px solid rgba(255,255,255,0.8)`:"2px solid transparent",
                transition:"all .25s",
              }}>{label}</button>
            ))}
          </div>

          {/* 인디케이터 */}
          <div style={{display:"flex",justifyContent:"center",gap:5,padding:"6px 0",background:th.pageBg,flexShrink:0}}>
            {TABS.map((_,i)=>(
              <span key={i} onClick={()=>setMobileTab(i)} style={{
                width:mobileTab===i?18:5,height:5,borderRadius:99,
                background:mobileTab===i?th.accent:th.border,
                display:"block",cursor:"pointer",transition:"all .3s cubic-bezier(.4,0,.2,1)",
              }}/>
            ))}
          </div>



          {/* 기록 탭일 때는 슬라이드 밖에서 직접 렌더링 */}
          {mobileTab===2 ? (
            <div style={{flex:1,overflow:"hidden"}}>
              <NoteContent {...noteProps}/>
            </div>
          ) : (
            <div style={{flex:1,overflow:"hidden",position:"relative",width:"100%"}}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div style={{
                display:"flex",height:"100%",
                width:"200%",
                transform:`translateX(${-mobileTab*50}%)`,
                transition:"transform .35s cubic-bezier(.4,0,.2,1)",
              }}>
                <div style={{width:"50%",flexShrink:0,height:"100%",overflowY:"auto"}}><CalendarContent {...calProps}/></div>
                <div style={{width:"50%",flexShrink:0,height:"100%",overflowY:"auto"}}><TodoContent {...todoProps}/></div>
              </div>
            </div>
          )}


        </div>
      )}

      {/* 일정 추가 모달 */}
      {showEventModal&&(
        <div onClick={e=>{if(e.target===e.currentTarget)setShowEventModal(false);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
          <div style={{background:th.bookBg,borderRadius:24,padding:28,width:"100%",maxWidth:360,boxShadow:"0 24px 64px rgba(0,0,0,0.18),0 8px 24px rgba(0,0,0,0.08)",border:`1px solid ${th.borderLight}`,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div style={{fontSize:18,fontWeight:700,color:th.accent,letterSpacing:"-0.3px"}}>{editingEventIdx!==null?"일정 수정":"일정 추가"} — {currentMonth+1}월 {selectedDay}일</div>
              {editingEventIdx!==null && (
                <button onClick={()=>{removeEvent(editingEventIdx);setEditingEventIdx(null);setShowEventModal(false);}}
                  style={{background:"#fff0f0",color:"#d03030",border:"1px solid #ffcccc",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>
                  🗑 삭제
                </button>
              )}
            </div>

            {/* 일정 이름 */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:th.accent,marginBottom:4,opacity:0.7}}>📌 일정 이름 <span style={{color:"#e04040"}}>*</span></div>
              <input autoFocus value={newEventText} onChange={e=>setNewEventText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEvent()} placeholder="예: 병원 예약, 팀 미팅..." style={{width:"100%",padding:"10px 14px",fontSize:13,border:`1px solid ${th.border}`,borderRadius:12,background:th.accentSoft,fontFamily:"'Inter',sans-serif",color:th.accent,outline:"none",boxSizing:"border-box"}}/>
            </div>

            {/* 시간 */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:th.accent,marginBottom:4,opacity:0.7}}>🕐 시간 <span style={{opacity:0.5}}>(설정 시 알람 🔔)</span></div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <select
                  value={newEventTime?newEventTime.split(":")[0]:""}
                  onChange={e=>{
                    const h=e.target.value;
                    const m=newEventTime?newEventTime.split(":")[1]||"00":"00";
                    setNewEventTime(h?`${h}:${m}`:"");
                  }}
                  style={{flex:1,padding:"10px 8px",fontSize:13,border:`1px solid ${th.border}`,borderRadius:12,background:th.accentSoft,color:newEventTime?th.accent:"#aaa",outline:"none",fontFamily:"inherit",touchAction:"manipulation"}}
                >
                  <option value="">시 선택</option>
                  {Array(24).fill(null).map((_,i)=>(
                    <option key={i} value={String(i).padStart(2,"0")}>{String(i).padStart(2,"0")}시</option>
                  ))}
                </select>
                <span style={{color:th.accent,fontWeight:700,flexShrink:0}}>:</span>
                <select
                  value={newEventTime?newEventTime.split(":")[1]||"00":"00"}
                  onChange={e=>{
                    const m=e.target.value;
                    const h=newEventTime?newEventTime.split(":")[0]:"";
                    setNewEventTime(h?`${h}:${m}`:"");
                  }}
                  style={{flex:1,padding:"10px 8px",fontSize:13,border:`1px solid ${th.border}`,borderRadius:12,background:th.accentSoft,color:th.accent,outline:"none",fontFamily:"inherit",touchAction:"manipulation"}}
                  disabled={!newEventTime?.split(":")[0]}
                >
                  {[0,5,10,15,20,25,30,35,40,45,50,55].map(m=>(
                    <option key={m} value={String(m).padStart(2,"0")}>{String(m).padStart(2,"0")}분</option>
                  ))}
                </select>
                {newEventTime&&(
                  <button onClick={()=>setNewEventTime("")} style={{padding:"10px 10px",borderRadius:12,border:`1px solid ${th.border}`,background:"transparent",color:"#d04040",cursor:"pointer",fontSize:12,fontFamily:"inherit",flexShrink:0,touchAction:"manipulation"}}>✕</button>
                )}
              </div>
            </div>

            {/* 날짜 */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:th.accent,marginBottom:4,opacity:0.7}}>📅 날짜 <span style={{opacity:0.5}}>(기본: {currentMonth+1}월 {selectedDay}일)</span></div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="date"
                  value={newEventDate||`${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`}
                  onChange={e=>setNewEventDate(e.target.value)}
                  style={{flex:1,padding:"10px 14px",fontSize:13,border:`1px solid ${th.border}`,borderRadius:12,background:th.accentSoft,color:th.accent,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                />
                <span style={{color:th.accent,opacity:0.5,flexShrink:0,fontSize:11}}>~</span>
                <input type="date"
                  value={newEventEndDate}
                  onChange={e=>setNewEventEndDate(e.target.value)}
                  placeholder="종료일"
                  style={{flex:1,padding:"10px 14px",fontSize:13,border:`1px solid ${th.border}`,borderRadius:12,background:th.accentSoft,color:newEventEndDate?th.accent:"#aaa",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}
                />
              </div>
              {newEventEndDate&&<div style={{fontSize:10,color:th.accent,opacity:0.5,marginTop:4}}>📆 기간 일정으로 등록됩니다</div>}
            </div>

            {/* 장소 */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:11,color:th.accent,marginBottom:4,opacity:0.7}}>📍 장소 <span style={{opacity:0.5}}>(선택)</span></div>
              <input value={newEventPlace} onChange={e=>setNewEventPlace(e.target.value)} placeholder="예: 강남역 2번 출구, 회의실 A..." style={{width:"100%",padding:"10px 14px",fontSize:13,border:`1px solid ${th.border}`,borderRadius:12,background:th.accentSoft,fontFamily:"'Inter',sans-serif",color:th.accent,outline:"none",boxSizing:"border-box"}}/>
            </div>

            {/* 내용 */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:th.accent,marginBottom:4,opacity:0.7}}>📝 내용 <span style={{opacity:0.5}}>(선택)</span></div>
              <textarea value={newEventNote} onChange={e=>setNewEventNote(e.target.value)} placeholder="일정에 대한 메모를 남겨보세요..." rows={3}
                style={{width:"100%",padding:"7px 9px",fontSize:13,border:`1px solid ${th.border}`,borderRadius:6,background:th.bookBg,fontFamily:"inherit",color:th.accent,outline:"none",boxSizing:"border-box",resize:"vertical",lineHeight:"1.5"}}/>
            </div>

            {/* 색상 */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:th.accent,marginBottom:8,opacity:0.7}}>🎨 색상</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {EVENT_COLORS.map((c,idx)=>(
                  <button key={idx} onClick={()=>setNewEventColor(idx)} style={{width:28,height:28,borderRadius:"50%",background:c.bg,border:`2px solid ${c.border}`,cursor:"pointer",outline:newEventColor===idx?`2px solid ${c.text}`:"none",outlineOffset:2}}/>
                ))}
              </div>
            </div>

            {/* 미리보기 */}
            {newEventText&&(
              <div style={{marginBottom:14,padding:"10px 12px",background:th.accentSoft,borderRadius:8,border:`1px solid ${th.border}`}}>
                <div style={{fontSize:10,color:th.accent,marginBottom:6,opacity:0.7}}>미리보기</div>
                <div style={{display:"flex",alignItems:"flex-start",gap:6,padding:"7px 10px",background:EVENT_COLORS[newEventColor].bg,border:`1px solid ${EVENT_COLORS[newEventColor].border}`,borderLeft:`3px solid ${EVENT_COLORS[newEventColor].border}`,borderRadius:6}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:newEventPlace||newEventNote?4:0}}>
                      {newEventTime&&<span style={{fontSize:10,color:EVENT_COLORS[newEventColor].text,fontWeight:"bold",flexShrink:0}}>{newEventTime}</span>}
                      <span style={{fontSize:12,color:EVENT_COLORS[newEventColor].text,fontWeight:"bold",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{newEventText}</span>
                      {newEventTime&&<span style={{fontSize:9,flexShrink:0}}>🔔</span>}
                    </div>
                    {newEventPlace&&<div style={{fontSize:10,color:EVENT_COLORS[newEventColor].text,opacity:0.8}}>📍 {newEventPlace}</div>}
                    {newEventNote&&<div style={{fontSize:10,color:EVENT_COLORS[newEventColor].text,opacity:0.7,marginTop:2,whiteSpace:"pre-wrap"}}>{newEventNote}</div>}
                  </div>
                </div>
              </div>
            )}

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowEventModal(false)} style={{flex:1,padding:"11px",background:"transparent",color:th.accent,border:`1px solid ${th.border}`,borderRadius:14,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,opacity:0.7}}>취소</button>

              <button onClick={addEvent} style={{flex:2,padding:"11px",background:th.accent,color:"#fff",border:"none",borderRadius:14,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:600,boxShadow:`0 4px 16px rgba(${th.accentRgb},0.35)`}}>{editingEventIdx!==null?"수정하기":"추가하기"}</button>
            </div>
          </div>
        </div>
      )}

      <AlarmToast alarms={toastAlarms} onDismiss={id=>setToastAlarms(a=>a.filter(x=>x.id!==id))}/>
    </div>
  );
}
