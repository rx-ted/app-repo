import { http, HttpError } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { TaxonomyItemVO } from '@/types/community';
import { API, ERRORS } from '@/constants';

export async function fetchTags(limit = 100, noCache = false): Promise<TaxonomyItemVO[]> {
  try {
    const response = await http.get<ApiResponse<{ data: TaxonomyItemVO[]; total: number }>>(
      API.TAGS_LIST,
      {
        query: { page: 1, pageSize: limit },
        cache: !noCache,
      },
    );
    return response.data.data;
  } catch (cause) {
    throw new Error(
      cause instanceof HttpError
        ? (cause.userMessage ?? ERRORS.LOAD_TAGS_FAILED)
        : ERRORS.LOAD_TAGS_FAILED,
    );
  }
}

export async function fetchCategories(noCache = false): Promise<TaxonomyItemVO[]> {
  try {
    const response = await http.get<ApiResponse<TaxonomyItemVO[]>>(API.CATEGORIES_LIST, {
      cache: !noCache,
    });
    const items = Array.isArray(response) ? response : response?.data;
    return Array.isArray(items) ? items : [];
  } catch (cause) {
    throw new Error(
      cause instanceof HttpError
        ? (cause.userMessage ?? ERRORS.LOAD_CATEGORIES_FAILED)
        : ERRORS.LOAD_CATEGORIES_FAILED,
    );
  }
}
