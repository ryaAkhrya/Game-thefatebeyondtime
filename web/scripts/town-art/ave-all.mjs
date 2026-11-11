import { avHome1 } from './ave-sprites.mjs';
import * as B from './ave-buildings.mjs';
import * as P from './ave-props.mjs';
export function aveFrames() {
  const door = B.avPalaceDoor(false), doorOpen = B.avPalaceDoor(true);
  door.pivot = { x: 0.5, y: 56 / 57 }; doorOpen.pivot = { x: 0.5, y: 56 / 57 };
  const list = [avHome1(), B.avHome2(), B.avInn(), B.avArchive(), B.avWall('ave_wall_w', 5, 120), B.avWall('ave_wall_e', 9, 300), B.avGatehouse(), B.avPortcullis(), B.avTower(), B.avBell(), B.avPalaceFacade(), door, doorOpen,
    P.avTreeRound(), P.avTreeTall(), P.avOak(), P.avBush(), P.avHedgeBed(), P.avPlanter(), P.avBench(), P.avLamp(), P.avSignpost(), P.avRoadsign(), P.avWell(), P.avStallBack(), P.avStallFront(), P.avProduce(), P.avCratesStack(), P.avBarrel(), P.avSacks(), P.avCart(),
    P.avDesk(80, 'ave_desk80', 3), P.avDesk(40, 'ave_desk40', 5), P.avShelf('ave_shelf_a', 'books', 4), P.avShelf('ave_shelf_b', 'scroll', 9), P.avCouncilTable(), P.avChair()];
  return list;
}
