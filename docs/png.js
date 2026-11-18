// PNG encoding in short horizontal strips keeps high-DPI exports from needing
// one enormous canvas. Physical resolution is recorded in the pHYs chunk.
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,data){const bytes=new Uint8Array(data.length+12),view=new DataView(bytes.buffer);view.setUint32(0,data.length);for(let i=0;i<4;i++)bytes[4+i]=type.charCodeAt(i);bytes.set(data,8);let crc=0xffffffff;for(let i=4;i<bytes.length-4;i++)crc=table[(crc^bytes[i])&255]^(crc>>>8);view.setUint32(bytes.length-4,(crc^0xffffffff)>>>0);return bytes;}
export async function encodePng(width,height,dpi,readStrip,onProgress=()=>{}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>12000||height>12000)throw Error('Dimensions PNG non prises en charge.');
  const header=new Uint8Array(13),ihdr=new DataView(header.buffer);ihdr.setUint32(0,width);ihdr.setUint32(4,height);header[8]=8;header[9]=2;
  const density=new Uint8Array(9),phys=new DataView(density.buffer),ppm=Math.round(dpi/0.0254);phys.setUint32(0,ppm);phys.setUint32(4,ppm);density[8]=1;
  const parts=[new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('pHYs',density)];
  const compressor=new CompressionStream('deflate'),writer=compressor.writable.getWriter(),reader=compressor.readable.getReader();
  const reading=(async()=>{for(;;){const {value,done}=await reader.read();if(done)break;parts.push(chunk('IDAT',value));}})();
  try{
    for(let y=0;y<height;y+=128){const rows=Math.min(128,height-y),rgba=await readStrip(y,rows),stride=width*3+1,raw=new Uint8Array(stride*rows);
      for(let row=0;row<rows;row++){let dst=row*stride+1,src=row*width*4;for(let x=0;x<width;x++){raw[dst++]=rgba[src++];raw[dst++]=rgba[src++];raw[dst++]=rgba[src++];src++;}}
      await writer.write(raw);onProgress(Math.min(1,(y+rows)/height));
    }
    await writer.close();await reading;
  }catch(error){await writer.abort(error).catch(()=>{});await reading.catch(()=>{});throw error;}
  parts.push(chunk('IEND',new Uint8Array()));return new Blob(parts,{type:'image/png'});
}
export async function svgToPng(svg,layout,onProgress){
  if(typeof CompressionStream==='undefined')throw Error('Ce navigateur ne permet pas le PNG haute résolution. Utilisez le SVG ou un navigateur récent.');
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'})),image=new Image(),canvas=document.createElement('canvas');
  try{image.src=url;await image.decode();canvas.width=layout.pixelWidth;canvas.height=128;const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('Impossible de préparer le PNG.');
    return await encodePng(layout.pixelWidth,layout.pixelHeight,layout.dpi,(y,rows)=>{ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,-y,layout.pixelWidth,layout.pixelHeight);return ctx.getImageData(0,0,canvas.width,rows).data;},onProgress);
  }finally{URL.revokeObjectURL(url);canvas.width=canvas.height=0;}
}
