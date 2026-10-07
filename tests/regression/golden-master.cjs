const vm=require('vm');
const {createRuntime}=require('../helpers/runtime.cjs');

const profiles=[
  {level:'principiante',trainingKnowledge:'basico',currentCapabilityMinutes:0,recentRunDaysPerWeek:0,currentWeeklyMinutes:0,usualLongSessionMinutes:0,trainingYears:0,toleratesConsecutiveDays:false},
  {level:'principiante',trainingKnowledge:'basico',currentCapabilityMinutes:15,recentRunDaysPerWeek:2,currentWeeklyMinutes:50,usualLongSessionMinutes:25,trainingYears:.2,toleratesConsecutiveDays:false},
  {level:'principiante',trainingKnowledge:'familiar',currentCapabilityMinutes:30,recentRunDaysPerWeek:3,currentWeeklyMinutes:90,usualLongSessionMinutes:40,trainingYears:.7,toleratesConsecutiveDays:false},
  {level:'intermedio',trainingKnowledge:'familiar',currentCapabilityMinutes:45,recentRunDaysPerWeek:3,currentWeeklyMinutes:140,usualLongSessionMinutes:60,trainingYears:2,toleratesConsecutiveDays:false},
  {level:'intermedio',trainingKnowledge:'tecnico',currentCapabilityMinutes:65,recentRunDaysPerWeek:4,currentWeeklyMinutes:230,usualLongSessionMinutes:90,trainingYears:4,toleratesConsecutiveDays:true},
  {level:'avanzado',trainingKnowledge:'tecnico',currentCapabilityMinutes:100,recentRunDaysPerWeek:5,currentWeeklyMinutes:360,usualLongSessionMinutes:135,trainingYears:8,toleratesConsecutiveDays:true},
];
const distances=[3,5,7,10,15,21.097,42.195,50],horizons=[4,12,24],frequencies=[2,3,4,5,6];
const daySets={2:[2,6],3:[1,3,6],4:[1,3,5,6],5:[1,2,3,5,6],6:[1,2,3,4,5,6]};

function installMatrix(runtime){
  runtime.__matrix={profiles,distances,horizons,frequencies,daySets};
  return vm.runInContext(`(()=>{const rows=[];for(const spec of __matrix.profiles)for(const distance of __matrix.distances)for(const weeks of __matrix.horizons)for(const available of __matrix.frequencies){const profile=Object.assign(defaultProfile(),spec),goal=Object.assign(defaultGoal(),{distanceKm:distance,startDate:'2026-01-05',date:addDays('2026-01-05',weeks*7-1)}),availability=Object.assign(defaultAvailability(),{days:__matrix.daySets[available],maxSessionsPerWeek:available,sessionDurationAvailMin:spec.currentCapabilityMinutes===0?55:spec.level==='principiante'?75:180,blockedDates:[]}),ctx={profile,goal,availability,activities:[],limitations:[]},plan=generateAdaptivePlan(ctx);enrichPlan(plan,ctx);delete plan.meta.generatedAt;rows.push(plan)}return rows})()`,runtime,{timeout:30000});
}

const golden=installMatrix(createRuntime('golden'));
const modular=installMatrix(createRuntime('modular'));
if(golden.length!==720||modular.length!==720)throw new Error(`Unexpected matrix size: ${golden.length}/${modular.length}`);
for(let i=0;i<golden.length;i++){
  const a=JSON.stringify(golden[i]),b=JSON.stringify(modular[i]);
  if(a!==b)throw new Error(`Golden-master difference in plan ${i+1}`);
}
console.log(JSON.stringify({ok:true,plansCompared:720,differences:0},null,2));
