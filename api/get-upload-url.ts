import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

function collectBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filename = (req.query.filename as string) || `upload-${Date.now()}`;

    const body = await collectBody(req);

    if (body.length === 0) {
      return res.status(400).json({ error: 'Empty body' });
    }

    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const blob = await put(filename, body, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });

    return res.status(200).json({
      url: blob.url,
      size: body.length,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return res.status(500).json({ error: 'Upload failed: ' + (error instanceof Error ? error.message : String(error)) });
  }
}
