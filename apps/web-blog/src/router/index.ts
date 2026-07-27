import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
    meta: {
      layout: 'full',
      title: '首页',
      regions: {
        aside: {
          left: {
            show: false,
            components: [],
          },
          right: {
            show: true,
            components: [
              'network-card',
              'trending',
              'calendar-widget',
              'category-list',
              'tag-list',
              'ad-banner',
            ],
          },
        },
        content: {
          before: {
            show: true,
            components: ['hero-section'],
          },
          after: {
            show: true,
            components: ['ad-banner'],
          },
        },
      },
    },
  },
  {
    path: '/posts',
    name: 'posts',
    component: () => import('@/pages/PostListPage.vue'),
    meta: {
      layout: 'full',
      title: '文章列表',
      regions: {
        aside: {
          left: { show: false, components: [] },
          right: { show: true, components: ['category-list', 'tag-list'] },
        },
        content: {
          before: { show: false, components: [] },
          after: { show: false, components: [] },
        },
      },
    },
  },
  {
    path: '/posts/:slug',
    name: 'post-detail',
    component: () => import('@/pages/PostDetailPage.vue'),
    meta: {
      layout: 'doc',
      title: '文章详情',
      regions: {
        aside: {
          left: {
            show: true,
            components: ['recommended-reading'],
          },
          right: {
            show: true,
            components: ['toc'],
          },
        },
        content: {
          before: {
            show: true,
            components: ['author-card'],
          },
          after: {
            show: true,
            components: ['share-tools', 'donate', 'prev-next', 'comments'],
          },
        },
      },
    },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { layout: 'simple', title: '登录' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { layout: 'simple', title: '注册' },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPasswordPage.vue'),
    meta: { layout: 'simple', title: '找回密码' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/pages/ProfilePage.vue'),
    meta: {
      layout: 'simple',
      auth: true,
      title: '个人资料',
    },
  },
  {
    path: '/authors/:username',
    name: 'author',
    component: () => import('@/pages/AuthorPage.vue'),
    meta: {
      layout: 'full',
      title: '作者',
      regions: {
        aside: {
          right: { components: ['network-card'] },
        },
      },
    },
  },
  {
    path: '/author/:username',
    redirect: (_route) => ({ path: `/authors/${_route.params.username}` }),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: {
      layout: 'full',
      auth: true,
      title: '控制台',
      regions: {
        aside: {
          left: { show: true, components: ['recent-posts', 'trending'] },
          right: { components: ['network-card'] },
        },
        content: {
          after: { show: true, components: ['ad-banner'] },
        },
      },
    },
  },
  {
    path: '/dashboard/posts',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard/drafts',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard/categories',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard/tags',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard/settings',
    name: 'dashboard-settings',
    component: () => import('@/pages/dashboard/SettingsPage.vue'),
    meta: { layout: 'full', title: '设置' },
  },
  {
    path: '/editor',
    name: 'editor-create',
    component: () => import('@/pages/EditorPage.vue'),
    meta: { layout: 'simple', title: '写文章' },
  },
  {
    path: '/editor/:slug',
    name: 'editor-edit',
    component: () => import('@/pages/EditorPage.vue'),
    meta: { layout: 'simple', title: '编辑文章' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/pages/SearchPage.vue'),
    meta: {
      layout: 'full',
      title: '搜索',
      regions: {
        aside: {
          right: { components: ['trending'] },
        },
      },
    },
  },
  {
    path: '/taxonomy',
    redirect: '/posts',
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/pages/AboutPage.vue'),
    meta: { layout: 'simple', title: '关于' },
  },
  {
    path: '/components',
    name: 'components',
    component: () => import('@/pages/ComponentsPage.vue'),
    meta: { layout: 'simple', title: '组件目录' },
  },
  {
    path: '/copyright',
    name: 'copyright',
    component: () => import('@/pages/CopyrightPage.vue'),
    meta: { layout: 'full', title: '版权' },
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/pages/TagsPage.vue'),
    meta: { layout: 'simple', title: '标签' },
  },
  {
    path: '/tags/:name',
    name: 'tag-detail',
    component: () => import('@/pages/TagDetailPage.vue'),
    meta: { layout: 'simple', title: '标签详情' },
  },
  {
    path: '/archive',
    name: 'archive',
    component: () => import('@/pages/ArchivePage.vue'),
    meta: { layout: 'simple', title: '归档' },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/pages/CalendarPage.vue'),
    meta: { layout: 'simple', title: '日历' },
  },
  {
    path: '/discover',
    name: 'discover',
    component: () => import('@/pages/DiscoverPage.vue'),
    meta: { layout: 'simple', title: '发现' },
  },
  {
    path: '/guestbook',
    name: 'guestbook',
    component: () => import('@/pages/GuestbookPage.vue'),
    meta: { layout: 'simple', title: '留言板' },
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('@/pages/CategoriesPage.vue'),
    meta: { layout: 'simple', title: '分类' },
  },
  {
    path: '/categories/:name',
    name: 'category-detail',
    component: () => import('@/pages/CategoryDetailPage.vue'),
    meta: { layout: 'simple', title: '分类详情' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { layout: 'simple', title: '404' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, _from, next) => {
  if (to.meta.auth) {
    const session = useSessionStore();
    await session.ready;
    if (!session.isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } });
      return;
    }
  }
  next();
});
