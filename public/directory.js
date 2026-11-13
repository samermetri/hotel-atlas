export const normalize = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const isBoth = h => h.programs.includes('The Edit') && h.programs.some(p=>p==='FHR'||p==='THC');
export const isSelectCurrent = (now=new Date()) => now.getUTCFullYear()===2026;
export const programName = p => ({FHR:'Amex FHR',THC:'Amex Hotel Collection','The Edit':'Chase The Edit'}[p]||p);
export function matches(h, state){
  const haystack=normalize([h.name,h.brand,h.location,h.country,h.address].join(' '));
  if(normalize(state.q).trim().split(/\s+/).some(word=>!haystack.includes(word)))return false;
  if(state.country&&h.country!==state.country)return false;
  if(state.brand&&h.brand!==state.brand)return false;
  if(state.overlap&&!isBoth(h))return false;
  if(state.program==='both'&&!isBoth(h))return false;
  if(state.program==='select'&&(!h.selectCandidate||!isSelectCurrent()))return false;
  if(!['all','both','select'].includes(state.program)&&!h.programs.includes(state.program))return false;
  return true;
}
export function programColor(h){return isBoth(h)?'#a27d36':h.programs.includes('The Edit')?'#315a7e':'#235b48';}
