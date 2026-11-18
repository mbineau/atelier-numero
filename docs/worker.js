import {segment} from './engine.js';
self.onmessage=({data})=>{try{const result=segment(data,(message,value)=>self.postMessage({type:'progress',message,value}));self.postMessage({type:'result',result},[result.labels.buffer,result.regionMap.buffer]);}catch(error){self.postMessage({type:'error',message:error.message});}};
