import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBytes(b: any): Uint8Array {
  return new Uint8Array(b.buffer || b, b.byteOffset || 0, b.byteLength || b.length);
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

    const parts: Uint8Array[] = [];
    for await (const chunk of req) {
      parts.push(toBytes(chunk));
    }

    const total = parts.reduce((s, p) => s + p.length, 0);
    const body = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
      body.set(p, offset);
      offset += p.length;
    }

    if (body.length === 0) {
      return res.status(400).json({ error: 'Empty body' });
    }

    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const blob = await put(filename, Buffer.from(body), {
      access: 'public',
      contentType,
    });

    return res.status(200).json({
      url: blob.url,
      size: body.length,
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
