/** Kecepatan gerak dunia (murni, dapat diuji tanpa Phaser). */
export const WALK_SPEED = 88; // px/detik (2,75 petak/detik)
/** Lari (Shift): 1,65x. Terasa jelas lebih cepat; collision tetap per langkah 1 px sehingga tidak ada tunneling. */
export const SPRINT_MULT = 1.65;
export const SPRINT_SPEED = WALK_SPEED * SPRINT_MULT;
