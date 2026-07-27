import { Controller, Injectable, Inject, Ctx, Post, UseGuards } from '@rx-ted/packages-honest';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ROLES } from '@/constants';
import { z } from '@/lib/openapi';
import type { Context } from 'hono';
import UploadService from '@/modules/upload/upload.service';

@Injectable()
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Controller('upload', {
  tag: { name: 'Upload', description: 'File upload' },
})
class UploadController {
  constructor(@Inject(UploadService) private uploadService: UploadService) {}

  @Post('', {
    apiDoc: {
      summary: 'Upload files to CDN',
      tags: ['Upload'],
      request: {
        body: z.any().describe('multipart/form-data with files field'),
      },
      responses: {
        200: {
          description: 'Uploaded CDN URLs',
          schema: z.object({
            code: z.number(),
            data: z.array(z.object({ url: z.string() })),
          }),
        },
      },
    },
  })
  async upload(@Ctx() c: Context) {
    const formData = await c.req.parseBody();
    const fileEntries = Object.values(formData).filter(
      (v): v is File =>
        typeof v === 'object' && v !== null && typeof (v as any).arrayBuffer === 'function',
    );

    if (fileEntries.length === 0) {
      return { code: 400, message: 'No files provided' };
    }

    const urls = await Promise.all(fileEntries.map((file) => this.uploadService.upload(file)));

    return { code: 200, data: urls.map((url) => ({ url })) };
  }
}

export default UploadController;
