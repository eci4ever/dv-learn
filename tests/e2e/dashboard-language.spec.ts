import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";
import { selectLanguage } from "./helpers/select-language";

function sql(command: string) {
	execFileSync(
		"node_modules/.bin/wrangler",
		[
			"d1",
			"execute",
			"DB",
			"--config",
			"wrangler.jsonc",
			"--local",
			"--command",
			command,
		],
		{ stdio: "pipe" },
	);
}

test("dashboard localizes empty, resume and complete states in BM and EN", async ({
	page,
	context,
	baseURL,
}, testInfo) => {
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only authenticated fixture",
	);
	test.setTimeout(90_000);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Dashboard fixtures are local-only");
	const id = `dashboard-language-${Date.now()}`;
	const email = `${id}@example.test`;
	const password = "Dashboard-fixture-only-57!";
	const hash = await hashPassword(password);
	try {
		sql(
			`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${id}','Dashboard Student','${email}',1,0,0); INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);`,
		);
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": "192.0.2.198" });
		await context.addCookies([
			{ name: "PARAGLIDE_LOCALE", value: "ms", url: baseURL },
		]);
		await page.goto("/login");
		await page.locator('[name="email"]').fill(email);
		await page.locator('[name="password"]').fill(password);
		await page.locator('button[type="submit"]').click();
		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Selamat kembali, Dashboard Student.",
			{ timeout: 3000 },
		);
		await expect(page).toHaveTitle("Pembelajaran saya — DV Learn");
		await expect(
			page.getByRole("heading", {
				name: "Mulakan kursus pertama anda",
				exact: true,
			}),
		).toBeVisible();
		await expect(
			page.getByText(
				"Anda belum mempunyai kursus. Lihat senarai kursus untuk mula belajar.",
				{ exact: true },
			),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Lihat kursus ↗", exact: true }),
		).toBeVisible();
		for (const label of ["Kursus saya", "Pelajaran selesai", "Kursus selesai"])
			await expect(page.locator(".stats").getByText(label)).toBeVisible();
		await selectLanguage(page, "en");
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Welcome back, Dashboard Student.",
		);
		await expect(page).toHaveTitle("My learning — DV Learn");
		await expect(
			page.getByRole("heading", {
				name: "Start your first course",
				exact: true,
			}),
		).toBeVisible();
		sql(
			`INSERT INTO courses(id,slug,title,description,published) VALUES ('${id}','${id}','DNS practice fixture','DNS and TTL remain English terms.',1); INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','DNS basics'); INSERT INTO lessons(id,section_id,title,content,published,preview,lesson_type,sort_order) VALUES ('${id}-1','${id}','First DNS lesson','DNS basics',1,1,'reading',0),('${id}-2','${id}','Next TTL lesson','TTL basics',1,1,'reading',1); INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('${id}','${id}','${id}','manual','manual',0); INSERT INTO progress(user_id,lesson_id,position_seconds,completed,updated_at) VALUES ('${id}','${id}-1',0,1,1000);`,
		);
		await page.reload();
		await expect(
			page.getByRole("link", { name: "Resume lesson", exact: true }),
		).toHaveAttribute("href", `/learn/${id}/${id}-2`);
		await selectLanguage(page, "ms");
		await expect(
			page.getByText("Seterusnya: Next TTL lesson", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("progressbar", {
				name: "Kemajuan kursus untuk disambung",
				exact: true,
			}),
		).toHaveAttribute("aria-valuenow", "50");
		await expect(
			page.getByText("1 daripada 2 pelajaran selesai", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Sambung pelajaran", exact: true }),
		).toHaveAttribute("href", `/learn/${id}/${id}-2`);
		await expect(
			page.getByRole("link", { name: "Teruskan pembelajaran ↗", exact: true }),
		).toBeVisible();
		for (const width of [320, 1280]) {
			await page.setViewportSize({ width, height: 900 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth + 1,
				),
			).toBe(true);
		}
		await page.screenshot({
			path: testInfo.outputPath("dashboard-bm-resume.png"),
			fullPage: true,
		});
		sql(
			`INSERT INTO progress(user_id,lesson_id,position_seconds,completed,updated_at) VALUES ('${id}','${id}-2',0,1,2000);`,
		);
		await page.reload();
		await expect(
			page.getByText("✓ Kursus selesai", { exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Sambung pelajaran", exact: true }),
		).toHaveCount(0);
		await selectLanguage(page, "en");
		await expect(
			page.getByText("✓ Course complete", { exact: true }),
		).toBeVisible();
	} finally {
		sql(
			`DELETE FROM rate_limit WHERE key LIKE '%${email}%'; DELETE FROM courses WHERE id='${id}'; DELETE FROM user WHERE id='${id}';`,
		);
	}
});
