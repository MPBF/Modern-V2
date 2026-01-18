declare module 'bidi-js' {
  interface BidiInstance {
    getReorderedString(text: string): string;
    getReorderedIndices(text: string): number[];
  }
  
  function bidiFactory(): BidiInstance;
  export default bidiFactory;
}
