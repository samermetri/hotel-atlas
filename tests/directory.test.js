import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matches,isBoth,isSelectCurrent} from '../public/directory.js';
const data=JSON.parse(readFileSync(new URL('../public/hotels.json',import.meta.url)));
const hotels=data.hotels;
const defaults={q:'',program:'all',country:'',brand:'',overlap:false};
test('snapshot identifiers, coordinates, programs and issuer links are valid',()=>{
  assert.equal(new Set(hotels.map(h=>h.id)).size,hotels.length);
  assert.ok(hotels.length>3000);
  for(const h of hotels){
    assert.ok(h.id&&h.name&&h.country&&h.address);
    assert.ok(h.lat>=-90&&h.lat<=90&&h.lng>=-180&&h.lng<=180);
    assert.ok(h.programs.length&&h.programs.every(p=>['FHR','THC','The Edit'].includes(p)));
    if(h.amexUrl)assert.equal(new URL(h.amexUrl).hostname,'www.americanexpress.com');
    if(h.selectCandidate)assert.ok(h.selectBasis&&h.programs.includes('The Edit'));
  }
});
test('search combines destination and hotel words and ignores accents',()=>{
  const result=hotels.filter(h=>matches(h,{...defaults,q:'bellagio las vegas'}));
  assert.ok(result.some(h=>h.name==='Bellagio'));
  assert.equal(hotels.filter(h=>matches(h,{...defaults,q:'there-is-no-hotel-with-this-name-41931'})).length,0);
  const accented={name:'Hôtel de Paris',location:'Monaco',country:'Monaco',brand:'Independent',address:'Monaco',programs:['FHR']};
  assert.ok(matches(accented,{...defaults,q:'hotel paris'}));
});
test('combined filters never leak properties from another country or program',()=>{
  const result=hotels.filter(h=>matches(h,{...defaults,country:'United States',program:'FHR',overlap:true}));
  assert.ok(result.length>50);
  assert.ok(result.every(h=>h.country==='United States'&&h.programs.includes('FHR')&&h.programs.includes('The Edit')&&isBoth(h)));
  assert.ok(!matches(hotels[0],{...defaults,country:'not a country'}));
});
test('Select Hotels candidates cannot remain active after the published benefit ends',()=>{
  assert.ok(isSelectCurrent(new Date('2026-12-31T23:59:59Z')));
  assert.equal(isSelectCurrent(new Date('2027-01-01T00:00:00Z')),false);
});
test('all snapshot Select candidates retain an explicit inference basis',()=>{
  const candidates=hotels.filter(h=>h.selectCandidate);
  assert.ok(candidates.length>100);
  assert.ok(candidates.every(h=>/ihg|montage|pendry|omni|virgin|minor|pan pacific/i.test(h.selectBasis)));
});
