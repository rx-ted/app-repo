const zhCN = {
  saveArticle: '保存文章',
  title: '标题',
  titlePlaceholder: '自动读取一级标题，可手动修改',
  coverImage: '封面图',
  tags: '标签',
  categories: '分类',
  status: '状态',
  'status.draft': '草稿',
  'status.published': '发布',
  'status.archived': '归档',
  visibility: '可见性',
  'visibility.public': '公开',
  'visibility.private': '私密',
  'visibility.password': '密码',
  allowComment: '允许评论',
  isPinned: '置顶文章',
  featuredWeight: '精选权重',
  'featuredWeight.0': '0 - 默认',
  'featuredWeight.1': '1 - 轻推荐',
  'featuredWeight.2': '2 - 推荐',
  'featuredWeight.3': '3 - 强推荐',
  'featuredWeight.4': '4 - 高推荐',
  'featuredWeight.5': '5 - 置顶精选',
  cancel: '取消',
  confirmSave: '确认保存',
} as const;

export type MessageSchema = typeof zhCN;

export default zhCN;
