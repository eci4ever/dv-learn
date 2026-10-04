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
	const greeting = name.trim() ? `Hi ${name.trim()},` : "Hi,";
	const subject = `${brand}: Verify your email`;
	const instruction = `Thanks for joining ${brand}. Verify your email to start learning.`;
	const safety =
		"If you did not create this account, ignore this email. Do not share this verification link.";
	const expiry =
		"If the link has expired, request another verification email from the sign-in page.";
	return {
		subject,
		text: `${greeting}\n\n${instruction}\n\nVerify email:\n${url}\n\n${expiry}\n\n${safety}${support ? `\n\nNeed help? Contact ${support}.` : ""}\n\n${brand}`,
		html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background-color:#f3f6f3;color:#172b2a;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Verify your email to start learning.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f6f3;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #dce5dd;border-radius:16px;">
<tr><td style="padding:28px 24px;border-bottom:1px solid #dce5dd;font-size:20px;font-weight:700;">${escapeHtml(brand)}</td></tr>
<tr><td style="padding:28px 24px;">
<h1 style="margin:0 0 20px;font-size:28px;line-height:1.25;">Verify your email</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;">${escapeHtml(instruction)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#234c38" style="border-radius:8px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:16px 24px;border:1px solid #234c38;border-radius:8px;background-color:#234c38;color:#ffffff;font-size:16px;font-weight:700;line-height:1.5;text-decoration:none;">Verify email</a></td></tr></table>
<p style="margin:24px 0 8px;font-size:14px;line-height:1.6;color:#53645b;">If the button does not work, copy and paste this link into your browser:</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;overflow-wrap:anywhere;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:#234c38;text-decoration:underline;">${escapeHtml(url)}</a></p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#53645b;">${expiry}</p>
</td></tr><tr><td style="padding:24px;border-top:1px solid #dce5dd;font-size:14px;line-height:1.6;color:#53645b;">
<p style="margin:0;">${escapeHtml(safety)}</p>${support ? `<p style="margin:16px 0 0;">Need help? Contact ${escapeHtml(support)}.</p>` : ""}
</td></tr></table></td></tr></table></body></html>`,
	};
}
