// Image segmentation runs in a worker: no photo ever leaves the browser.
export function rgbToLab(r,g,b) {
  const linear = v => (v/=255) <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4;
  r=linear(r);g=linear(g);b=linear(b);
  const f=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;
  const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047), y=f(.2126729*r+.7151522*g+.072175*b),z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
}
const distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;

export function segment({data,width:w,height:h,colors=18,fusion=40,detail=60},progress=()=>{}) {
  const n=w*h;
  progress('Adoucissement de la photo',.08);
  // Bilateral smoothing preserves significant edges while removing photo grain.
  const rgb=new Uint8ClampedArray(n*3),radius=detail<40?2:1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    let sr=0,sg=0,sb=0,sw=0;const p=(y*w+x)*4;
    for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++) {
      const xx=Math.max(0,Math.min(w-1,x+dx)), yy=Math.max(0,Math.min(h-1,y+dy)),q=(yy*w+xx)*4;
      const diff=(data[p]-data[q])**2+(data[p+1]-data[q+1])**2+(data[p+2]-data[q+2])**2;
      const weight=Math.exp(-diff/(1800+(100-detail)*55)-(dx*dx+dy*dy)/5);
      sr+=data[q]*weight;sg+=data[q+1]*weight;sb+=data[q+2]*weight;sw+=weight;
    }
    rgb.set([sr/sw,sg/sw,sb/sw],(y*w+x)*3);
  }
  const cache=new Map(), labs=new Float32Array(n*3),hist=new Map();
  for(let i=0;i<n;i++) {
    const p=i*3,key=((rgb[p]>>3)<<10)|((rgb[p+1]>>3)<<5)|(rgb[p+2]>>3);
    let lab=cache.get(key);if(!lab){lab=rgbToLab(rgb[p],rgb[p+1],rgb[p+2]);cache.set(key,lab);}
    labs.set(lab,p);
    if(i%Math.max(1,Math.floor(n/12000))===0) {const v=hist.get(key);if(v)v.weight++;else hist.set(key,{lab,weight:1});}
  }
  progress('Composition du nuancier',.25);
  const samples=[...hist.values()],k=Math.min(colors,samples.length),centers=[];
  let first=samples.reduce((a,b)=>a.weight>b.weight?a:b);centers.push([...first.lab]);
  const nearest=new Float64Array(samples.length).fill(Infinity);
  for(let c=1;c<k;c++) {
    let best=-1,idx=0;
    samples.forEach((s,i)=>{nearest[i]=Math.min(nearest[i],distance(s.lab,centers[c-1]));const score=nearest[i]*Math.sqrt(s.weight);if(score>best){best=score;idx=i;}});
    centers.push([...samples[idx].lab]);
  }
  for(let iter=0;iter<18;iter++) {
    const sums=Array.from({length:k},()=>[0,0,0,0]);
    for(const s of samples){let best=Infinity,idx=0;for(let c=0;c<k;c++){const d=distance(s.lab,centers[c]);if(d<best){best=d;idx=c;}}const t=sums[idx];t[0]+=s.lab[0]*s.weight;t[1]+=s.lab[1]*s.weight;t[2]+=s.lab[2]*s.weight;t[3]+=s.weight;}
    let change=0;for(let c=0;c<k;c++)if(sums[c][3]){const next=sums[c].slice(0,3).map(v=>v/sums[c][3]);change+=distance(next,centers[c]);centers[c]=next;}if(change<.08)break;
  }
  const labels=new Uint16Array(n),sums=Array.from({length:k},()=>[0,0,0,0]);
  for(let i=0;i<n;i++) {let best=Infinity,idx=0;const p=i*3;for(let c=0;c<k;c++){const a=centers[c],d=(labs[p]-a[0])**2+(labs[p+1]-a[1])**2+(labs[p+2]-a[2])**2;if(d<best){best=d;idx=c;}}labels[i]=idx;const s=sums[idx];s[0]+=rgb[p];s[1]+=rgb[p+1];s[2]+=rgb[p+2];s[3]++;}
  const palette=sums.map(s=>s.slice(0,3).map(v=>Math.round(v/(s[3]||1))));
  progress('Fusion des petites zones',.55);
  const regionMap=new Int32Array(n).fill(-1),queue=new Int32Array(n),regions=[];
  for(let i=0;i<n;i++)if(regionMap[i]===-1) {
    const id=regions.length,color=labels[i];let head=0,tail=1;queue[0]=i;regionMap[i]=id;
    while(head<tail){const p=queue[head++],x=p%w;
      for(const q of [x?p-1:-1,x<w-1?p+1:-1,p>=w?p-w:-1,p<n-w?p+w:-1])if(q>=0&&regionMap[q]===-1&&labels[q]===color){regionMap[q]=id;queue[tail++]=q;}
    }
    regions.push({id,color,area:tail,parent:id,neighbors:new Map()});
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,a=regionMap[p];for(const q of [x<w-1?p+1:-1,y<h-1?p+w:-1])if(q>=0){const b=regionMap[q];if(a!==b){regions[a].neighbors.set(b,(regions[a].neighbors.get(b)||0)+1);regions[b].neighbors.set(a,(regions[b].neighbors.get(a)||0)+1);}}}
  const root=id=>{let r=id;while(regions[r].parent!==r)r=regions[r].parent;while(id!==r){const next=regions[id].parent;regions[id].parent=r;id=next;}return r;};
  function merge(a,b) {const A=regions[a],B=regions[b];A.parent=b;B.area+=A.area;B.neighbors.delete(a);for(const [other,length]of A.neighbors){const c=root(other);if(c===b||c===a)continue;B.neighbors.set(c,(B.neighbors.get(c)||0)+length);regions[c].neighbors.delete(a);regions[c].neighbors.set(b,(regions[c].neighbors.get(b)||0)+length);}A.neighbors.clear();}
  // Size is relative to image area, so the same setting behaves consistently.
  const minArea=Math.max(3,Math.round(n*(.000015+fusion*fusion*.0000002)*(1.7-detail*.012)));
  const threshold=(fusion*.13)**2;
  for(let pass=0;pass<4;pass++) {
    let changed=0;const order=regions.filter(r=>r.parent===r.id).sort((a,b)=>a.area-b.area);
    for(const r of order)if(r.parent===r.id){let best=-1,score=Infinity;
      for(const [other,edge]of r.neighbors){const b=root(other);if(b===r.id)continue;const d=distance(centers[r.color],centers[regions[b].color]);if(r.area<minArea||d<threshold){const s=d+12/Math.sqrt(edge);if(s<score){score=s;best=b;}}}
      if(best>=0){merge(r.id,best);changed++;}
    }if(!changed)break;
  }
  for(let i=0;i<n;i++)labels[i]=regions[root(regionMap[i])].color;
  // A merge can join two previously separate patches of the same paint.
  // Reconnect them so region counts, outlines and numbers describe one zone.
  regionMap.fill(-1);const finalRegions=[];
  for(let i=0;i<n;i++)if(regionMap[i]===-1){const id=finalRegions.length,color=labels[i];let head=0,tail=1;queue[0]=i;regionMap[i]=id;
    while(head<tail){const p=queue[head++],x=p%w;for(const q of [x?p-1:-1,x<w-1?p+1:-1,p>=w?p-w:-1,p<n-w?p+w:-1])if(q>=0&&regionMap[q]===-1&&labels[q]===color){regionMap[q]=id;queue[tail++]=q;}}
    finalRegions.push({color,area:tail,x:i%w+.5,y:Math.floor(i/w)+.5,radius:-1});
  }
  // Place each number at a maximum of the interior distance field, never at a
  // centroid that may fall outside a concave region.
  progress('Placement des numéros',.8);
  const dist=new Float32Array(n).fill(10000);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,r=regionMap[p];if(!x||!y||x===w-1||y===h-1||regionMap[p-1]!==r||regionMap[p+1]!==r||regionMap[p-w]!==r||regionMap[p+w]!==r)dist[p]=0;else dist[p]=Math.min(dist[p],dist[p-1]+1,dist[p-w]+1,dist[p-w-1]+1.414,dist[p-w+1]+1.414);}
  for(let y=h-2;y>=1;y--)for(let x=w-2;x>=1;x--){const p=y*w+x;dist[p]=Math.min(dist[p],dist[p+1]+1,dist[p+w]+1,dist[p+w-1]+1.414,dist[p+w+1]+1.414);}
  for(let i=0;i<n;i++){const r=finalRegions[regionMap[i]];if(dist[i]>r.radius){r.radius=dist[i];r.x=i%w+.5;r.y=Math.floor(i/w)+.5;}}
  // Remove unused colors and order paint numbers from light to dark.
  const counts=new Uint32Array(k);for(let i=0;i<n;i++)counts[labels[i]]++;
  const used=palette.map((rgb,i)=>({rgb,old:i,count:counts[i]})).filter(c=>c.count).sort((a,b)=>centers[b.old][0]-centers[a.old][0]);
  const remap=new Uint16Array(k);used.forEach((c,i)=>remap[c.old]=i);for(let i=0;i<n;i++)labels[i]=remap[labels[i]];finalRegions.forEach(r=>r.color=remap[r.color]);
  return {width:w,height:h,labels,regionMap,regions:finalRegions,palette:used.map(c=>({rgb:c.rgb,count:c.count})),minArea};
}
