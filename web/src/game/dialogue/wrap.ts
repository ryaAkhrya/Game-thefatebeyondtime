/**
 * Word-wrap untuk font monospace (Press Start 2P: 8 px per karakter). Deterministik dan teruji,
 * sehingga teks tidak pernah terpotong atau melewati kotak dialog.
 */
export function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (let word of words) {
      while (word.length > maxChars) {
        // kata yang lebih panjang dari satu baris dipecah
        if (line) {
          out.push(line);
          line = '';
        }
        out.push(word.slice(0, maxChars));
        word = word.slice(maxChars);
      }
      if (!line) line = word;
      else if (line.length + 1 + word.length <= maxChars) line += ' ' + word;
      else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

/** Memecah baris-baris hasil wrap menjadi halaman berisi paling banyak `linesPerPage` baris. */
export function paginate(lines: readonly string[], linesPerPage: number): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
  return pages.length > 0 ? pages : [['']];
}
