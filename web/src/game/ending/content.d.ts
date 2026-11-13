declare module 'virtual:ending-content' {
  const content: { version: 1; memories: import('./memorySchema').PersonalMemory[]; message: { paragraphs: string[]; signature: string } } | null;
  export default content;
}
