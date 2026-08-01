const en = {
  saveArticle: 'Save Article',
  title: 'Title',
  titlePlaceholder: 'Auto-detected from H1, editable',
  coverImage: 'Cover Image',
  tags: 'Tags',
  categories: 'Categories',
  status: 'Status',
  'status.draft': 'Draft',
  'status.published': 'Published',
  'status.archived': 'Archived',
  visibility: 'Visibility',
  'visibility.public': 'Public',
  'visibility.private': 'Private',
  'visibility.password': 'Password',
  allowComment: 'Allow Comments',
  isPinned: 'Pin Post',
  featuredWeight: 'Featured Weight',
  'featuredWeight.0': '0 - Default',
  'featuredWeight.1': '1 - Light',
  'featuredWeight.2': '2 - Normal',
  'featuredWeight.3': '3 - Strong',
  'featuredWeight.4': '4 - High',
  'featuredWeight.5': '5 - Top Featured',
  cancel: 'Cancel',
  confirmSave: 'Confirm Save',
} as const;

export type EnMessageSchema = typeof en;

export default en;
