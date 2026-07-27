import { Injectable } from '@rx-ted/packages-honest';
import { envParams } from '@/constants';
import { badRequest } from '@/lib/api-error';

@Injectable()
class UploadService {
  async upload(file: File): Promise<string> {
    const apiKey = envParams.PICX_API_KEY;
    if (!apiKey) throw badRequest('UPLOAD_CONFIG_MISSING', 'PICX_API_KEY not configured');

    const fd = new FormData();
    fd.append('files', file);

    const res = await fetch(envParams.PICX_UPLOAD_URL, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: fd,
    });

    if (!res.ok) {
      const text = await res.text();
      throw badRequest('UPLOAD_FAILED', `picx upload failed (${res.status}): ${text}`);
    }

    const body = (await res.json()) as { code: number; data: Array<{ url: string }> };
    if (body.code !== 200 || !body.data?.[0]) {
      throw badRequest('UPLOAD_UNEXPECTED', 'picx API returned unexpected response');
    }

    return body.data[0].url;
  }
}

export default UploadService;
