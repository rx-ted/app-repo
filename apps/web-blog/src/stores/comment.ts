import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { http, HttpError } from '@/http';
import type { ApiResponse } from '@/http/types';
import type {
  CommentVO,
  CommentPageResult,
  LikeToggleResult,
  AuthorBriefVO,
  CommentSort,
} from '@/types/community';
import { API } from '@/constants';

export const useCommentStore = defineStore('comment', () => {
  const comments = ref<CommentVO[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const loading = ref(false);
  const sort = ref<CommentSort>('newest');
  const postId = ref<number | null>(null);
  const currentTag = ref<string>('post');

  const totalComments = computed(() => total.value);
  const hasMore = computed(() => comments.value.length < total.value);

  async function fetchComments(
    postIdVal?: number,
    tagVal?: string,
    pageNum = 1,
    sortBy?: CommentSort,
  ) {
    const tag = tagVal ?? 'post';
    if (tag === 'post' && postIdVal === undefined) {
      console.warn('fetchComments: postId required when tag=post');
      return;
    }
    if (postIdVal !== undefined) postId.value = postIdVal;
    currentTag.value = tag;
    if (sortBy) sort.value = sortBy;
    if (pageNum === 1) page.value = 1;
    else page.value = pageNum;

    loading.value = true;
    try {
      const query: Record<string, string> = {
        tag,
        page: String(page.value),
        pageSize: String(pageSize.value),
        sort: sort.value,
      };
      if (postIdVal !== undefined) query.postId = String(postIdVal);

      const res = await http.get<ApiResponse<CommentPageResult>>(API.COMMENTS_PAGE, { query });
      const payload = (res.data ?? res) as CommentPageResult;
      const list = payload.data ?? [];
      if (pageNum === 1) {
        comments.value = list;
      } else {
        comments.value = [...comments.value, ...list];
      }
      total.value = payload.total ?? 0;
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchReplies(parentId: number, pageNum = 1): Promise<CommentVO[]> {
    try {
      const res = await http.get<ApiResponse<CommentPageResult>>(API.COMMENTS_REPLY_PAGE, {
        query: {
          parentId: String(parentId),
          page: String(pageNum),
          pageSize: '10',
        },
      });
      const payload = (res.data ?? res) as CommentPageResult;
      return payload.data ?? [];
    } catch {
      return [];
    }
  }

  async function createComment(input: {
    postId?: number;
    tag?: 'post' | 'guestbook' | 'discover' | 'about';
    parentId?: number | null;
    content: string;
    guestName?: string | null;
    guestEmail?: string | null;
    guestWebsite?: string | null;
  }): Promise<boolean> {
    try {
      const tag = input.tag ?? 'post';
      const body: Record<string, unknown> = {
        tag,
        content: input.content,
      };
      if (input.postId !== undefined) body.postId = String(input.postId);
      else if (tag === 'post') {
        console.warn('createComment: postId required when tag=post');
        return false;
      }
      if (input.parentId) body.parentId = String(input.parentId);
      if (input.guestName) body.guestName = input.guestName;
      if (input.guestEmail) body.guestEmail = input.guestEmail;
      if (input.guestWebsite) body.guestWebsite = input.guestWebsite;

      const res = await http.post<ApiResponse<{ id: string }>>(API.COMMENTS_CREATE, body);
      const data = res.data ?? (res as any);
      if (data?.id) {
        await fetchComments(input.postId, tag, 1, sort.value);
        return true;
      }
      return false;
    } catch (err) {
      const detail = err instanceof HttpError ? err.body : err;
      console.error('Failed to create comment:', (err as Error)?.message, detail);
      return false;
    }
  }

  async function editComment(id: number, content: string): Promise<boolean> {
    try {
      await http.put<ApiResponse<unknown>>(API.COMMENTS_EDIT(id), { content });
      // Update locally
      const updateRecursive = (list: CommentVO[]) => {
        for (const c of list) {
          if (c.id === id) {
            c.content = content;
            c.updatedAt = new Date().toISOString();
            return true;
          }
          if (c.replies?.list && updateRecursive(c.replies.list)) return true;
        }
        return false;
      };
      updateRecursive(comments.value);
      return true;
    } catch {
      return false;
    }
  }

  async function deleteComment(id: number): Promise<boolean> {
    try {
      await http.del(API.COMMENTS_DELETE(id));
      // Remove from local state
      const removeRecursive = (list: CommentVO[]): CommentVO[] =>
        list
          .filter((c) => c.id !== id)
          .map((c) => ({
            ...c,
            replies: c.replies
              ? { ...c.replies, list: removeRecursive(c.replies.list) }
              : undefined,
          }));
      comments.value = removeRecursive(comments.value);
      total.value = Math.max(0, total.value - 1);
      return true;
    } catch {
      return false;
    }
  }

  async function toggleLike(commentId: number): Promise<LikeToggleResult | null> {
    // Optimistic update
    const updateLikesRecursive = (list: CommentVO[], id: number): boolean => {
      for (const c of list) {
        if (c.id === id) {
          c.isLiked = !c.isLiked;
          c.likes += c.isLiked ? 1 : -1;
          return true;
        }
        if (c.replies?.list && updateLikesRecursive(c.replies.list, id)) return true;
      }
      return false;
    };

    const prevState = { isLiked: false, likes: 0 };
    // Save previous state
    for (const c of comments.value) {
      if (c.id === commentId) {
        prevState.isLiked = c.isLiked;
        prevState.likes = c.likes;
        break;
      }
      if (c.replies?.list) {
        const found = c.replies.list.find((r) => r.id === commentId);
        if (found) {
          prevState.isLiked = found.isLiked;
          prevState.likes = found.likes;
          break;
        }
      }
    }

    updateLikesRecursive(comments.value, commentId);

    try {
      const res = await http.post<ApiResponse<LikeToggleResult>>(API.COMMENTS_LIKE(commentId));
      const data = res.data ?? (res as any);
      return data;
    } catch {
      // Rollback
      const rollback = (list: CommentVO[], id: number) => {
        for (const c of list) {
          if (c.id === id) {
            c.isLiked = prevState.isLiked;
            c.likes = prevState.likes;
            return;
          }
          if (c.replies?.list) rollback(c.replies.list, id);
        }
      };
      rollback(comments.value, commentId);
      return null;
    }
  }

  async function fetchAuthorBrief(userId: string): Promise<AuthorBriefVO | null> {
    try {
      const res = await http.get<ApiResponse<AuthorBriefVO>>(API.USER_BRIEF(userId));
      const data = res.data ?? (res as any);
      return data;
    } catch {
      return null;
    }
  }

  function setSort(newSort: CommentSort) {
    if (sort.value !== newSort) {
      sort.value = newSort;
      if (postId.value) fetchComments(postId.value, undefined, 1);
    }
  }

  return {
    comments,
    total,
    page,
    pageSize,
    loading,
    sort,
    currentTag,
    totalComments,
    hasMore,
    fetchComments,
    fetchReplies,
    createComment,
    editComment,
    deleteComment,
    toggleLike,
    fetchAuthorBrief,
    setSort,
  };
});
