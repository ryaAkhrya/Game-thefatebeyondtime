import type Phaser from 'phaser';

export const VEYRATH_ENCOUNTER = { key: 'B02_ENCOUNTER', path: 'assets/chapter2/B02_encounter.png', size: 64, pivotY: 63 } as const;

/** Anonymous working residents; native-pixel contours with task-specific clothes and tools. */
export function drawResident(g: Phaser.GameObjects.Graphics, coat: number, task: string): void {
  const r=(color:number,x:number,y:number,w:number,h:number):void=>{g.fillStyle(color);g.fillRect(x,y,w,h);};
  const shade=(color:number,delta:number):number=>[16,8,0].reduce((out,shift)=>out|(Math.max(0,Math.min(255,((color>>shift)&255)+delta))<<shift),0);
  const poly=(color:number,points:number[][]):void=>{
    for(let y=Math.min(...points.map(p=>p[1]!));y<=Math.max(...points.map(p=>p[1]!));y++){
      const xs:number[]=[];const scan=y+.5;
      points.forEach((a,i)=>{const b=points[(i+1)%points.length]!;if((a[1]!<=scan&&b[1]!>scan)||(b[1]!<=scan&&a[1]!>scan))xs.push(a[0]!+(scan-a[1]!)*(b[0]!-a[0]!)/(b[1]!-a[1]!));});
      xs.sort((a,b)=>a-b);
      for(let i=0;i+1<xs.length;i+=2){const x=Math.ceil(xs[i]!-.5),end=Math.floor(xs[i+1]!-.5);if(end>=x)r(color,x,y,end-x+1,1);}
    }
  };
  const ink=0x38332e,skin=task==='drying'?0xb68e70:0xc3a17e,skinShade=0x9d755d;
  g.fillStyle(0x20272a,.3);g.fillEllipse(0,-1,18,6);
  poly(ink,[[-5,-14],[5,-14],[6,-8],[5,-2],[8,-1],[7,0],[1,0],[0,-9],[-1,-3],[-1,0],[-8,0],[-8,-2],[-6,-3]]);
  r(0x63534b,-5,-13,4,9);r(0x796253,-4,-12,1,7);r(0x55473f,1,-13,4,10);
  r(0x302d2a,-7,-2,6,2);r(0x302d2a,1,-2,7,2);r(0x8b7761,-6,-2,3,1);
  poly(ink,[[-4,-28],[4,-28],[8,-24],[8,-15],[6,-10],[-6,-10],[-8,-15],[-8,-24]]);
  poly(coat,[[-4,-27],[4,-27],[7,-23],[6,-12],[-6,-12],[-7,-23]]);
  poly(shade(coat,-25),[[3,-26],[7,-23],[6,-12],[3,-12],[4,-21]]);
  r(shade(coat,24),-5,-24,2,9);r(0xc1ad85,-4,-27,8,2);r(0x5d4938,-6,-14,12,2);r(0xa58a58,-1,-14,2,2);
  poly(shade(coat,-12),[[-7,-25],[-10,-23],[-10,-17],[-8,-15],[-6,-20]]);
  poly(shade(coat,-25),[[7,-25],[10,-22],[10,-17],[8,-15],[6,-21]]);
  r(skin,-10,-17,3,4);r(skinShade,7,-17,3,4);
  poly(skin,[[-4,-38],[3,-38],[6,-35],[5,-29],[2,-27],[-3,-28],[-6,-32],[-6,-35]]);
  r(skinShade,3,-34,2,5);r(skinShade,-3,-29,5,1);r(0x493c33,-4,-33,1,1);r(0x493c33,2,-33,1,1);
  poly(task==='sort'?0x77766b:0x514137,[[-5,-38],[-1,-40],[4,-39],[7,-35],[5,-33],[3,-36],[-2,-36],[-5,-33],[-7,-34]]);
  r(0x79614b,-3,-38,5,1);
  if(task==='carry'||task==='sort'||task==='drying'){
    poly(0xb1a080,[[-4,-23],[3,-23],[5,-12],[-5,-12]]);
    r(0xd0bc96,-3,-22,2,8);r(0x8d7c63,2,-19,1,6);
  }
  if(task==='carry'||task==='sort'){
    r(0x574431,-10,-21,20,13);r(0x9c7b51,-9,-20,18,11);r(0xc0a16d,-8,-19,16,1);
    for(const x of [-7,-1,5])r(0x755936,x,-18,1,8);
    r(skin,-10,-16,3,3);r(skinShade,7,-16,3,3);
  }else if(task==='sweep'){
    r(0x58462f,9,-28,2,28);r(0xb29a6f,9,-27,1,27);
    poly(0x9f8b5e,[[8,-5],[12,-5],[17,0],[6,0]]);
    for(const x of [8,11,14])r(0xc6b184,x,-2,1,2);
    r(skin,7,-19,4,3);
  }else if(task==='watch'||task==='guard'){
    poly(0x686e65,[[-7,-36],[-5,-41],[2,-42],[6,-39],[8,-35]]);
    r(0x9ba08c,-4,-40,6,1);r(0x3f4842,-7,-35,15,2);
    r(0x796448,11,-27,2,27);r(0xb29c71,11,-26,1,25);
    poly(0x959c91,[[12,-39],[15,-31],[12,-27],[10,-31]]);
    r(skin,8,-18,4,3);
  }else if(task==='drying'){
    poly(0xc5b18b,[[8,-21],[15,-20],[17,-11],[9,-10]]);
    r(0xe1cda6,10,-19,2,7);r(0x988265,14,-18,1,7);r(skinShade,7,-18,3,3);
  }
}
