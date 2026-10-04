import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sendOtpEmail } from '@/lib/mailer';
import { SUPPORT_EMAIL } from '@/lib/support';

export async function POST(req: NextRequest) {
  try {
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
    const hasImage = imageBase64 && typeof imageBase64 === 'string' && imageBase64.length > 0;
    // Strip data URI prefix if present (e.g. "data:image/png;base64,...")
    const rawBase64 = hasImage ? imageBase64.replace(/^data:[^;]+;base64,/, '') : null;
    const mimeType = hasImage && imageBase64.startsWith('data:')
      ? imageBase64.split(';')[0].replace('data:', '')
      : 'image/png';
    const attachFilename = imageName || `screenshot-${Date.now()}.png`;

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
            <p><strong>Kategori:</strong> ${cleanCategory}</p>
            <p><strong>Email Pelapor:</strong> ${cleanEmail || 'Tidak disertakan'}</p>
            <p><strong>Halaman:</strong> <a href="${cleanUrl}">${cleanUrl}</a></p>
            <p><strong>Perangkat / Browser:</strong> <code>${userAgent}</code></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
            <h3>Deskripsi Masalah:</h3>
            <blockquote style="background: #f8fafc; padding: 12px; border-left: 4px solid #c96442; margin: 0;">
              ${cleanDesc.replace(/\n/g, '<br/>')}
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
