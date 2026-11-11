import { ramp } from './kit.mjs';
import { H } from './pixel.mjs';

/** Palet Aveloria (~34 warna): batu pucat, genteng slate, plum dalam, kayu, rumput dingin. Tanpa emas.
 * Cahaya dari kiri-atas; bayangan jatuh ke kanan-bawah dan dingin-keunguan. */
export const AV = {
  stone: ramp('#4b4a57', '#6d6d77', '#908f93', '#b4b1aa', '#d4cfc0', '#ece6d4'),
  slate: ramp('#272b3b', '#363c52', '#4a5270', '#616d8b', '#8190aa'),
  plum: ramp('#2a1a38', '#3b2a4a', '#52396a', '#6e5088', '#8e72a6'),
  wood: ramp('#2a1d19', '#43302a', '#624636', '#85603f', '#a98355'),
  grass: ramp('#243a2e', '#2f4d39', '#40684a', '#58854f', '#7ca862'),
  pave: ramp('#55535a', '#6c6a6e', '#85827f', '#9d9889', '#b6af9b'),
  earth: ramp('#4e3b2f', '#69503b', '#876a49', '#a48a5f'),
  water: ramp('#2b475a', '#41697f', '#6a9bab', '#a9cfd2'),
  teal: ramp('#2c4a48', '#3f6560', '#5b8a80', '#86b3a4'),
  iron: ramp('#23252f', '#3d404e', '#6a6e7e', '#9296a6'),
  bronze: ramp('#6b4c2c', '#98703b', '#c89a58', '#e2c283'),
  glass: [H('#1f2a3c'), H('#33465e'), H('#7d9bb3')],
  cream: H('#ddd2b9'), linen: H('#e4dac3'), rose: H('#c97b84'), lime: H('#a9b86a'),
  tomato: H('#b04a3c'), squash: H('#c98b3c'), leaf: H('#6f9a4e'), bottle: H('#5d9a96'),
  shadow: H('#231d33'),
};
