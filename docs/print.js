import {rgbToLab} from './engine.js';

export const PAPER_SIZES={A5:[148,210],A4:[210,297],A3:[297,420],Letter:[215.9,279.4]};
export function pageLayout(result,{format='A4',orientation='auto',dpi=300,fontPt=8,adapt=true}={}){
  if(!PAPER_SIZES[format]||![150,300,600].includes(dpi)||fontPt<6||fontPt>16)throw Error('Réglages d’impression non valides.');
  let [width,height]=PAPER_SIZES[format];
  const landscape=orientation==='landscape'||(orientation==='auto'&&result.width>result.height);
  if(landscape)[width,height]=[height,width];
  const margin=10,scale=Math.min((width-margin*2)/result.width,(height-margin*2)/result.height);
  return {format,orientation:landscape?'landscape':'portrait',width,height,margin,scale,
    x:(width-result.width*scale)/2,y:(height-result.height*scale)/2,
    pixelWidth:Math.round(width/25.4*dpi),pixelHeight:Math.round(height/25.4*dpi),
    dpi,fontPt,fontUnits:fontPt*25.4/72/scale,adapt};
}
export const requiredRadius=(color,fontUnits)=>fontUnits*.5*Math.hypot(1,String(color+1).length*.64)+.25;

// Recompute connected zones and their most spacious interior points after a
// print-only merge. The live creation is never modified.
function components(labels,w,h){
  const n=w*h,map=new Int32Array(n).fill(-1),queue=new Int32Array(n),regions=[];
  for(let i=0;i<n;i++)if(map[i]<0){const id=regions.length,color=labels[i];let head=0,tail=1;queue[0]=i;map[i]=id;
    while(head<tail){const p=queue[head++],x=p%w;for(const q of [x?p-1:-1,x<w-1?p+1:-1,p>=w?p-w:-1,p<n-w?p+w:-1])if(q>=0&&map[q]<0&&labels[q]===color){map[q]=id;queue[tail++]=q;}}
    regions.push({color,area:tail,x:i%w+.5,y:Math.floor(i/w)+.5,radius:0});
  }
  const dist=new Float32Array(n).fill(1e6);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,r=map[p];if(!x||!y||x===w-1||y===h-1||map[p-1]!==r||map[p+1]!==r||map[p-w]!==r||map[p+w]!==r)dist[p]=.5;else dist[p]=Math.min(dist[p-1]+1,dist[p-w]+1,dist[p-w-1]+1.414,dist[p-w+1]+1.414);}
  for(let y=h-2;y>=1;y--)for(let x=w-2;x>=1;x--){const p=y*w+x;dist[p]=Math.min(dist[p],dist[p+1]+1,dist[p+w]+1,dist[p+w-1]+1.414,dist[p+w+1]+1.414);}
  for(let i=0;i<n;i++){const r=regions[map[i]];if(dist[i]>r.radius){r.radius=dist[i];r.x=i%w+.5;r.y=Math.floor(i/w)+.5;}}
  return {map,regions};
}
export function preparePrint(source,options={}){
  const layout=pageLayout(source,options),w=source.width,h=source.height,labels=new Uint16Array(source.labels);
  let {map,regions}=components(labels,w,h);
  const labs=source.palette.map(c=>rgbToLab(...c.rgb));
  if(layout.adapt)for(let pass=0;pass<24;pass++){
    const fits=r=>r.radius>=requiredRadius(r.color,layout.fontUnits);
    if(regions.every(fits))break;
    const nodes=regions.map((r,id)=>({...r,id,parent:id,neighbors:new Map(),touched:false}));
    const root=id=>{while(nodes[id].parent!==id){nodes[id].parent=nodes[nodes[id].parent].parent;id=nodes[id].parent;}return id;};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,a=map[p];for(const q of [x<w-1?p+1:-1,y<h-1?p+w:-1])if(q>=0){const b=map[q];if(a!==b){nodes[a].neighbors.set(b,(nodes[a].neighbors.get(b)||0)+1);nodes[b].neighbors.set(a,(nodes[b].neighbors.get(a)||0)+1);}}}
    let changes=0;
    for(const a of [...nodes].sort((a,b)=>a.radius-b.radius)){
      if(a.parent!==a.id||a.touched||fits(a))continue;
      let best=-1,score=Infinity;
      for(const [other,edge]of a.neighbors){const id=root(other),b=nodes[id];if(id===a.id||(b.touched&&!fits(b)))continue;
        const A=labs[a.color],B=labs[b.color],d=(A[0]-B[0])**2+(A[1]-B[1])**2+(A[2]-B[2])**2;
        const cost=d+30/Math.sqrt(edge)+(fits(b)?0:30);
        if(cost<score){score=cost;best=id;}
      }
      if(best<0)continue;
      const b=nodes[best];b.touched=!fits(b);a.parent=best;b.area+=a.area;b.radius=Math.max(a.radius,b.radius);b.neighbors.delete(a.id);
      for(const [other,edge]of a.neighbors){const id=root(other);if(id===best||id===a.id)continue;b.neighbors.set(id,(b.neighbors.get(id)||0)+edge);nodes[id].neighbors.delete(a.id);nodes[id].neighbors.set(best,(nodes[id].neighbors.get(best)||0)+edge);}
      changes++;
    }
    if(!changes)break;
    for(let i=0;i<labels.length;i++)labels[i]=nodes[root(map[i])].color;
    ({map,regions}=components(labels,w,h));
  }
  const counts=new Uint32Array(source.palette.length);for(const color of labels)counts[color]++;
  const result={...source,labels,regionMap:map,regions,palette:source.palette.map((c,i)=>({...c,count:counts[i]}))};
  return {result,layout,merged:source.regions.length-regions.length,tooSmall:regions.filter(r=>r.radius<requiredRadius(r.color,layout.fontUnits)).length};
}
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
const svg=(l,title,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}mm" height="${l.height}mm" viewBox="0 0 ${l.width} ${l.height}"><title>${xml(title)}</title><rect width="100%" height="100%" fill="white"/>${body}</svg>`;
function outlines(r){const {width:w,height:h,labels}=r,lines=[];
  for(let y=0;y<=h;y++){let start=-1;for(let x=0;x<=w;x++){const edge=x<w&&(y===0||y===h||labels[(y-1)*w+x]!==labels[y*w+x]);if(edge&&start<0)start=x;if(!edge&&start>=0){lines.push(`M${start} ${y}h${x-start}`);start=-1;}}}
  for(let x=0;x<=w;x++){let start=-1;for(let y=0;y<=h;y++){const edge=y<h&&(x===0||x===w||labels[y*w+x-1]!==labels[y*w+x]);if(edge&&start<0)start=y;if(!edge&&start>=0){lines.push(`M${x} ${start}v${y-start}`);start=-1;}}}
  return lines.join('');
}
export function artworkSvg(prepared,{mode='numbers',title='Coloriage',painted=null}={}){
  const {result:r,layout:l}=prepared,{width:w,height:h}=r;let body='';
  if(mode==='colors'||mode==='paint'){
    const paths=r.palette.map(()=>'');
    const labels=mode==='paint'?Int16Array.from(r.labels,(_,i)=>painted?.[r.regionMap[i]]??-1):r.labels;
    for(let y=0;y<h;y++){let start=0;for(let x=1;x<=w;x++)if(x===w||labels[y*w+x]!==labels[y*w+start]){const c=labels[y*w+start];if(c>=0)paths[c]+=`M${start} ${y}h${x-start}v1H${start}z`;start=x;}}
    body+=paths.map((d,i)=>d?`<path d="${d}" fill="${hex(r.palette[i].rgb)}" shape-rendering="crispEdges"/>`:'').join('');
  }
  body+=`<path d="${outlines(r)}" fill="none" stroke="${mode==='colors'||mode==='paint'?'#4a514a80':'#555b50'}" stroke-width="${.16/l.scale}" stroke-linejoin="round"/>`;
  if(mode==='numbers')body+=`<g font-family="Arial,sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="central" font-size="${l.fontUnits}" fill="#20251f" stroke="white" stroke-width="${l.fontUnits*.15}" paint-order="stroke" stroke-linejoin="round">${r.regions.map(v=>`<text x="${v.x}" y="${v.y}">${v.color+1}</text>`).join('')}</g>`;
  return svg(l,title,`<g transform="translate(${l.x} ${l.y}) scale(${l.scale})">${body}</g>`);
}
function wrap(text,max){const lines=[];let line='';for(const word of text.split(' ')){if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
export function swatchesSvg(prepared,title='Votre nuancier'){
  const {result:r,layout:l}=prepared,colors=r.palette.map((c,i)=>({...c,number:i+1})).filter(c=>c.count>0),columns=l.width>l.height?3:2;
  const rows=Math.ceil(colors.length/columns),cellWidth=(l.width-20)/columns,cellHeight=Math.min(20,(l.height-47)/rows),marker=Math.min(10,cellHeight-1.5);
  const blocks=colors.map((c,i)=>{const x=10+i%columns*cellWidth,y=37+Math.floor(i/columns)*cellHeight;const lines=wrap(c.name,Math.floor((cellWidth-18)/1.65));return `<g transform="translate(${x} ${y})"><rect width="${marker}" height="${marker}" rx="1" fill="${hex(c.rgb)}" stroke="#00000018" stroke-width=".2"/><text x="${marker/2}" y="${marker*.65}" font-size="${Math.min(3.5,marker*.4)}" text-anchor="middle" fill="${c.rgb[0]*.299+c.rgb[1]*.587+c.rgb[2]*.114>145?'#20251f':'white'}">${c.number}</text><text x="14" y="4" font-size="3" fill="#293f36">${lines.map((line,j)=>`<tspan x="14" dy="${j?3.8:0}">${xml(line)}</tspan>`).join('')}</text></g>`;}).join('');
  const shortTitle=title.length>50?title.slice(0,48)+'…':title;
  return svg(l,title,`<g font-family="Arial,sans-serif"><text x="10" y="16" font-family="Georgia,serif" font-size="6" fill="#293f36">Les couleurs de votre création</text><text x="10" y="23" font-size="3" fill="#69765f">${xml(shortTitle)} · ${colors.length} couleurs</text><text x="10" y="29" font-size="2.7" fill="#69765f">Choisissez le feutre le plus proche de chaque pastille.</text>${blocks}</g>`);
}
