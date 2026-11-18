import {rgbToLab} from './engine.js';

// Familiar French names help choose a felt-tip pen. These are visual
// approximations, independent of any manufacturer's proprietary color chart.
const references=[
  ['Blanc',255,255,255],['Ivoire',245,239,219],['Crème',240,226,190],['Beige clair',223,210,189],['Beige',199,180,151],['Sable',204,184,136],['Lin',201,194,177],
  ['Gris perle',213,215,214],['Gris clair',183,187,189],['Gris bleuté',158,172,185],['Gris acier',125,139,150],['Gris moyen',141,142,140],['Gris chaud',155,148,138],['Gris ardoise',98,111,121],['Gris verdâtre',84,101,100],['Olive sombre',91,91,71],['Vert ardoise',48,65,64],['Vert pin',36,54,38],['Gris foncé',83,87,86],['Anthracite',51,56,58],['Noir',21,22,22],
  ['Rose pâle',245,208,213],['Rose poudré',215,172,177],['Vieux rose',184,131,140],['Rose',236,129,171],['Rose vif',235,72,145],['Fuchsia',194,36,120],['Framboise',165,49,85],['Prune',104,55,83],['Bordeaux',107,38,51],
  ['Rouge clair',231,106,103],['Rouge',204,45,50],['Rouge foncé',147,40,40],['Rouge brique',166,72,51],['Terracotta',193,112,80],['Corail',239,131,108],['Saumon',232,163,142],['Pêche',245,194,158],['Abricot',237,170,105],['Orange',234,132,42],['Orange brûlé',191,91,29],['Ocre jaune',193,149,53],['Jaune doré',234,190,57],['Jaune',246,220,67],['Jaune pâle',246,234,157],
  ['Lilas',197,171,209],['Lavande',163,154,197],['Mauve',152,119,165],['Violet',119,76,158],['Violet foncé',74,49,104],['Aubergine',72,46,65],
  ['Bleu très pâle',216,230,235],['Bleu ciel',155,195,216],['Bleu clair',123,169,201],['Bleu glacier',171,198,207],['Bleu gris',112,146,166],['Bleu denim',79,115,149],['Bleu',55,109,182],['Bleu royal',44,68,155],['Bleu nuit',38,51,77],['Bleu marine',29,47,72],['Bleu pétrole',44,86,100],['Turquoise',64,166,170],['Turquoise clair',133,205,198],['Sarcelle',43,119,120],
  ['Vert menthe',174,209,178],['Vert pâle',201,215,166],['Vert amande',165,181,149],['Vert sauge',134,151,127],['Vert gris',112,131,119],['Vert olive',122,128,72],['Vert kaki',101,107,66],['Vert mousse',95,117,71],['Vert pomme',144,177,65],['Vert prairie',75,144,70],['Vert',56,123,74],['Vert émeraude',37,131,102],['Vert forêt',51,87,61],['Vert sapin',35,66,47],['Vert très foncé',24,40,29],
  ['Taupe clair',176,164,147],['Taupe',143,128,111],['Grège',174,169,151],['Brun clair',174,140,106],['Noisette',153,113,76],['Brun caramel',164,111,51],['Brun doré',147,118,69],['Brun terre',127,95,62],['Brun',115,79,54],['Brun acajou',112,61,46],['Chocolat',84,57,39],['Brun foncé',65,48,35],['Brun noir',34,30,23]
].map(([name,r,g,b])=>({name,lab:rgbToLab(r,g,b)}));

export function colorName(rgb){
  const lab=rgbToLab(...rgb);let best=Infinity,name='Gris';
  for(const ref of references){const d=(lab[0]-ref.lab[0])**2+(lab[1]-ref.lab[1])**2+(lab[2]-ref.lab[2])**2;if(d<best){best=d;name=ref.name;}}
  return name;
}

// Name the complete palette together: nearest-name lookup alone can give
// different paints the same label. Qualifiers describe relative lightness
// within that color family; paint values, ordering and numbers stay intact.
export function paletteColorNames(colors){
  const names=colors.map(colorName),groups=new Map();
  colors.forEach((rgb,index)=>{
    const name=names[index];
    if(!groups.has(name))groups.set(name,new Map());
    const group=groups.get(name),key=rgb.join(',');
    if(!group.has(key))group.set(key,{rgb,lightness:rgbToLab(...rgb)[0],indices:[]});
    group.get(key).indices.push(index);
  });
  for(const [base,colorsByRgb]of groups){
    if(colorsByRgb.size<2)continue;
    const group=[...colorsByRgb.values()].sort((a,b)=>b.lightness-a.lightness||a.rgb[0]-b.rgb[0]||a.rgb[1]-b.rgb[1]||a.rgb[2]-b.rgb[2]);
    const qualifiers={
      2:['clair','foncé'],
      3:['clair','moyen','foncé'],
      4:['très clair','clair','foncé','très foncé'],
      5:['très clair','clair','moyen','foncé','très foncé']
    }[group.length];
    const alreadyShaded=/(?:^| )(clair|foncé|pâle|sombre|moyen)(?: |$)/u.test(base);
    group.forEach((color,rank)=>{
      let qualifier=qualifiers?.[rank]||`ton ${rank+1}`;
      if(alreadyShaded&&qualifiers)qualifier={'clair':'plus clair','foncé':'plus foncé','moyen':'intermédiaire','très clair':'le plus clair','très foncé':'le plus foncé'}[qualifier];
      for(const index of color.indices)names[index]=`${base} · ${qualifier}`;
    });
  }
  return names;
}
