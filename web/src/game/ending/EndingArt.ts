import Phaser from 'phaser';
import { getDisplay } from '../systems/DisplayController';
import type { EndingStep } from './progress';
import { ENDING_ART, SEATED_FRAME } from './artAssets';
import { DIRS, resolveAnims, type CharacterAnimMeta } from '../world/CharacterAnims';

const W = 640, H = 360;
let nextArt = 0;
type Ctx = CanvasRenderingContext2D;
const rect = (c: Ctx, color: string, x: number, y: number, w: number, h: number): void => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };
function polygon(c: Ctx, color: string, points: number[][]): void {
  // Scanline fill keeps the logical pixel palette intact; Canvas path antialiasing would add soft edge colors.
  c.fillStyle = color;
  const low = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]!))));
  const high = Math.min(H - 1, Math.ceil(Math.max(...points.map(p => p[1]!))));
  for (let y = low; y <= high; y++) {
    const intersections: number[] = [], scan = y + 0.5;
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length]!;
      if ((a[1]! <= scan && b[1]! > scan) || (b[1]! <= scan && a[1]! > scan)) intersections.push(a[0]! + (scan - a[1]!) * (b[0]! - a[0]!) / (b[1]! - a[1]!));
    });
    intersections.sort((a,b) => a-b);
    for (let i=0; i+1<intersections.length; i+=2) {
      const x=Math.ceil(intersections[i]!-0.5), right=Math.floor(intersections[i+1]!-0.5);
      if(right>=x)c.fillRect(x,y,right-x+1,1);
    }
  }
}
/** Same ring and broken diagonal used by the Chapter III heirloom / Chapter IV Heart. */
function emblem(c: Ctx, x: number, y: number, radius: number, color: string): void {
  for (let t = 0; t < 360; t += 2) rect(c, color, x + Math.cos(t * Math.PI / 180) * radius, y + Math.sin(t * Math.PI / 180) * radius, 1, 1);
  for (let t = -radius; t <= radius; t++) if (Math.abs(t) > 2) rect(c, color, x + t, y + Math.round(t / 2), 1, 1);
}
function cloud(c: Ctx, x: number, y: number, size: number, color: string): void {
  // Small symbolic overlay, formed from rounded native-pixel lobes rather than bars.
  for (const [cx, cy, rx, ry] of [[11,13,21,5],[33,9,24,10],[57,11,23,7],[79,14,23,4]]) {
    for(let row=-ry!;row<=ry!;row++){
      const half=Math.round(rx!*Math.sqrt(Math.max(0,1-row*row/(ry!*ry!))));
      rect(c,color,x+(cx!-half)*size,y+(cy!+row)*size,Math.max(1,Math.round((half*2+1)*size)),Math.max(1,Math.round(size)));
    }
  }
}

/** Reference-led Phase 10 backgrounds/poses with native pixel compositing; no real-person likeness. */
export class EndingArt {
  readonly key = `ending-art-${nextArt++}`;
  private texture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;
  private base = document.createElement('canvas');
  private step: EndingStep | null = null;
  private lastFrame = -1;
  constructor(private readonly scene: Phaser.Scene) {
    this.base.width = W; this.base.height = H;
    this.texture = scene.textures.createCanvas(this.key, W, H)!;
    this.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const d = getDisplay(scene), scale = Math.max(1, Math.floor(Math.min(d.pixelWidth / W, d.pixelHeight / H)));
    this.image = scene.add.image(Math.round(d.pixelWidth / 2), Math.round(d.pixelHeight / 2), this.key).setScale(scale).setDepth(-10);
  }
  destroy(): void { this.image.destroy(); if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key); }
  render(step: EndingStep, ms: number, playerX = 230, moving = false, reduced = true): void {
    const changed = this.step !== step;
    if (changed) { this.step = step; this.paintBase(step); this.lastFrame = -1; }
    const frame = Math.floor(ms / 50);
    if (!changed && frame === this.lastFrame) return;
    this.lastFrame = frame;
    const c = this.texture.getContext(); c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, W, H); c.drawImage(this.base, 0, 0);
    const t = reduced ? ms * 0.5 : ms;
    if (['walk', 'artefact', 'awakening', 'memories'].includes(step)) {
      this.modernFigure(c, playerX, 265, 0, moving ? Math.floor(ms / 180) : 0);
      this.modernFigure(c, playerX - 32, 262, 1, moving ? Math.floor(ms / 210) : 0);
      if (step === 'artefact' || step === 'awakening') emblem(c, 442, 233, 8, '#b2bc71');
    }
    if (['remember', 'cliff-arrival', 'promise', 'cloud-path', 'cloud-heart', 'silhouettes'].includes(step)) {
      const drift = Math.floor((t / 1500) % 38);
      if(!this.scene.textures.exists(ENDING_ART.cliff.key)) {
        cloud(c, 45 + drift, 74, 1.2, '#c7b5b5'); cloud(c, 320 - drift, 110, 0.8, '#e0bda8');
        cloud(c, 472 + Math.floor(drift / 2), 45, 1, '#ada3b4');
      }
      this.seated(c, 'C02', 477, 256, ms);
      const walk = step === 'cliff-arrival' && ms < 1900;
      if (walk) this.sourceFrame(c, 'C01_YARIC_EXPLORE', 1, ms, 574 - Math.min(123, Math.round(ms / 15)), 252);
      else if (step !== 'remember') this.seated(c, 'C01', 450, 254, ms + 500);
      // Two grass tufts move by a single pixel at deliberately different times.
      for (const [x, y] of [[409, 244], [556, 262], [598, 274]]) {
        const bend = Math.floor(t / (x! + 800)) % 2;
        rect(c, '#555b47', x!, y! - 5, 1, 5); rect(c, '#75765a', x! - 2 + bend, y! - 8, 1, 5);
      }
      if (step === 'cloud-path' || step === 'cloud-heart' || step === 'silhouettes') {
        c.globalAlpha = Math.min(0.8, ms / 2600);
        if (step === 'cloud-path') {
          polygon(c, '#ece0cc', [[177,142],[198,136],[219,123],[255,116],[273,102],[286,101],[267,122],[228,133],[211,148],[177,151]]);
          for (const x of [154,177,294,315]) polygon(c, '#c6c3b7', [[x,143],[x+8,114],[x+15,143]]);
        } else if (step === 'cloud-heart') {
          cloud(c, 174, 94, 1.1, '#e8d3ba'); emblem(c, 245, 118, 27, '#f2e0c5');
        } else {
          // Clouds part around two anonymous back-facing modern silhouettes, for the audience alone.
          cloud(c, 146, 94, 1.7, '#e6d2c0');
          this.modernFigure(c, 221, 144, 0, 0, '#9995a1'); this.modernFigure(c, 252, 144, 1, 0, '#9995a1');
          cloud(c, 151, 145, 1.3, '#d4bdba');
        }
        c.globalAlpha = 1;
      }
    }
    if ((step === 'archive' || step === 'heirloom' || step === 'heart') && !this.scene.textures.exists(ENDING_ART[step].key)) {
      c.globalAlpha = 0.14 + Math.min(0.28, ms / 12000);
      emblem(c, 318, 151, step === 'heart' ? 39 : 23, '#d9d69a'); c.globalAlpha = 1;
    }
    this.texture.refresh();
  }
  private paintBase(step: EndingStep): void {
    const c = this.base.getContext('2d')!; c.imageSmoothingEnabled = false;
    rect(c, '#17131f', 0, 0, W, H);
    if (['era', 'continued', 'credits', 'message', 'complete'].includes(step)) {
      if (step === 'credits' || step === 'complete') { cloud(c, 40, 230, 1.4, '#211c2a'); cloud(c, 430, 75, 1, '#24202d'); }
      return;
    }
    if (['archive', 'heirloom', 'heart'].includes(step)) { this.echo(c, step); return; }
    if (['walk', 'artefact', 'awakening', 'memories'].includes(step)) { this.modern(c); return; }
    this.cliff(c);
  }
  private modern(c: Ctx): void {
    if (this.background(c, 'modern')) { this.relic(c); return; }
    // Unnamed pedestrian space. No dates, maps, real venue names or invented relationship facts.
    const sky = ['#53545f','#6b6570','#897a7e','#ab9189','#c9aa94'];
    sky.forEach((color, i) => rect(c, color, 0, i * 36, W, 38));
    cloud(c, 113, 47, 1.2, '#9c8d91'); cloud(c, 393, 32, 0.8, '#7e7782');
    polygon(c, '#6b6d73', [[0,150],[65,125],[101,141],[179,110],[263,145],[320,120],[392,146],[451,115],[540,144],[640,119],[640,206],[0,206]]);
    for (const [x,y,w,h] of [[0,111,55,105],[47,132,42,90],[91,145,62,72],[500,115,51,105],[555,137,42,85],[604,98,36,123]]) {
      rect(c, '#575460', x!, y!, w!, h!); rect(c, '#68606a', x!, y!, w!-5, 3);
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) rect(c, (row+col)%3 ? '#776d72' : '#c3aa86', x!+8+col*13, y!+13+row*19, 5, 8);
    }
    rect(c, '#494b53', 0, 204, W, 41); rect(c, '#777078', 0, 201, W, 4);
    rect(c, '#33313e', 0, 239, W, 121); rect(c, '#57515a', 0, 244, W, 50);
    rect(c, '#68606a', 0, 245, W, 2);
    for (let y = 261; y < 293; y += 16) { rect(c, '#4b4651', 0, y, W, 1); for (let x = (y%2)*13; x < W; x += 54) rect(c, '#4b4651', x, y-15, 1, 15); }
    this.relic(c);
    // Bench, planter and a single unlit street fixture establish an ordinary modern place.
    for (let y=231;y<242;y+=4) rect(c,'#8e7767',65,y,85,2);
    rect(c,'#292c36',72,243,3,16);rect(c,'#292c36',140,243,3,16);
    rect(c,'#373842',348,133,3,111);rect(c,'#373842',338,132,22,3);rect(c,'#b5aa92',339,135,19,2);
    rect(c,'#6c6261',550,238,42,18);polygon(c,'#4b5650',[[547,237],[549,218],[560,224],[569,212],[576,225],[589,220],[596,237]]);
    polygon(c,'#211e2a',[[0,314],[96,306],[181,319],[259,310],[367,321],[482,309],[640,323],[640,360],[0,360]]);
  }
  private cliff(c: Ctx): void {
    if (this.background(c, 'cliff')) return;
    const sky = ['#6b627e','#84768b','#9e8997','#b19aa0','#c6aaa5','#d8b8a8','#e4c6ad'];
    sky.forEach((color, i) => rect(c, color, 0, i * 24, W, 25));
    rect(c,'#e9cdb0',0,165,W,25);
    polygon(c,'#9c9ea6',[[0,183],[64,171],[123,179],[179,164],[220,174],[284,159],[364,171],[428,158],[501,174],[568,163],[640,175],[640,256],[0,256]]);
    polygon(c,'#7d8793',[[0,215],[65,198],[102,205],[165,187],[220,210],[284,195],[340,217],[411,196],[484,209],[565,189],[640,211],[640,288],[0,288]]);
    // Aveloria remains damaged. The old tower is a broken stump, no magically restored skyline.
    for (const [x,y,w,h] of [[77,202,16,19],[95,194,25,30],[123,204,14,18],[141,197,19,27],[164,205,20,19]]) { rect(c,'#93999a',x!,y!,w!,h!);polygon(c,'#6e7b88',[[x!-2,y!],[x!+w!/2,y!-5],[x!+w!+2,y!]]); }
    polygon(c,'#93999a',[[111,192],[111,176],[116,179],[120,173],[125,180],[125,193]]);
    polygon(c,'#5e7279',[[0,255],[61,238],[112,246],[191,230],[259,246],[323,238],[375,255],[438,242],[505,257],[582,239],[640,252],[640,360],[0,360]]);
    polygon(c,'#a5aaa0',[[298,227],[303,233],[283,246],[297,257],[267,271],[275,288],[235,317],[214,360],[203,360],[224,316],[259,286],[255,270],[284,256],[272,245]]);
    polygon(c,'#424d58',[[0,293],[52,279],[122,294],[188,285],[252,309],[322,288],[372,301],[447,286],[507,318],[640,298],[640,360],[0,360]]);
    polygon(c,'#483b49',[[390,251],[412,241],[481,242],[532,251],[640,267],[640,360],[412,360],[405,320],[418,292]]);
    polygon(c,'#685354',[[390,251],[414,248],[432,263],[426,295],[446,323],[440,360],[412,360],[405,320],[418,292]]);
    polygon(c,'#7a6b60',[[390,251],[409,240],[465,238],[510,247],[555,251],[589,263],[640,263],[640,278],[546,264],[495,256],[442,254],[417,257]]);
    polygon(c,'#62654e',[[397,246],[416,237],[468,236],[499,242],[542,245],[588,257],[640,257],[640,266],[584,264],[540,253],[497,249],[451,247],[415,251]]);
    for (const [x,y] of [[433,267],[443,295],[467,279],[504,309],[557,291],[599,325],[463,340]]) {rect(c,'#5a4b50',x!,y!,14,2);rect(c,'#7b6260',x!,y!+2,8,1);}
    // Sparse stone strata, meadow clusters and river-bank detail anchor the large shapes.
    for (const [x,y,w] of [[425,280,15],[432,317,7],[454,337,21],[481,290,17],[526,330,24],[568,304,13],[611,345,18]]) {
      rect(c,'#5e4a51',x!,y!,w!,2);rect(c,'#80635d',x!+2,y!+2,Math.max(2,w!-7),1);
    }
    for (const [x,y] of [[413,244],[424,242],[491,246],[507,247],[533,249],[569,259],[617,263]]) {
      rect(c,'#858164',x!,y!,6,1);rect(c,'#444f43',x!+2,y!-3,1,4);rect(c,'#69765c',x!+4,y!-2,1,3);
    }
    for (const [x,y] of [[88,209],[103,205],[131,212],[148,208],[173,214]]) {rect(c,'#65747d',x!,y!,2,4);rect(c,'#bdafa0',x!+3,y!,1,3);}
    rect(c,'#a8a49a',113,185,3,6);rect(c,'#74808a',116,178,2,5);rect(c,'#576b76',98,219,78,2);
    // Near foliage frames the valley; one species, three readable leaf clusters.
    polygon(c,'#303e49',[[0,284],[23,275],[47,285],[68,309],[76,360],[0,360]]);
    polygon(c,'#3e5358',[[0,278],[15,269],[30,272],[30,279],[44,280],[49,291],[31,294],[20,289],[3,290]]);
    polygon(c,'#4b6262',[[12,303],[30,293],[45,297],[45,303],[58,307],[55,317],[34,319],[20,314]]);
    rect(c,'#2e3945',27,293,3,45);rect(c,'#42504f',30,310,2,29);
    // A practical footpath where Yaric arrives, not an isolated decorative platform.
    polygon(c,'#8a7b65',[[640,252],[593,249],[563,241],[527,240],[504,244],[507,248],[545,246],[578,258],[640,260]]);
  }
  private echo(c: Ctx, step: EndingStep): void {
    if ((step === 'archive' || step === 'heirloom' || step === 'heart') && this.background(c, step)) return;
    rect(c,'#211d2c',0,0,W,H);
    if (step === 'archive') {
      rect(c,'#393341',144,60,352,230);rect(c,'#51434c',161,78,318,190);
      for (const y of [106,153,200]) {rect(c,'#837065',164,y,312,5);for (let i=0;i<19;i++){const x=171+i*16;rect(c,['#6b5260','#877961','#5a686b'][i%3]!,x,y-27-(i%3)*3,11,26+(i%3)*3);rect(c,'#b49e7e',x+2,y-20,7,1);}}
      polygon(c,'#9b8970',[[249,160],[309,152],[326,157],[385,153],[386,220],[326,224],[309,218],[249,225]]);
      rect(c,'#c5af87',313,158,2,60);emblem(c,348,185,14,'#6c6859');
    } else if (step === 'heirloom') {
      rect(c,'#443743',215,69,211,222);polygon(c,'#736071',[[248,93],[292,80],[317,125],[346,79],[391,94],[363,253],[276,254]]);
      polygon(c,'#9c8c71',[[300,126],[318,140],[340,126],[337,165],[320,184],[302,166]]);emblem(c,320,155,14,'#d3c28c');
      rect(c,'#4f3f52',244,244,149,11);
    } else {
      rect(c,'#39343e',197,54,246,245);
      for(let x=197;x<443;x+=41)rect(c,'#59505a',x,54,1,245);
      for(let y=54;y<299;y+=35)rect(c,'#59505a',197,y,246,1);
      emblem(c,318,151,51,'#a7a78b');emblem(c,318,151,49,'#797f70');
      for (const x of [258,378]) { rect(c,'#6e6465',x-10,212,20,76);rect(c,'#b3a486',x-12,208,24,6);rect(c,'#c2c58b',x-4,217,8,12); }
      // Two separated locks and a broken chain recall the player's action, without retelling the boss.
      for(let i=0;i<6;i++){rect(c,'#60565c',265+i*9,177+i*2,7,3);rect(c,'#60565c',337+i*9,188-i*2,7,3);}
    }
    rect(c,'#17131f',0,0,W,32);rect(c,'#17131f',0,303,W,57);
  }
  private modernFigure(c: Ctx, x: number, y: number, variant: number, frame: number, color = '#252632'): void {
    // Anonymous fictional backs: contoured hair, shoulders, arms and a small gait.
    // No face, skin tone, partner likeness or real wardrobe is inferred.
    const xx=Math.round(x), stride=[0,1,0,-1][frame%4]!, cloudTint=color!=='#252632';
    const shade=cloudTint?'#898690':'#252631', light=cloudTint?'#aba4ac':'#4b4855';
    polygon(c,color,[[xx-3,y-41],[xx+3,y-41],[xx+6,y-38],[xx+6,y-32],[xx+3,y-29],[xx-3,y-29],[xx-6,y-32],[xx-6,y-37]]);
    rect(c,light,xx-3,y-40,5,1);rect(c,shade,xx-5,y-34,2,5);
    rect(c,color,xx-3,y-30,6,4);
    polygon(c,color,[[xx-4,y-28],[xx+4,y-28],[xx+8,y-24],[xx+7,y-14],[xx+6,y-10],[xx-6,y-10],[xx-7,y-15],[xx-8,y-24]]);
    polygon(c,light,[[xx-4,y-27],[xx+3,y-27],[xx+5,y-24],[xx+3,y-24],[xx-3,y-25],[xx-5,y-22]]);
    rect(c,shade,xx+3,y-23,3,12);rect(c,light,xx-5,y-21,1,9);
    polygon(c,color,[[xx-7,y-25],[xx-9,y-22],[xx-10,y-15+stride],[xx-8,y-12+stride],[xx-7,y-16]]);
    polygon(c,color,[[xx+7,y-25],[xx+9,y-22],[xx+10,y-15-stride],[xx+8,y-12-stride],[xx+7,y-16]]);
    rect(c,shade,xx-6,y-11,5,9+stride);rect(c,color,xx+1,y-11,5,9-stride);
    rect(c,color,xx-7,y-3+stride,7,3);rect(c,color,xx+1,y-3-stride,7,3);
    rect(c,light,xx-6,y-2+stride,5,1);rect(c,shade,xx+2,y-2-stride,5,1);
    if(variant)rect(c,light,xx-4,y-26,8,1);
  }
  private sourceFrame(c: Ctx, key: string, row: number, ms: number, x: number, y: number): void {
    if (!this.scene.textures.exists(key)) return;
    const tex=this.scene.textures.get(key), src=tex.getSourceImage() as HTMLImageElement;
    const cols=Math.round(src.width/32);
    const meta=this.scene.cache.json.get(`${key}:meta`) as CharacterAnimMeta | undefined;
    const walk=resolveAnims(meta,cols,DIRS[row]!).walk;
    const frame=walk.frames[Math.floor(ms*walk.fps/1000)%walk.frames.length]!;
    const f=tex.get(frame);
    if (!f) return;
    c.drawImage(src,f.cutX,f.cutY,32,48,Math.round(x-16),Math.round(y-47),32,48);
  }
  private background(c: Ctx, name: Exclude<keyof typeof ENDING_ART, 'seated'>): boolean {
    const key = ENDING_ART[name].key;
    if (!this.scene.textures.exists(key)) return false;
    c.drawImage(this.scene.textures.get(key).getSourceImage() as HTMLImageElement, 0, 0, W, H);
    return true;
  }
  private relic(c: Ctx): void {
    // The same inspectable engraving stays at the existing gameplay coordinate.
    polygon(c,'#39363f',[[415,259],[460,259],[475,264],[430,268]]);
    polygon(c,'#77716c',[[419,255],[458,255],[458,263],[419,262]]);
    polygon(c,'#555157',[[458,255],[466,255],[466,261],[458,263]]);
    polygon(c,'#aca08c',[[423,252],[461,252],[466,255],[419,255]]);
    polygon(c,'#9b907f',[[423,209],[427,207],[455,207],[457,211],[457,252],[451,255],[425,253],[423,249]]);
    polygon(c,'#716b65',[[455,207],[461,210],[461,253],[453,255],[456,246],[456,215]]);
    polygon(c,'#b5a68e',[[423,209],[427,207],[455,207],[457,210],[427,211],[425,247],[423,249]]);
    polygon(c,'#a69a86',[[428,214],[435,212],[440,214],[438,220],[428,222]]);
    polygon(c,'#8b8276',[[447,241],[455,237],[455,249],[449,252],[443,248]]);
    polygon(c,'#afa18a',[[425,241],[432,245],[437,251],[428,251],[425,248]]);
    // A chipped stone fragment, not a smooth block cap.
    polygon(c,'#aa9a83',[[427,205],[430,200],[434,201],[437,195],[443,196],[446,199],[451,198],[456,205]]);
    polygon(c,'#c3b196',[[431,200],[437,195],[443,196],[445,199],[438,198],[435,202]]);
    polygon(c,'#81796e',[[446,200],[451,198],[456,205],[444,205]]);
    rect(c,'#c5b499',426,208,27,1);rect(c,'#71675f',429,203,3,1);
    // Recessed bronze medallion, with a dark cut for the familiar broken ring.
    polygon(c,'#6c6259',[[431,220],[450,220],[453,224],[453,243],[449,247],[432,247],[429,243],[429,224]]);
    polygon(c,'#b2a089',[[430,220],[450,220],[452,222],[432,222],[431,243],[429,243],[429,224]]);
    for(let y=-10;y<=10;y++)for(let x=-10;x<=10;x++){
      const r=x*x+y*y;
      if(r<=100)rect(c,r>81?'#6b5746':x+y<-4?'#a88d60':x+y>6?'#80674e':'#937b56',442+x,233+y,1,1);
    }
    emblem(c,442,233,7,'#4f4b44');
    // Sparse stone chips and seams stay grouped around weathered edges.
    for(const [x,y] of [[425,216],[426,228],[425,239],[428,250],[452,214],[454,244],[445,251]]){
      rect(c,'#82786c',x!,y!,2,1);rect(c,'#b8a98e',x!,y!+1,1,1);
    }
    rect(c,'#c0ae91',420,256,34,1);rect(c,'#5b5553',422,260,9,1);rect(c,'#8a8072',441,259,9,1);
  }
  private seated(c: Ctx, actor: 'C01' | 'C02', x: number, y: number, ms: number): void {
    if (!this.scene.textures.exists(ENDING_ART.seated.key)) return;
    const source = this.scene.textures.get(ENDING_ART.seated.key).getSourceImage() as HTMLImageElement;
    const idle = [0, 1, 0, 2][Math.floor(ms / (1000 / SEATED_FRAME.fps)) % 4]!;
    const frame = (actor === 'C01' ? 0 : 3) + idle;
    c.drawImage(source, frame * SEATED_FRAME.width, 0, SEATED_FRAME.width, SEATED_FRAME.height,
      Math.round(x - SEATED_FRAME.pivotX), Math.round(y - SEATED_FRAME.pivotY), SEATED_FRAME.width, SEATED_FRAME.height);
  }
}
