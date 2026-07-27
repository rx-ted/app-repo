import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SearchController } from '@platform-api/modules/search/search.controller';
import TagsController from '@platform-api/modules/tags/tags.controller';
import CategoryController from '@platform-api/modules/category/category.controller';

describe('E2E: SearchController', () => {
  const mockSearchService = {
    search: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /search', () => {
    it('should return search results for a query', async () => {
      const controller = new SearchController(mockSearchService as any);
      mockSearchService.search.mockResolvedValue({
        items: [{ id: 'p1', title: 'JavaScript Guide', slug: 'js-guide', type: 'post' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await controller.search('javascript', 'posts', '10', '0');
      expect(result.items).toHaveLength(1);
    });

    it('should return empty results for non-matching query', async () => {
      const controller = new SearchController(mockSearchService as any);
      mockSearchService.search.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const result = await controller.search('xyznonexistent', 'posts', '10', '0');
      expect(result.items).toHaveLength(0);
    });

    it('should handle search service unavailable', async () => {
      const controller = new SearchController(mockSearchService as any);
      mockSearchService.search.mockRejectedValue(new Error('Search service unavailable'));

      await expect(controller.search('test', 'posts', '10', '0')).rejects.toThrow(
        'Search service unavailable',
      );
    });
  });
});

describe('E2E: TagsController', () => {
  const mockTagsService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mockPermissionRequestService = { create: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /tags', () => {
    it('should return all tags', async () => {
      const controller = new TagsController(mockTagsService as any, mockPermissionRequestService as any);
      mockTagsService.findAll.mockResolvedValue([
        { id: 't1', name: 'javascript', postCount: 10 },
        { id: 't2', name: 'typescript', postCount: 8 },
      ]);

      const result = await controller.list();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no tags exist', async () => {
      const controller = new TagsController(mockTagsService as any, mockPermissionRequestService as any);
      mockTagsService.findAll.mockResolvedValue([]);

      const result = await controller.list();
      expect(result).toHaveLength(0);
    });
  });

  describe('POST /tags', () => {
    it('should create a new tag', async () => {
      const controller = new TagsController(mockTagsService as any, mockPermissionRequestService as any);
      mockTagsService.create.mockResolvedValue({ id: 't4', name: 'go' });

      const result = await controller.create({ name: 'go' }, { username: 'admin', permissions: ['tags:approve'] });
      expect(result.name).toBe('go');
    });

    it('should throw when creating duplicate tag', async () => {
      const controller = new TagsController(mockTagsService as any, mockPermissionRequestService as any);
      mockTagsService.create.mockRejectedValue(new Error('Tag already exists'));

      await expect(controller.create({ name: 'javascript' }, { username: 'admin', permissions: ['tags:approve'] })).rejects.toThrow(
        'Tag already exists',
      );
    });
  });

  describe('DELETE /tags/:name', () => {
    const mockUser = { userId: 'admin-id', roles: ['admin'], username: 'admin', permissions: ['tags:delete'] };

    it('should delete a tag', async () => {
      const controller = new TagsController(mockTagsService as any, mockPermissionRequestService as any);
      mockTagsService.delete.mockResolvedValue(true);

      const result = await controller.delete('obsolete-tag', mockUser);
      expect(result.affectedRows).toBe(1);
    });

    it('should throw when deleting non-existent tag', async () => {
      const controller = new TagsController(mockTagsService as any, mockPermissionRequestService as any);
      mockTagsService.delete.mockRejectedValue(new Error('Tag not found'));

      await expect(controller.delete('nonexistent', mockUser)).rejects.toThrow('Tag not found');
    });
  });
});

describe('E2E: CategoryController', () => {
  const mockCategoryService = {
    list: vi.fn(),
    create: vi.fn(),
  };
  const mockPermissionRequestService = { create: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /categories', () => {
    it('should return all categories', async () => {
      const controller = new CategoryController(mockCategoryService as any, mockPermissionRequestService as any);
      mockCategoryService.list.mockResolvedValue([
        { id: 'cat1', name: 'Tech', postCount: 15 },
        { id: 'cat2', name: 'Design', postCount: 8 },
      ]);

      const result = await controller.list();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no categories', async () => {
      const controller = new CategoryController(mockCategoryService as any, mockPermissionRequestService as any);
      mockCategoryService.list.mockResolvedValue([]);

      const result = await controller.list();
      expect(result).toHaveLength(0);
    });
  });

  describe('POST /categories', () => {
    it('should create a new category', async () => {
      const controller = new CategoryController(mockCategoryService as any, mockPermissionRequestService as any);
      mockCategoryService.create.mockResolvedValue({ id: 'cat3', name: 'DevOps' });

      const result = await controller.create({ name: 'DevOps' }, { username: 'admin', permissions: ['category:approve'] });
      expect(result.name).toBe('DevOps');
    });

    it('should throw when creating duplicate category', async () => {
      const controller = new CategoryController(mockCategoryService as any, mockPermissionRequestService as any);
      mockCategoryService.create.mockRejectedValue(new Error('Category already exists'));

      await expect(controller.create({ name: 'Tech' }, { username: 'admin', permissions: ['category:approve'] })).rejects.toThrow('Category already exists');
    });
  });
});
