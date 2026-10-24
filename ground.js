// A broad, gently raised bank remains available before drawing any mountains.
export function bankHeight(x,z){
 const radius=Math.hypot((x+3)/16,(z-2)/12);
 const coast=.035*Math.sin(x*.37)+.025*Math.sin(z*.51+x*.1);
 const t=Math.max(0,Math.min(1,(1-radius+coast)/.23));
 const blend=t*t*(3-2*t);
 return -1.45+(1.96+.025*Math.sin(x*.22)*Math.cos(z*.17))*blend;
}
export function groundHeight(x,z,mountainHeight){return Math.max(bankHeight(x,z),mountainHeight);}
