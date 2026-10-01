import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";

const prefix = `e2e-${Date.now()}`;
const email = `${prefix}@example.test`;
const password = "Local-fixture-password-57!";
function sql(command: string) {
	execFileSync(
		"npm",
		[
			"exec",
			"--no",
			"--",
			"wrangler",
			"d1",
			"execute",
			"DB",
			"--local",
			"--command",
			command,
		],
		{ stdio: "pipe" },
	);
}
test.describe
	.serial("verified student learning against local D1", () => {
		test.beforeAll(async () => {
			if (process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1") return;
			const hash = await hashPassword(password);
			sql(`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${prefix}','E2E Student','${email}',1,0,0);
  INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${prefix}','${prefix}','credential','${prefix}','${hash}',0,0);
  INSERT INTO courses(id,slug,title,published) VALUES ('${prefix}','${prefix}','E2E Learning Fixture',1);
  INSERT INTO sections(id,course_id,title) VALUES ('${prefix}','${prefix}','Getting started');
  INSERT INTO lessons(id,section_id,title,content,published,video_url,duration_seconds) VALUES ('${prefix}','${prefix}','Text lesson','Private lesson notes',1,'https://www.youtube.com/watch?v=abcdefghijk',100);
  INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('${prefix}','${prefix}','${prefix}','manual','manual',0);
  INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${prefix}-admin','E2E Admin','admin-${email}',1,0,0);
  INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${prefix}-admin','${prefix}-admin','credential','${prefix}-admin','${hash}',0,0);
  INSERT INTO admins(user_id) VALUES ('${prefix}-admin');`);
		});
		test.afterAll(() => {
			if (process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1") return;
			sql(
				`DELETE FROM audit_log WHERE actor_id='${prefix}-admin'; DELETE FROM products WHERE title='${prefix} Bundle'; DELETE FROM courses WHERE slug='${prefix}-admin-course'; DELETE FROM rate_limit WHERE key LIKE '%${email}%'; DELETE FROM courses WHERE id='${prefix}'; DELETE FROM user WHERE id IN ('${prefix}','${prefix}-admin');`,
			);
		});
		test("login, view owned lesson, save completion, and deny admin", async ({
			page,
			context,
		}) => {
			test.skip(
				process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
				"Opt-in local D1 fixture; no provider emails or bills.",
			);
			await context.route("**/*", (route) => {
				const url = new URL(route.request().url());
				return ["localhost", "127.0.0.1"].includes(url.hostname)
					? route.continue()
					: route.abort();
			});
			await page.goto("/login");
			await page.addInitScript(
				`window.YT={Player:class { constructor(element,options){element.textContent='Mock video start '+options.playerVars.start; this.timer=setTimeout(()=>options.events.onStateChange({data:2}),700);} getCurrentTime(){return 35;} destroy(){clearTimeout(this.timer);} }};`,
			);
			await page.locator('input[name="email"]').fill(email);
			await page.locator('input[name="password"]').fill(password);
			await page.getByRole("button", { name: "Log masuk ↗" }).click();
			await expect(page).toHaveURL(/\/dashboard$/);
			await expect(
				page.getByRole("heading", { name: "E2E Learning Fixture" }),
			).toBeVisible();
			await page.goto(`/learn/${prefix}/${prefix}`);
			await expect(page.getByText("Private lesson notes")).toBeVisible();
			await expect(page.getByRole("status")).toContainText(
				"Kemajuan disimpan.",
			);
			await page.reload();
			await expect(page.getByText("Mock video start 35")).toBeVisible();
			await page
				.getByRole("button", { name: "Tandakan selesai", exact: false })
				.click();
			await expect(page.getByRole("status")).toContainText(
				"Pelajaran ditandakan selesai",
			);
			await page.goto("/dashboard");
			await expect(page.getByText("100% selesai")).toBeVisible();
			await page.goto("/admin");
			await expect(page.locator("main .empty.error")).toContainText(
				"Administrator permission is required.",
			);
		});
		test("admin publishes a course, section, lesson and product", async ({
			page,
			context,
		}) => {
			test.skip(
				process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
				"Opt-in local D1 fixtures.",
			);
			await context.route("**/*", (route) =>
				["localhost", "127.0.0.1"].includes(
					new URL(route.request().url()).hostname,
				)
					? route.continue()
					: route.abort(),
			);
			await page.goto("/login");
			await page.locator('input[name="email"]').fill(`admin-${email}`);
			await page.locator('input[name="password"]').fill(password);
			await page.getByRole("button", { name: "Log masuk ↗" }).click();
			await expect(page).toHaveURL(/\/dashboard$/);
			await page.goto("/admin");
			await page.getByRole("button", { name: "+ Tambah baharu" }).click();
			const form = page.locator("form.admin-form");
			await form.locator('[name="title"]').fill(`${prefix} Admin Course`);
			await form.locator('[name="slug"]').fill(`${prefix}-admin-course`);
			await form.locator('[name="instructor"]').fill("E2E Instructor");
			await form.locator('[name="level"]').fill("Beginner");
			await form.locator('[name="published"]').check();
			await form.getByRole("button", { name: "Simpan perubahan ↗" }).click();
			await expect(
				page
					.locator(".admin-row")
					.filter({ hasText: `${prefix} Admin Course` }),
			).toBeVisible();
			await page.getByRole("button", { name: "Seksyen", exact: true }).click();
			await page.getByRole("button", { name: "+ Tambah baharu" }).click();
			await form.locator('[name="title"]').fill(`${prefix} Section`);
			await form
				.locator('[name="courseId"]')
				.selectOption({ label: `${prefix} Admin Course` });
			await form.getByRole("button", { name: "Simpan perubahan ↗" }).click();
			await expect(
				page.locator(".admin-row").filter({ hasText: `${prefix} Section` }),
			).toBeVisible();
			await page
				.getByRole("button", { name: "Pelajaran", exact: true })
				.click();
			await page.getByRole("button", { name: "+ Tambah baharu" }).click();
			await form.locator('[name="title"]').fill(`${prefix} Lesson`);
			await form
				.locator('[name="sectionId"]')
				.selectOption({ label: `${prefix} Admin Course / ${prefix} Section` });
			await form.locator('[name="durationSeconds"]').fill("60");
			await form
				.locator('[name="content"]')
				.fill("Admin-authored private notes.");
			await form.locator('[name="published"]').check();
			await form.getByRole("button", { name: "Simpan perubahan ↗" }).click();
			await expect(
				page.locator(".admin-row").filter({ hasText: `${prefix} Lesson` }),
			).toBeVisible();
			await page.getByRole("button", { name: "Produk", exact: true }).click();
			await page.getByRole("button", { name: "+ Tambah baharu" }).click();
			await form.locator('[name="title"]').fill(`${prefix} Bundle`);
			await form.locator('[name="price"]').fill("12.50");
			await form
				.getByRole("checkbox", { name: `${prefix} Admin Course` })
				.check();
			await form.locator('[name="active"]').check();
			await form.getByRole("button", { name: "Simpan perubahan ↗" }).click();
			await expect(
				page.locator(".admin-row").filter({ hasText: `${prefix} Bundle` }),
			).toBeVisible();
			await page.goto(`/courses/${prefix}-admin-course`);
			await expect(
				page.getByRole("heading", { level: 1, name: `${prefix} Admin Course` }),
			).toBeVisible();
		});
	});
