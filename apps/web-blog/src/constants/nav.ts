import type { App } from '../theme/app';

type Translate = (
  key: string,
  params?: Record<string, string | number>,
  fallback?: string,
) => string;

export function getNavOptions(t: Translate): App.NavItem[] {
  return [
    {
      label: t('nav.home'),
      path: '/',
      icon: 'streamline-plump-color:book-1',
      description: 'Landing',
    },
    {
      label: t('nav.explore'),
      icon: 'solar:compass-linear',
      children: [
        {
          label: t('nav.posts'),
          path: '/posts',
          icon: 'material-symbols:article',
          description: 'All writing, long-form notes, and archives',
        },
      ],
    },
    {
      label: t('nav.about'),
      path: '/about',
      icon: 'solar:widget-3-linear',
      description: 'System design, conventions, and project structure',
    },
    {
      label: '组件目录',
      path: '/components',
      icon: 'solar:widget-5-linear',
      description: 'All registered components preview',
    },
  ];
}
