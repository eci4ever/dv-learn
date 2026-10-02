/** Better Auth owns the URL and token lifetime; this module only renders it. */
export function verificationEmail({
	brand = "DV Learn",
	name,
	url,
	support,
}: {
	brand?: string;
	name: string;
	url: string;
	support?: string;
}) {
	if (!["https:", "http:"].includes(new URL(url).protocol))
		throw new Error("Invalid verification URL");
	const escapeHtml = (value: string) =>
		value.replace(/[&<>"']/g, (character) => {
			const entities: Record<string, string> = {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			};
			return entities[character];
		});
	const greeting = name.trim() ? `Hai ${name.trim()},` : "Hai,";
	const subject = `${brand}: Sahkan alamat e-mel anda`;
	const instruction = `Terima kasih kerana mendaftar di ${brand}. Sahkan alamat e-mel anda untuk mula belajar.`;
	const safety =
		"Jika anda tidak mendaftar akaun ini, abaikan e-mel ini. Jangan kongsi pautan pengesahan ini dengan sesiapa.";
	const expiry =
		"Jika pautan telah tamat tempoh, minta e-mel pengesahan baharu melalui halaman log masuk.";
	return {
		subject,
		text: `${greeting}\n\n${instruction}\n\nSahkan alamat e-mel:\n${url}\n\n${expiry}\n\n${safety}${support ? `\n\nPerlukan bantuan? Hubungi ${support}.` : ""}\n\n${brand}`,
		html: `<!doctype html>
<html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f6f3;color:#172b2a;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Satu langkah lagi untuk mula belajar — sahkan alamat e-mel anda.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f6f3;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #dce5dd;border-radius:16px;">
<tr><td style="padding:28px 24px;border-bottom:1px solid #dce5dd;font-size:20px;font-weight:700;">${escapeHtml(brand)}</td></tr>
<tr><td style="padding:28px 24px;">
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.25;">Sahkan alamat e-mel anda</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">${escapeHtml(instruction)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#234c38" style="border-radius:8px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:16px 24px;border:1px solid #234c38;border-radius:8px;background-color:#234c38;color:#ffffff;font-size:16px;font-weight:700;line-height:1.5;text-decoration:none;">Sahkan alamat e-mel</a></td></tr></table>
<p style="margin:24px 0 8px;font-size:14px;line-height:1.6;color:#53645b;">Butang tidak berfungsi? Salin dan tampal pautan ini ke pelayar anda:</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;overflow-wrap:anywhere;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:#234c38;text-decoration:underline;">${escapeHtml(url)}</a></p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#53645b;">${expiry}</p>
</td></tr><tr><td style="padding:24px;border-top:1px solid #dce5dd;font-size:14px;line-height:1.6;color:#53645b;">
<p style="margin:0;">${escapeHtml(safety)}</p>${support ? `<p style="margin:16px 0 0;">Perlukan bantuan? Hubungi ${escapeHtml(support)}.</p>` : ""}
</td></tr></table></td></tr></table></body></html>`,
	};
}
