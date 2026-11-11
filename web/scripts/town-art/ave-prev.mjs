import { avHome1 } from './ave-sprites.mjs';
import * as B from './ave-buildings.mjs';
export function allSprites() { return [avHome1(), B.avHome2(), B.avInn(), B.avArchive(), B.avGatehouse(), B.avPortcullis(), B.avTower(), B.avBell(), B.avPalaceFacade(), B.avPalaceDoor(false), B.avPalaceDoor(true), B.avWall('w', 5, 120)]; }
