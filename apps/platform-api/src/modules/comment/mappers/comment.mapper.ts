import type { CommentEntity } from '@/modules/comment/entities/comment.entity';

export class CommentMapper {
  static toResponse(entity: CommentEntity) {
    return { ...entity };
  }

  static toMutationResponse(affectedRows: number) {
    return { affectedRows, rows: [] };
  }
}

export default CommentMapper;
