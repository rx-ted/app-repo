import { ref } from 'vue';

/** Emoji popover: picks a shortcode and inserts it at the cursor. */
export function useEmoji(opts: { insertBeforeAfter: (before: string, after: string) => void }) {
  const emojiOpen = ref(false);

  function onEmojiSelect(shortcode: string) {
    opts.insertBeforeAfter(`:${shortcode}:`, '');
    emojiOpen.value = false;
  }

  return { emojiOpen, onEmojiSelect };
}
