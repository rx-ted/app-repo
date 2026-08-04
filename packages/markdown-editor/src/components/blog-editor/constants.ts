export const END_THRESHOLD = 30;

export const HISTORY_LIMIT = 200;

export const TABLE_MAX_ROWS = 8;

export const TABLE_MAX_COLS = 8;

export interface TocItem {
  id: number;
  text: string;
  depth: number;
  startOffset: number;
  startLine: number;
}

export const INLINE_PAIRS: Record<string, [string, string]> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  strikethrough: ['~~', '~~'],
  underline: ['<u>', '</u>'],
  code: ['`', '`'],
  link: ['[', '](url)'],
  image: ['![', '](url)'],
  highlight: ['==', '=='],
  superscript: ['<sup>', '</sup>'],
  subscript: ['<sub>', '</sub>'],
};

export const BLOCK_PREFIXES: Record<string, string> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  h4: '#### ',
  blockquote: '> ',
  ul: '- ',
  ol: '1. ',
  task: '- [ ] ',
};

export const EMOJIS: { shortcode: string; glyph: string }[] = [
  { shortcode: 'joy', glyph: '😂' },
  { shortcode: 'smile', glyph: '😄' },
  { shortcode: 'laughing', glyph: '😆' },
  { shortcode: 'wink', glyph: '😉' },
  { shortcode: 'blush', glyph: '😊' },
  { shortcode: 'thinking', glyph: '🤔' },
  { shortcode: 'eyes', glyph: '👀' },
  { shortcode: 'heart', glyph: '❤️' },
  { shortcode: 'broken_heart', glyph: '💔' },
  { shortcode: 'fire', glyph: '🔥' },
  { shortcode: 'rocket', glyph: '🚀' },
  { shortcode: 'tada', glyph: '🎉' },
  { shortcode: 'sparkles', glyph: '✨' },
  { shortcode: 'star', glyph: '⭐' },
  { shortcode: 'star2', glyph: '🌟' },
  { shortcode: 'sunny', glyph: '☀️' },
  { shortcode: 'moon', glyph: '🌙' },
  { shortcode: 'cloud', glyph: '☁️' },
  { shortcode: 'rainbow', glyph: '🌈' },
  { shortcode: 'zap', glyph: '⚡' },
  { shortcode: 'boom', glyph: '💥' },
  { shortcode: 'bulb', glyph: '💡' },
  { shortcode: 'warning', glyph: '⚠️' },
  { shortcode: 'question', glyph: '❓' },
  { shortcode: 'exclamation', glyph: '❗' },
  { shortcode: 'white_check_mark', glyph: '✅' },
  { shortcode: 'x', glyph: '❌' },
  { shortcode: '100', glyph: '💯' },
  { shortcode: 'clap', glyph: '👏' },
  { shortcode: '+1', glyph: '👍' },
  { shortcode: '-1', glyph: '👎' },
  { shortcode: 'muscle', glyph: '💪' },
  { shortcode: 'pray', glyph: '🙏' },
  { shortcode: 'point_up', glyph: '☝️' },
  { shortcode: 'writing_hand', glyph: '✍️' },
  { shortcode: 'memo', glyph: '📝' },
  { shortcode: 'pushpin', glyph: '📌' },
  { shortcode: 'bookmark', glyph: '🔖' },
  { shortcode: 'calendar', glyph: '📅' },
  { shortcode: 'clock', glyph: '🕐' },
  { shortcode: 'hourglass', glyph: '⏳' },
  { shortcode: 'computer', glyph: '💻' },
  { shortcode: 'phone', glyph: '📱' },
  { shortcode: 'camera', glyph: '📷' },
  { shortcode: 'briefcase', glyph: '💼' },
  { shortcode: 'link', glyph: '🔗' },
  { shortcode: 'speech_balloon', glyph: '💬' },
  { shortcode: 'thought_balloon', glyph: '💭' },
  { shortcode: 'trophy', glyph: '🏆' },
  { shortcode: 'chart_with_upwards_trend', glyph: '📈' },
  { shortcode: 'bug', glyph: '🐛' },
  { shortcode: 'key', glyph: '🔑' },
  { shortcode: 'lock', glyph: '🔒' },
  { shortcode: 'shield', glyph: '🛡️' },
  { shortcode: 'gear', glyph: '⚙️' },
];

export const MERMAID_TEMPLATES: Record<string, string> = {
  flowchart:
    'flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Do it]\n    B -->|No| D[Wait]',
  sequenceDiagram:
    'sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob\n    B-->>A: Hi Alice',
  classDiagram:
    'classDiagram\n    Animal <|-- Duck\n    Animal : +int age\n    Animal : +isMammal()\n    Duck : +quack()',
  stateDiagram:
    'stateDiagram-v2\n    [*] --> Still\n    Still --> [*]\n    Still --> Moving\n    Moving --> [*]',
  erDiagram: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains',
  gantt:
    'gantt\n    title Project\n    dateFormat  YYYY-MM-DD\n    section Design\n    Task A: 2024-01-01, 7d',
  pie: 'pie title Pets\n    "Dogs" : 42\n    "Cats" : 35\n    "Fish" : 23',
  journey:
    'journey\n    title My day\n    section Morning\n      Wake up: 5: Me\n      Walk: 4: Me',
  gitGraph: 'gitGraph\n    commit\n    branch feature\n    commit\n    checkout main\n    commit',
  mindmap: 'mindmap\n  root((Idea))\n    Sub 1\n    Sub 2',
  timeline: 'timeline\n    title Timeline\n    2023: A\n    2024: B',
};

export const MERMAID_TEMPLATE_KEYS = [
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'gantt',
  'pie',
  'journey',
  'gitGraph',
  'mindmap',
  'timeline',
] as const;

export const THEME_SAMPLE = `# Theme Preview

A paragraph with **bold**, *italic* and \`inline code\`.

\`\`\`ts
const themes = ['light', 'dark'];
console.log(themes.length);
\`\`\`

> Blockquote line.

- list item
- [x] done task

| Name | Value |
| --- | --- |
| Theme | Preview |

### Math

$$E = mc^2$$
`;
