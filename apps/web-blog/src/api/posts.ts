import { api } from './client';

export async function getPostBySlug(slug: string) {
  const { data, error } = await api.GET('/posts/{slug}', {
    params: { path: { slug } },
  });

  if (error) {
    throw error;
  }

  return data;
}
