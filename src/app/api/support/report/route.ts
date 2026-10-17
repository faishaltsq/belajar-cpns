import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendOtpEmail } from '@/lib/mailer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { escapeHtml } from '@/lib/sanitize';
import { SUPPORT_EMAIL } from '@/lib/support';

const ALLOWED_IMAGE_TYPES: Record<string, true> = {
  'image/png': true,
  'image/jpeg': true,
  'image/gif': true,
  'image/webp': true,
};
const ATTACHMENT_FILENAME_RE = /^[A-Za-z0-9._-]{1,80}$/;

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit(`support-report:${ip}`, 5, 300);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Terlalu banyak laporan terkirim. Coba lagi dalam ${rl.retryAfterSeconds} detik.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const { category, description, userEmail, pageUrl, deviceInfo, imageBase64, imageName } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Deskripsi kendala wajib diisi.' },
        { status: 400 }
      );
    }

    // Validate image size (max 2MB base64 ≈ ~2.7MB string)
    if (imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 3_000_000) {
      return NextResponse.json(
        { error: 'Ukuran gambar terlalu besar. Maks 2MB.' },
        { status: 400 }
      );
    }

    const hasImage = imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 0;

    // Strip data URI prefix if present (e.g. "data:image/png;base64,...")
    const rawBase64 = hasImage ? imageBase64.replace(/^data:[^;]+;base64,/, '') : null;

    let mimeType = 'image/png';
    if (hasImage && imageBase64.startsWith('data:')) {
      const declared = imageBase64.slice(5).split(';')[0].trim().toLowerCase();
      if (ALLOWED_IMAGE_TYPES[declared] !== true) {
        return NextResponse.json(
          { error: 'Format gambar tidak didukung. Gunakan PNG, JPEG, GIF, atau WebP.' },
          { status: 400 }
        );
      }
      mimeType = declared;
    }

    if (imageName != null && imageName !== '' && (typeof imageName !== 'string' || !ATTACHMENT_FILENAME_RE.test(imageName))) {
      return NextResponse.json(
        { error: 'Nama file lampiran tidak valid.' },
        { status: 400 }
      );
    }

    const cleanCategory = (category && typeof category === 'string') ? category.trim() : 'Lainnya';
    const cleanDesc = description.trim();
    const cleanEmail = (userEmail && typeof userEmail === 'string') ? userEmail.trim().toLowerCase() : null;
    const cleanUrl = pageUrl || req.headers.get('referer') || '';
    const userAgent = deviceInfo || req.headers.get('user-agent') || '';

    // 1. Simpan laporan ke DB jika DB tersedia
    const sql = getDb();
    let reportId: number | null = null;
    if (sql) {
      try {
        const rows = await sql`
          INSERT INTO issue_reports (
            user_email, category, description, page_url, device_info, status
          ) VALUES (
            ${cleanEmail}, ${cleanCategory}, ${cleanDesc}, ${cleanUrl}, ${userAgent}, 'open'
          )
          RETURNING id
        `;
        if (rows.length > 0) reportId = rows[0].id;
      } catch (dbErr) {
        console.warn('[support] DB save skipped or table not ready:', dbErr);
      }
    }

    // 2. Kirim notifikasi email ke halo.lolosin.support@gmail.com jika SMTP/Resend aktif
    const attachFilename = imageName || `screenshot-${Date.now()}.png`;

    const safeCategory = escapeHtml(cleanCategory);
    const safeEmail = escapeHtml(cleanEmail || 'Tidak disertakan');
    const safeUrl = escapeHtml(cleanUrl);
    const safeAgent = escapeHtml(userAgent);
    const safeDesc = escapeHtml(cleanDesc).replace(/\n/g, '<br/>');

    const imageHtml = hasImage
      ? `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>
         <h3 style="margin:0 0 8px;">Screenshot Lampiran:</h3>
         <img src="cid:screenshot@lolosin" alt="Screenshot" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" />`
      : '';

    try {
      await sendOtpEmail({
        to: SUPPORT_EMAIL,
        subject: `[Bug Report #${reportId || 'NEW'}] ${cleanCategory} - ${cleanEmail || 'Anonim'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #c96442; margin-top: 0;">Laporan Kendala Baru (#${reportId || 'N/A'})</h2>
            <p><strong>Kategori:</strong> ${safeCategory}</p>
            <p><strong>Email Pelapor:</strong> ${safeEmail}</p>
            <p><strong>Halaman:</strong> <a href="${safeUrl}">${safeUrl}</a></p>
            <p><strong>Perangkat / Browser:</strong> <code>${safeAgent}</code></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <h3>Deskripsi Masalah:</h3>
            <blockquote style="background: #f8fafc; padding: 12px; border-left: 4px solid #c96442; margin: 0;">
              ${safeDesc}
            </blockquote>
            ${imageHtml}
          </div>
        `,
        attachments: rawBase64
          ? [{
              filename: attachFilename,
              content: rawBase64,
              encoding: 'base64' as const,
              contentType: mimeType,
              cid: 'screenshot@lolosin',
            }]
          : undefined,
      });
    } catch (mailErr) {
      console.warn('[support] Email notification failed (non-blocking):', mailErr);
    }

    return NextResponse.json({
      success: true,
      reportId,
      message: 'Laporan berhasil diterima tim dukungan Lolos.in.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[support] Error handling issue report:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
