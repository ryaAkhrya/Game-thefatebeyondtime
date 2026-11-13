import Phaser from 'phaser';
import { Ui, TYPE, type TextOpts } from '../../ui/kit/ui';
import { wrapMeasured } from '../../ui/components/DialogueBox';
import { containImage } from './CinematicSequencer';
import type { PersonalMemory, AnniversaryContent } from './memorySchema';

/** Fit exact user text by measured wrapping and, only when needed, a modest font reduction. Never truncate it. */
function copy(ui: Ui, x: number, y: number, text: string, width: number, height: number, size: number, opts: TextOpts = {}): Phaser.GameObjects.Text {
  let current = size;
  for (;;) {
    const t = ui.text(x, y, wrapMeasured(text, width, current).join('\n'), { size: current, originX: 0.5, align: 'center', depth: 10, ...opts });
    if (t.height <= ui.u(height) || current <= 11) return t;
    t.destroy(); current -= 0.5;
  }
}
export function drawPersonalMemory(ui: Ui, memory: PersonalMemory, textureKey: string): { objects: Phaser.GameObjects.Components.Alpha[]; photo?: Phaser.GameObjects.Image } {
  const objects: Phaser.GameObjects.Components.Alpha[] = [];
  let photo: Phaser.GameObjects.Image | undefined;
  if (ui.scene.textures.exists(textureKey)) {
    const src = ui.scene.textures.get(textureKey).getSourceImage() as HTMLImageElement;
    const fit = containImage(src.width, src.height, ui.u(686), ui.u(250));
    ui.scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    photo = ui.scene.add.image(ui.u(ui.dw / 2), ui.u(215), textureKey).setDisplaySize(fit.width, fit.height).setDepth(2);
    objects.push(photo);
  }
  const metadata = [memory.group, memory.date].filter(Boolean).join('  ·  ');
  if (metadata) objects.push(copy(ui, ui.dw / 2, 24, metadata, 700, 56, TYPE.small));
  objects.push(copy(ui, ui.dw / 2, 355, memory.caption, 700, 70, TYPE.dialogue));
  if (memory.note) objects.push(copy(ui, ui.dw / 2, 435, memory.note, 700, 55, TYPE.small));
  return { objects, photo };
}
export function drawAnniversaryMessage(ui: Ui, message: AnniversaryContent['message'], index: number): Phaser.GameObjects.Components.Alpha[] {
  const objects: Phaser.GameObjects.Components.Alpha[] = [copy(ui, ui.dw / 2, 182, message.paragraphs[index]!, 620, 205, TYPE.dialogue + 1, { align: 'left', leading: 8 })];
  if (index === message.paragraphs.length - 1) objects.push(copy(ui, ui.dw / 2 + 310, 405, `— ${message.signature}`, 620, 62, TYPE.heading, { originX: 1, align: 'right' }));
  return objects;
}
