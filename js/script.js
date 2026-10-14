const doctors = [
 {name:"Dr. Raj Patel",specialty:"Cardiology",qual:"MBBS, MD (Cardiology) • 12 Years Experience",photo:"https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=85",department:"Cardiology",time:"09:00 AM – 01:00 PM"},
 {name:"Dr. Priya Sharma",specialty:"General Medicine",qual:"MBBS, MD • 8 Years Experience",photo:"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=85",department:"General Medicine",time:"10:00 AM – 02:00 PM"},
 {name:"Dr. Amit Shah",specialty:"Orthopedics",qual:"MBBS, MS (Orthopedics) • 10 Years Experience",photo:"https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=900&q=85",department:"Orthopedics",time:"11:00 AM – 03:00 PM"},
 {name:"Dr. Neha Mehta",specialty:"Dermatology",qual:"MBBS, MD (Dermatology) • 7 Years Experience",photo:"https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=900&q=85",department:"Dermatology",time:"09:30 AM – 01:30 PM"},
 {name:"Dr. Arjun Rao",specialty:"Neurology",qual:"MBBS, DM (Neurology) • 11 Years Experience",photo:"https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=900&q=85",department:"Neurology",time:"02:00 PM – 06:00 PM"},
 {name:"Dr. Kavya Iyer",specialty:"Pediatrics",qual:"MBBS, MD (Pediatrics) • 9 Years Experience",photo:"https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=900&q=85",department:"Pediatrics",time:"04:00 PM – 08:00 PM"}
];
const departments=[...new Set(doctors.map(d=>d.department))];
const doctorGrid=document.getElementById("doctorGrid");
doctorGrid.innerHTML=doctors.map((d,i)=>`<article class="doctor-card"><div class="doctor-photo"><img src="${d.photo}" alt="Portrait of ${d.name}" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=85'"></div><div class="doctor-body"><h3>${d.name}</h3><div class="specialty">${d.specialty}</div><p class="qual">${d.qual}<br>OPD: ${d.time}</p><button class="btn primary book-doctor" data-id="${i}">Book Appointment</button></div></article>`).join("");

const dept=document.getElementById("department"), doctor=document.getElementById("doctor"), date=document.getElementById("date"), slots=document.getElementById("slots");
dept.innerHTML='<option value="">Choose department</option>'+departments.map(x=>`<option>${x}</option>`).join("");
doctor.innerHTML='<option value="">Choose doctor</option>';

dept.addEventListener("change",()=>{
 const list=doctors.map((d,i)=>({...d,i})).filter(d=>!dept.value||d.department===dept.value);
 doctor.innerHTML='<option value="">Choose doctor</option>'+list.map(d=>`<option value="${d.i}">${d.name} — ${d.specialty}</option>`).join("");
 renderSlots();
});
doctor.addEventListener("change",renderSlots);
date.min=new Date().toISOString().split("T")[0];
date.value=date.min;

function renderSlots(){
 const selected=doctors[doctor.value];
 const times=["09:00 AM","09:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM","12:00 PM","02:00 PM","02:30 PM","03:00 PM","04:00 PM","05:00 PM"];
 const blocked=[2,6];
 slots.innerHTML=times.map((t,i)=>`<button type="button" class="slot ${blocked.includes(i)?"booked":""}" ${blocked.includes(i)?"disabled":""} data-time="${t}">${t}</button>`).join("");
 slots.querySelectorAll(".slot:not(.booked)").forEach(b=>b.addEventListener("click",()=>{slots.querySelectorAll(".slot").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")}));
 if(selected && !selected.time) {}
}
renderSlots();

document.querySelectorAll(".book-doctor").forEach(btn=>btn.addEventListener("click",()=>{
 const d=doctors[btn.dataset.id]; dept.value=d.department; dept.dispatchEvent(new Event("change")); doctor.value=btn.dataset.id; renderSlots(); document.getElementById("appointment").scrollIntoView({behavior:"smooth"});
}));

const form=document.getElementById("appointmentForm"), modal=document.getElementById("modal"), confirmation=document.getElementById("confirmation");
form.addEventListener("submit",e=>{
 e.preventDefault();
 const selected=slots.querySelector(".selected");
 if(!selected){document.getElementById("bookingMessage").textContent="Please select an available time slot.";return}
 const d=doctors[doctor.value], id="MOS-"+Math.floor(10000+Math.random()*90000);
 const formatted=new Date(date.value+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
 confirmation.innerHTML=`<b>${document.getElementById("patientName").value}</b><br>${d.name} • ${d.specialty}<br>${formatted} at ${selected.dataset.time}<br><br><b>Appointment ID: ${id}</b>`;
 modal.classList.add("show");
 form.reset(); date.value=new Date().toISOString().split("T")[0]; renderSlots();
});
document.getElementById("closeModal").onclick=()=>modal.classList.remove("show");
document.getElementById("printBtn").onclick=()=>window.print();
modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show")});

document.getElementById("availabilityGrid").innerHTML=doctors.map((d,i)=>`<div class="availability-card"><h3>${d.name}</h3><p>${d.specialty} • ${d.time}</p><span class="status ${i===4?"busy":"available"}">● ${i===4?"LIMITED AVAILABILITY":"AVAILABLE TODAY"}</span></div>`).join("");

let rating=0;
document.querySelectorAll("#stars button").forEach(b=>b.addEventListener("click",()=>{
 rating=Number(b.dataset.rating);
 document.querySelectorAll("#stars button").forEach(x=>x.classList.toggle("active",Number(x.dataset.rating)<=rating));
}));
document.getElementById("feedbackForm").addEventListener("submit",e=>{
 e.preventDefault();
 document.getElementById("feedbackMessage").textContent=`Thank you for your ${rating||"valuable"} feedback!`;
 e.target.reset(); rating=0; document.querySelectorAll("#stars button").forEach(x=>x.classList.remove("active"));
});

// Sign-in / sign-up interface (front-end demo; connect a secure backend for real accounts)
const authModal=document.getElementById("authModal");
const signInForm=document.getElementById("signInForm");
const signUpForm=document.getElementById("signUpForm");
const authTitle=document.getElementById("authTitle");
const authEyebrow=document.getElementById("authEyebrow");
const authMessage=document.getElementById("authMessage");
const signInTab=document.getElementById("signInTab");
const signUpTab=document.getElementById("signUpTab");

function openAuth(mode){
 authModal.classList.add("show");
 authModal.setAttribute("aria-hidden","false");
 setAuthMode(mode);
}
function closeAuth(){
 authModal.classList.remove("show");
 authModal.setAttribute("aria-hidden","true");
 authMessage.textContent="";
}
function setAuthMode(mode){
 const signup=mode==="signup";
 signInForm.hidden=signup;
 signUpForm.hidden=!signup;
 signInTab.classList.toggle("active",!signup);
 signUpTab.classList.toggle("active",signup);
 authEyebrow.textContent=signup?"JOIN MOSCOW HOSPITAL":"WELCOME BACK";
 authTitle.textContent=signup?"Create your account":"Sign in to your account";
 authMessage.textContent="";
}
document.getElementById("openSignIn").addEventListener("click",e=>{e.preventDefault();openAuth("signin")});
document.getElementById("openSignUp").addEventListener("click",e=>{e.preventDefault();openAuth("signup")});
document.getElementById("closeAuth").addEventListener("click",closeAuth);
signInTab.addEventListener("click",()=>setAuthMode("signin"));
signUpTab.addEventListener("click",()=>setAuthMode("signup"));
authModal.addEventListener("click",e=>{if(e.target===authModal)closeAuth()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeAuth()});
signInForm.addEventListener("submit",e=>{
 e.preventDefault();
 authMessage.textContent="The sign-in design is ready. Connect a secure backend to verify account details.";
});
signUpForm.addEventListener("submit",e=>{
 e.preventDefault();
 authMessage.textContent="The sign-up design is ready. Connect a secure backend to create and protect user accounts.";
});
