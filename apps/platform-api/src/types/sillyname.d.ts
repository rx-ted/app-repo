declare module 'sillyname' {
  interface SillynameOptions {
    generator?: () => number;
  }
  function generateStupidName(generator?: () => number): string;
  export default generateStupidName;
  export function randomNoun(generator?: () => number): string;
  export function randomAdjective(generator?: () => number): string;
}
