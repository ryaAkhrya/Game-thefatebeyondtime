// Palet per area. Satu tempat, dipakai generator dan lembar uji. Setiap ramp: indeks 0 = garis tepi/bayangan terdalam.
import { ramp, solid } from './pixelkit.mjs';

/** Hutan 1 + Tepi Hutan: hijau lumut hangat, cahaya kuning dari kiri-atas, tanah cokelat madu. ~58 warna total. */
export function forest1Palette() {
  return {
    name: 'forest1',
    leaf: ramp('f1.leaf', ['#0f2219', '#17372a', '#234d3a', '#33683f', '#4b8546', '#70a753']),
    pine: ramp('f1.pine', ['#0b1d1c', '#15332c', '#21473a', '#31604a', '#497b58', '#6e9b69']),
    leafBright: ramp('f1.leafBright', ['#16301d', '#2d5f38', '#4a8742', '#76ad4c', '#a0cc5e', '#c8e684']),
    wood: ramp('f1.wood', ['#1d1411', '#3a2820', '#573a2b', '#79553a', '#9b7650']),
    bark2: ramp('f1.bark2', ['#26262b', '#6d6a66', '#9a968c', '#c5c1b2', '#e6e2d3']),
    moss: ramp('f1.moss', ['#2f5a33', '#3f7040', '#5b9048', '#86b85a']),
    stone: ramp('f1.stone', ['#1f2028', '#3a3d4b', '#5a606d', '#80878f', '#a9afad']),
    berry: ramp('f1.berry', ['#4a1e2e', '#8f3a48', '#c25a5c']),
    grass: ramp('f1.grass', ['#1b3425', '#244330', '#2d543a', '#38653d', '#467a44', '#589050', '#72a85c']),
    dirt: ramp('f1.dirt', ['#2e2119', '#45322a', '#5f4634', '#7a5d40', '#957650', '#b09468']),
    water: ramp('f1.water', ['#2c3a46', '#46606c', '#6f929e', '#a3c0c4']),
    iron: ramp('f1.iron', ['#1c1c24', '#3c3d4a', '#6a6c7a', '#9a9cab']),
    steel: ramp('f1.steel', ['#2a2d3a', '#565b70', '#8c93aa', '#c3c9d9', '#eef0f6']),
    white: solid('f1.white', '#ece6d0'),
    yellow: solid('f1.yellow', '#e2c050'),
    violet: solid('f1.violet', '#9279bd'),
    pink: solid('f1.pink', '#cf7f95'),
    litter: ramp('f1.litter', ['#7b3f2a', '#a8552f', '#c48a3d']),
    rope: ramp('f1.rope', ['#5c4a2c', '#8d7747', '#b9a066']),
    gold: solid('f1.gold', '#d9b24a'),
    mushCap: ramp('f1.mushcap', ['#5a2b22', '#8e4733', '#b9694a', '#d99d77']),
    mushStem: ramp('f1.mushstem', ['#7b6f58', '#b4a88c', '#ddd2b6']),
    thorn: solid('f1.thorn', '#b7a56e'),
  };
}

/** Hutan 2: lebih tua dan sunyi. Hijau kebiruan teduh, kulit kayu abu-cokelat dingin, batu berlumut kebiruan, kabut pucat. */
export function forest2Palette() {
  return {
    name: 'forest2',
    leaf: ramp('f2.leaf', ['#0e1f22', '#183a38', '#265650', '#3a7365', '#58906f', '#82ae7e']),
    leafWarm: ramp('f2.leafWarm', ['#262a1e', '#3f4528', '#5f6334', '#84803e', '#a09c56', '#bab57a']),
    wood: ramp('f2.wood', ['#15121a', '#2e2630', '#4a3d42', '#6b5a58', '#8e7c72']),
    bark2: ramp('f2.bark2', ['#1b1b22', '#4a4d58', '#6f7480', '#9aa0a6', '#c3c8c6']),
    moss: ramp('f2.moss', ['#1f4440', '#2e6254', '#478069', '#74a888']),
    stone: ramp('f2.stone', ['#15191f', '#2b323d', '#475260', '#6a7885', '#92a2a8']),
    grass: ramp('f2.grass', ['#142a2b', '#1c3a38', '#254b44', '#305d50', '#3e7260', '#528a70', '#6fa386']),
    dirt: ramp('f2.dirt', ['#1c1a1d', '#2f2b30', '#463f42', '#625850', '#82756a', '#a39384']),
    water: ramp('f2.water', ['#1e2c38', '#344f5d', '#587c88', '#8fb2b8']),
    mist: ramp('f2.mist', ['#3a5a58', '#5f8a82', '#9bbdb0', '#d2e6d6']),
    iron: ramp('f2.iron', ['#17171e', '#33343f', '#5c5e6c', '#8a8d9b']),
    glow: ramp('f2.glow', ['#3f6d68', '#7fb3a4', '#c7e4cf']), // sinar yang dilukis sebagai bentuk tetap
    frozen: ramp('f2.frozen', ['#6d5a2e', '#b08e3e', '#e0c46a']), // daun yang tertahan di udara
    rune: solid('f2.rune', '#b9d3c0'),
    runeDim: solid('f2.runeDim', '#6f8f86'),
    litter: ramp('f2.litter', ['#4a3a2c', '#6f573a', '#8d7347']),
    mushCap: ramp('f2.mushcap', ['#2b2e45', '#4b5280', '#7a86b5', '#a9b5d9']),
    mushStem: ramp('f2.mushstem', ['#5a5e6a', '#8d93a0', '#c3c8d2']),
    white: solid('f2.white', '#d8e3d4'),
    violet: solid('f2.violet', '#8a84b8'),
    pink: solid('f2.pink', '#a68ab4'),
    yellow: solid('f2.yellow', '#cdc88e'),
    gold: solid('f2.gold', '#b8a45e'),
    rope: ramp('f2.rope', ['#4a4030', '#756a4c', '#9a8e68']),
    steel: ramp('f2.steel', ['#23283a', '#4b5470', '#7d88a6', '#b3bcd2', '#dce2ee']),
    thorn: solid('f2.thorn', '#8f8e72'),
    paper: ramp('f2.paper', ['#6f6a58', '#a8a287', '#d4cfb4']),
    cloth: ramp('f2.cloth', ['#2f3647', '#4a5570', '#6d7a99', '#8f9bb8']),
    berry: ramp('f2.berry', ['#2c2440', '#4a3f70', '#7a6ba8']),
  };
}
