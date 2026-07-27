export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve();
}

export function getCommentLink(postSlug: string, commentId: number): string {
  const base = window.location.origin;
  return `${base}/posts/${postSlug}#comment-${commentId}`;
}

export function shareToSocial(
  platform: 'twitter' | 'weibo' | 'copy',
  url: string,
  text: string,
): void {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  switch (platform) {
    case 'twitter': {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
      break;
    }
    case 'weibo': {
      const weiboUrl = `https://service.weibo.com/share/share.php?title=${encodedText}&url=${encodedUrl}`;
      window.open(weiboUrl, '_blank', 'noopener,noreferrer');
      break;
    }
    case 'copy':
      copyToClipboard(url);
      break;
  }
}

export function parseMentions(content: string): string[] {
  // const regex = /@(\w+)/g;
  // const mentions: string[] = [];
  // let match = regex.exec(content);
  // while (match !== null) {
  //   if (!mentions.includes(match[1])) {
  //     mentions.push(match[1]);
  //   }
  //   match = regex.exec(content);
  // }
  // return mentions;
  const seen = new Set<string>();
  return [...content.matchAll(/@(\w+)/g)]
    .map((m) => m[1])
    .filter((m) => {
      if (seen.has(m)) return false;
      seen.add(m);
      return true;
    });
}

export function highlightMentions(content: string): string {
  return content.replace(/@(\w+)/g, '<span class="mention-highlight">@$1</span>');
}

export function canEdit(createdAt: string, minutes = 5): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < minutes * 60 * 1000;
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}
