import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { awb } = await request.json();
    if (!awb) {
      return NextResponse.json({ status: 'error', message: 'AWB tidak boleh kosong.' }, { status: 400 });
    }

    const cleanAwb = awb.trim();

    // Call Anteraja public tracking API
    const response = await fetch('https://api.anteraja.id/order/tracking', {
      method: 'POST',
      headers: {
        'mv': '1.2',
        'source': 'aca_android',
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'okhttp/3.10.0',
      },
      body: JSON.stringify([{ codes: cleanAwb }]),
    });

    if (!response.ok) {
      return NextResponse.json({ status: 'error', message: `Gagal memanggil API Anteraja (Status: ${response.status})` }, { status: response.status });
    }

    const data = await response.json();
    if (data.status !== 200 || !data.content || data.content.length === 0) {
      return NextResponse.json({ status: 'error', message: data.info || 'AWB tidak ditemukan atau gagal dilacak.' }, { status: 400 });
    }

    const trackingResult = data.content[0];
    if (!trackingResult || !trackingResult.history) {
      return NextResponse.json({ status: 'error', message: 'Detail tracking tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: {
        awb: trackingResult.awb,
        detail: trackingResult.detail,
        history: trackingResult.history
      }
    });

  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
