import { expect, it } from "vitest";
import { verificationEmail } from "../../src/server/verification-email";

const url =
	"https://learn.example.test/api/auth/verify-email?token=test-only&callbackURL=%2Fdashboard";
it("renders a branded Malay email with the original URL in both formats", () => {
	const message = verificationEmail({ name: "Aina", url });
	expect(message.subject).toBe("DV Learn: Sahkan alamat e-mel anda");
	expect(message.text).toContain(url);
	expect(message.html).toContain('lang="ms"');
	expect(message.html.match(/href=/g)).toHaveLength(2);
	expect(message.html).toContain(url.replaceAll("&", "&amp;"));
	expect(message.text).toContain("Jangan kongsi pautan");
});
it("escapes every dynamic HTML field and keeps support optional", () => {
	const message = verificationEmail({
		name: '<img src=x onerror="bad">',
		brand: "Learn & Grow",
		support: "<support@example.test>",
		url,
	});
	expect(message.html).not.toContain("<img");
	expect(message.html).toContain("Learn &amp; Grow");
	expect(message.html).toContain("&lt;support@example.test&gt;");
	expect(verificationEmail({ name: " ", url }).text).toMatch(/^Hai,/);
	expect(verificationEmail({ name: "", url }).html).not.toContain(
		"Perlukan bantuan?",
	);
});
it("rejects executable URLs", () => {
	expect(() =>
		verificationEmail({ name: "Aina", url: "javascript:alert(1)" }),
	).toThrow("Invalid verification URL");
});
