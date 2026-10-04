import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";

const prefix = `e2e-${Date.now()}`;
const email = `${prefix}@example.test`;
const password = "Local-fixture-password-57!";
function fixtureIP(n: number) {
	return `192.0.2.${((Number(prefix.slice(4)) + n) % 254) + 1}`;
}
function rpcName(url: string) {
	try {
		return String(
			JSON.parse(
				Buffer.from(
					new URL(url).pathname.split("/").pop() ?? "",
					"base64url",
				).toString(),
			).export ?? "",
		);
	} catch {
		return "";
	}
}
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
		test.beforeAll(async ({ baseURL }) => {
			if (process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1") return;
			if (
				!baseURL ||
				!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
			)
				throw new Error("Authenticated fixtures are local-only.");
			const hash = await hashPassword(password);
			sql(`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${prefix}','E2E Student','${email}',1,0,0);
  INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${prefix}','${prefix}','credential','${prefix}','${hash}',0,0);
  INSERT INTO courses(id,slug,title,published) VALUES ('${prefix}','${prefix}','E2E Learning Fixture',1);
  INSERT INTO sections(id,course_id,title) VALUES ('${prefix}','${prefix}','Getting started');
  INSERT INTO lessons(id,section_id,title,content,published,video_url,duration_seconds) VALUES ('${prefix}','${prefix}','Text lesson','Private lesson notes',1,'https://www.youtube.com/watch?v=abcdefghijk',100);
  INSERT INTO course_access(id,user_id,course_id,source,source_id,created_at) VALUES ('${prefix}','${prefix}','${prefix}','manual','manual',0);
  INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${prefix}-admin','E2E Admin','admin-${email}',1,0,0);
  INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${prefix}-admin','${prefix}-admin','credential','${prefix}-admin','${hash}',0,0);
  UPDATE user SET role='admin' WHERE id='${prefix}-admin';`);
		});
		test.afterAll(({ baseURL }) => {
			if (process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1") return;
			if (
				!baseURL ||
				!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
			)
				return;
			sql(
				`DELETE FROM audit_log WHERE actor_id='${prefix}-admin'; DELETE FROM email_outbox WHERE order_id IN ('${prefix}-order','${prefix}-pending'); DELETE FROM order_refunds WHERE order_id IN ('${prefix}-order','${prefix}-pending'); DELETE FROM orders WHERE id IN ('${prefix}-order','${prefix}-pending'); DELETE FROM products WHERE id='${prefix}-ops' OR title='${prefix} Bundle'; DELETE FROM courses WHERE slug='${prefix}-admin-course' OR slug LIKE '${prefix}-scale-%'; DELETE FROM rate_limit WHERE key LIKE '%${email}%'; DELETE FROM courses WHERE id='${prefix}'; DELETE FROM user WHERE id IN ('${prefix}','${prefix}-admin');`,
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
			await context.setExtraHTTPHeaders({ "cf-connecting-ip": fixtureIP(1) });
			await page.goto("/login");
			await page.addInitScript(
				`window.YT={Player:class { constructor(element,options){element.textContent='Mock video start '+options.playerVars.start; this.timer=setTimeout(()=>options.events.onStateChange({data:2}),700);} getCurrentTime(){return 35;} destroy(){clearTimeout(this.timer);} }};`,
			);
			await page.locator('input[name="email"]').fill(email);
			await page.locator('input[name="password"]').fill(password);
			await page.getByRole("button", { name: "Sign in ↗" }).click();
			await expect(page).toHaveURL(/\/dashboard$/);
			await expect(
				page.getByRole("heading", { name: "E2E Learning Fixture" }),
			).toBeVisible();
			await page.goto(`/learn/${prefix}/${prefix}`);
			await expect(page.getByText("Private lesson notes")).toBeVisible();
			await expect(page.getByRole("status")).toContainText("Progress saved.");
			await page.reload();
			await expect(page.getByText("Mock video start 35")).toBeVisible();
			await page
				.getByRole("button", { name: "Mark as complete", exact: false })
				.click();
			await expect(page.getByRole("status")).toContainText(
				"Lesson ditandakan selesai",
			);
			await page.goto("/dashboard");
			await expect(page.getByText("100% complete")).toBeVisible();
			await page.goto("/admin");
			await expect(page).toHaveURL(/\/dashboard$/);
			await expect(page.locator(".admin-tabs, .admin-form")).toHaveCount(0);
		});
		test("course-centered Studio publishes content and protects editor input", async ({
			page,
			context,
		}) => {
			test.skip(
				process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
				"Opt-in local D1 fixtures.",
			);
			test.setTimeout(60000);
			await context.setExtraHTTPHeaders({ "cf-connecting-ip": fixtureIP(2) });
			await context.route("**/*", (route) =>
				["localhost", "127.0.0.1"].includes(
					new URL(route.request().url()).hostname,
				)
					? route.continue()
					: route.abort(),
			);
			await page.goto("/login");
			await page.locator('[name="email"]').fill(`admin-${email}`);
			await page.locator('[name="password"]').fill(password);
			await page.getByRole("button", { name: "Sign in ↗" }).click();
			await expect(page).toHaveURL(/\/dashboard$/);
			await page.goto("/admin");
			await expect(page).toHaveURL(/\/admin\/courses/);
			await page.getByRole("link", { name: "Add course", exact: true }).click();
			await page
				.getByLabel("Title", { exact: true })
				.fill(`${prefix} Admin Course`);
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page.getByLabel("Slug", { exact: true })).toBeFocused();
			await expect(page.getByLabel("Slug", { exact: true })).toHaveAttribute(
				"aria-invalid",
				"true",
			);
			await page
				.getByLabel("Slug", { exact: true })
				.fill(`${prefix}-admin-course`);
			await page
				.getByLabel("Instructor", { exact: true })
				.fill("E2E Instructor");
			await page.getByLabel("Published", { exact: true }).check();
			await page.route("**/_serverFn/**", (route) =>
				route.request().method() === "POST" ? route.abort() : route.continue(),
			);
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page.getByRole("alert")).toContainText(
				"Input anda dikekalkan",
			);
			await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
				`${prefix} Admin Course`,
			);
			await page.unroute("**/_serverFn/**");
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page).not.toHaveURL(/\/courses\/new/);
			await expect(
				page.getByRole("heading", { level: 2, name: `${prefix} Admin Course` }),
			).toBeVisible();
			await page.getByRole("button", { name: "Content", exact: true }).click();
			await page
				.getByRole("link", { name: "Add section", exact: true })
				.click();
			await page
				.getByLabel("Section title", { exact: true })
				.fill(`${prefix} Section`);
			await page.getByRole("button", { name: "Save", exact: true }).click();
			const sectionToggle = page.getByRole("button", {
				name: new RegExp(`${prefix} Section.*0 lessons`),
			});
			await expect(sectionToggle).toBeVisible();
			if ((await sectionToggle.getAttribute("aria-expanded")) === "false")
				await sectionToggle.click();
			await page.getByRole("link", { name: "Add lesson", exact: true }).click();
			await page
				.getByLabel("Lesson title", { exact: true })
				.fill(`${prefix} Lesson`);
			await page
				.getByLabel("Lesson notes", { exact: true })
				.fill("Admin-authored private notes.");
			await page.getByLabel("Duration (seconds)", { exact: true }).fill("60");
			await page.getByLabel("Published", { exact: true }).check();
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page).not.toHaveURL(/\/lessons\/new-/);
			await expect(
				page.getByLabel("Lesson notes", { exact: true }),
			).toHaveValue("Admin-authored private notes.");
			await page
				.getByLabel("Lesson title", { exact: true })
				.fill("UNSAVED EDIT");
			await page
				.getByRole("navigation", { name: "Admin studio", exact: true })
				.getByRole("link", { name: "Products", exact: true })
				.click();
			const dirty = page.getByRole("dialog", {
				name: "Discard unsaved changes?",
			});
			await expect(dirty).toBeVisible();
			await expect(
				dirty.getByRole("button", { name: "Stay in editor" }),
			).toBeFocused();
			await page.keyboard.press("Escape");
			await expect(dirty).toBeHidden();
			await expect(
				page.getByLabel("Lesson title", { exact: true }),
			).toHaveValue("UNSAVED EDIT");
			const browserWarning = page.waitForEvent("dialog");
			const reload = page.reload({ timeout: 1500 }).catch(() => undefined);
			const warning = await browserWarning;
			expect(warning.type()).toBe("beforeunload");
			await warning.dismiss();
			await reload;
			await expect(
				page.getByLabel("Lesson title", { exact: true }),
			).toHaveValue("UNSAVED EDIT");
			await page
				.getByRole("button", { name: "Discard changes", exact: true })
				.click();
			await expect(
				page.getByLabel("Lesson title", { exact: true }),
			).toHaveValue(`${prefix} Lesson`);
			await page.screenshot({
				path: test.info().outputPath("studio-desktop-light.png"),
				fullPage: true,
			});
			await page
				.getByRole("button", { name: "Dark theme", exact: true })
				.click();
			await page.screenshot({
				path: test.info().outputPath("studio-desktop-dark.png"),
				fullPage: true,
			});
			// Browser zoom at 200% halves the CSS viewport and triggers reflow.
			await page.setViewportSize({ width: 640, height: 450 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth,
				),
			).toBe(true);
			await page.setViewportSize({ width: 320, height: 740 });
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= window.innerWidth,
				),
			).toBe(true);
			await expect(page.locator("aside")).toBeHidden();
			await page.screenshot({
				path: test.info().outputPath("studio-mobile-dark.png"),
				fullPage: true,
			});
			await page.setViewportSize({ width: 1280, height: 900 });
			await page
				.getByRole("button", { name: "Light theme", exact: true })
				.click();
			await page
				.getByRole("navigation", { name: "Admin studio", exact: true })
				.getByRole("link", { name: "Products", exact: true })
				.click();
			await page
				.getByRole("link", { name: "Add product", exact: true })
				.click();
			await page
				.getByLabel("Product title", { exact: true })
				.fill(`${prefix} Bundle`);
			await page.getByLabel("Price (MYR cents)", { exact: true }).fill("1250");
			await page
				.getByLabel("Search add courses to product")
				.fill(`${prefix} Admin Course`);
			await page
				.getByRole("button", { name: `${prefix} Admin Course`, exact: true })
				.click();
			await page.getByLabel("Active", { exact: true }).check();
			await page.getByRole("button", { name: "Save", exact: true }).click();
			await expect(page).not.toHaveURL(/\/products\/new/);
			await page.goto(`/courses/${prefix}-admin-course`);
			await expect(
				page.getByRole("heading", { level: 1, name: `${prefix} Admin Course` }),
			).toBeVisible();
		});
		test("admin plugin enforces roles and bans across existing sessions", async ({
			page,
			browser,
			baseURL,
		}) => {
			test.skip(
				process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
				"Opt-in local-only fixtures.",
			);
			if (!baseURL) throw new Error("Base URL required");
			await page
				.context()
				.setExtraHTTPHeaders({ "cf-connecting-ip": fixtureIP(3) });
			const studentContext = await browser.newContext({
				baseURL,
				extraHTTPHeaders: { "cf-connecting-ip": fixtureIP(4) },
			});
			try {
				const studentPage = await studentContext.newPage();
				await studentPage.goto("/login");
				await studentPage.locator('[name="email"]').fill(email);
				await studentPage.locator('[name="password"]').fill(password);
				await studentPage.getByRole("button", { name: "Sign in ↗" }).click();
				await expect(studentPage).toHaveURL(/\/dashboard$/);
				expect(
					(
						await studentContext.request.get("/api/auth/admin/list-users")
					).status(),
				).toBe(403);
				expect(
					(
						await studentContext.request.post("/api/auth/admin/set-role", {
							headers: { origin: baseURL },
							data: { userId: prefix, role: "admin" },
						})
					).status(),
				).toBe(403);
				await page.goto("/login");
				await page.locator('[name="email"]').fill(`admin-${email}`);
				await page.locator('[name="password"]').fill(password);
				await page.getByRole("button", { name: "Sign in ↗" }).click();
				await expect(page).toHaveURL(/\/dashboard$/);
				await page.goto("/admin/users");
				await expect(
					page.getByRole("heading", { name: "Users and roles" }),
				).toBeVisible();
				for (const role of ["admin", "user"]) {
					if (role === "admin") {
						const studentRow = page
							.getByRole("row")
							.filter({ hasText: email })
							.filter({ hasText: "E2E Student" });
						await studentRow
							.getByRole("button", { name: "Change role" })
							.click();
						const dialog = page.getByRole("dialog", {
							name: "Confirm action",
						});
						await expect(dialog).toContainText(`Change role ${email} toadmin?`);
						await dialog.getByRole("button", { name: "Cancel" }).click();
						await expect(dialog).toBeHidden();
						await expect(
							studentRow.locator('[data-slot="badge"]').first(),
						).toHaveText("user");
						await studentRow
							.getByRole("button", { name: "Ban", exact: true })
							.click();
						await expect(
							dialog.getByRole("button", { name: "Confirm" }),
						).toBeDisabled();
						await dialog
							.getByRole("textbox", { name: "Reason" })
							.fill("Local test cancellation");
						await expect(
							dialog.getByRole("button", { name: "Confirm" }),
						).toBeEnabled();
						await page.keyboard.press("Escape");
						await expect(dialog).toBeHidden();
						await expect(
							studentRow.getByText("Active", { exact: true }),
						).toBeVisible();
					}
					expect(
						(
							await page.request.post("/api/auth/admin/set-role", {
								headers: { origin: baseURL },
								data: { userId: prefix, role },
							})
						).status(),
					).toBe(200);
					await studentPage.goto("/admin/users");
					if (role === "admin")
						await expect(
							studentPage.getByRole("heading", {
								name: "Users and roles",
							}),
						).toBeVisible();
					else await expect(studentPage).toHaveURL(/\/dashboard$/);
				}
				expect(
					(
						await page.request.post("/api/auth/admin/ban-user", {
							headers: { origin: baseURL },
							data: { userId: prefix, banReason: "Local test" },
						})
					).status(),
				).toBe(200);
				await studentPage.goto("/dashboard");
				await expect(studentPage).toHaveURL(/\/login$/);
				expect(
					(
						await page.request.post("/api/auth/admin/unban-user", {
							headers: { origin: baseURL },
							data: { userId: prefix },
						})
					).status(),
				).toBe(200);
			} finally {
				await studentContext.close();
			}
		});
		test("manual access and operations tabs preserve scoped actions", async ({
			page,
			context,
		}) => {
			test.skip(
				process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
				"Local-only fixtures; no live emails or payment provider calls.",
			);
			await context.setExtraHTTPHeaders({ "cf-connecting-ip": fixtureIP(5) });
			await page.goto("/login");
			await page.locator('[name="email"]').fill(`admin-${email}`);
			await page.locator('[name="password"]').fill(password);
			await page.getByRole("button", { name: "Sign in ↗" }).click();
			await expect(page).toHaveURL(/\/dashboard$/);
			await page.goto("/admin/access");
			await page
				.getByRole("button", { name: "Grant manual access", exact: true })
				.click();
			await page.getByLabel("Search pengguna", { exact: true }).fill(email);
			await page
				.getByRole("button", { name: `E2E Student — ${email}`, exact: true })
				.click();
			await page
				.getByLabel("Search courses", { exact: true })
				.fill(`${prefix} Admin Course`);
			await page
				.getByRole("button", { name: `${prefix} Admin Course`, exact: true })
				.click();
			await page
				.getByRole("button", { name: "Grant access", exact: true })
				.click();
			const confirm = page.getByRole("dialog", { name: "Confirm action" });
			await confirm
				.getByRole("button", { name: "Confirm", exact: true })
				.click();
			await expect(
				page.getByText("Access updated.", { exact: true }),
			).toBeVisible();
			await page
				.getByLabel("Search name, email or course")
				.fill(`${prefix} Admin Course`);
			const grant = page
				.getByRole("listitem")
				.filter({ hasText: `${prefix} Admin Course` });
			await expect(grant).toHaveCount(1);
			await grant.getByRole("button", { name: "Revoke manual access" }).click();
			await confirm
				.getByRole("button", { name: "Cancel", exact: true })
				.click();
			await expect(
				grant.getByRole("button", { name: "Revoke manual access" }),
			).toBeVisible();
			await grant.getByRole("button", { name: "Revoke manual access" }).click();
			await confirm
				.getByRole("button", { name: "Confirm", exact: true })
				.click();
			await expect(grant).toContainText("Revoked");
			sql(
				`INSERT INTO products(id,title,price_cents,active) VALUES ('${prefix}-ops','Local operations fixture',1250,0); INSERT INTO orders(id,user_id,product_id,product_title,amount_cents,status,created_at,paid_at,collection_id) VALUES ('${prefix}-order','${prefix}','${prefix}-ops','Local paid fixture',1250,'paid',0,0,'local-only'); INSERT INTO email_outbox(id,order_id,recipient,attempts,last_error) VALUES ('${prefix}-receipt','${prefix}-order','${email}',1,'Local delivery fixture');`,
			);
			const calls: string[] = [];
			page.on("request", (request) => {
				calls.push(rpcName(request.url()));
			});
			await page.goto("/admin/operations");
			await page
				.getByLabel("Search order, email or product")
				.fill(`${prefix}-order`);
			await page
				.getByRole("button", { name: "Record refund", exact: true })
				.click();
			await expect(confirm).toContainText("tidak menghantar wang");
			await expect(
				confirm.getByRole("button", { name: "Confirm", exact: true }),
			).toBeDisabled();
			await confirm
				.getByLabel("Reason", { exact: true })
				.fill("Local refund already completed");
			await confirm
				.getByRole("button", { name: "Confirm", exact: true })
				.click();
			await expect(
				page.getByRole("listitem").filter({ hasText: `${prefix}-order` }),
			).toContainText("refunded");
			expect(calls.some((name) => name.startsWith("listAdminReceipts"))).toBe(
				false,
			);
			expect(calls.some((name) => name.startsWith("listAdminAudit"))).toBe(
				false,
			);
			await page.getByRole("button", { name: "Receipts", exact: true }).click();
			await page.getByLabel("Search receipt or email").fill(email);
			await expect(
				page.getByText("Local delivery fixture", { exact: true }),
			).toBeVisible();
			await page.getByRole("button", { name: "Retry unsent receipts" }).click();
			await expect(confirm).toContainText("E-mel resit akan dihantar");
			await confirm
				.getByRole("button", { name: "Cancel", exact: true })
				.click();
			await page.getByRole("button", { name: "Audit", exact: true }).click();
			await page
				.getByLabel("Search action, actor or record")
				.fill(`${prefix}-admin`);
			await expect(
				page.getByText("admin-mutation-attempt", { exact: true }).first(),
			).toBeVisible();
			await page.setViewportSize({ width: 320, height: 740 });
			for (const resource of [
				"courses",
				"products",
				"users",
				"access",
				"operations",
			]) {
				await page.goto(`/admin/${resource}`);
				await expect(
					page.getByRole("heading", { name: "Admin studio", exact: true }),
				).toBeVisible();
				expect(
					await page.evaluate(
						() => document.documentElement.scrollWidth <= window.innerWidth,
					),
				).toBe(true);
			}
		});
		test("100 courses / 5,000 lessons remain paginated and lazy in the browser", async ({
			page,
			context,
		}) => {
			test.setTimeout(60_000);
			test.skip(
				process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
				"Opt-in local scale fixture.",
			);
			await context.setExtraHTTPHeaders({ "cf-connecting-ip": fixtureIP(6) });
			await page.goto("/login");
			await page.locator('[name="email"]').fill(`admin-${email}`);
			await page.locator('[name="password"]').fill(password);
			await page.getByRole("button", { name: "Sign in ↗" }).click();
			await expect(page).toHaveURL(/\/dashboard$/);
			sql(
				`WITH RECURSIVE n(x) AS (SELECT 0 UNION ALL SELECT x+1 FROM n WHERE x<99) INSERT INTO courses(id,slug,title,category,published,archived,sort_order) SELECT '${prefix}-scale-c-'||x,'${prefix}-scale-'||x,'${prefix} Scale Course '||x,CASE WHEN x%2=1 THEN 'Design' ELSE 'Code' END,x%2,CASE WHEN x%10=0 THEN 1 ELSE 0 END,x FROM n; INSERT INTO sections(id,course_id,title) SELECT id||'-s',id,'Scale section' FROM courses WHERE slug LIKE '${prefix}-scale-%'; WITH RECURSIVE n(x) AS (SELECT 0 UNION ALL SELECT x+1 FROM n WHERE x<49) INSERT INTO lessons(id,section_id,title,content,sort_order) SELECT s.id||'-l-'||n.x,s.id,'Scale lesson '||n.x,'PRIVATE SCALE NOTES',n.x FROM sections s CROSS JOIN n WHERE s.course_id LIKE '${prefix}-scale-c-%';`,
			);
			const calls: string[] = [];
			page.on("request", (request) => {
				calls.push(rpcName(request.url()));
			});
			await page.goto("/admin/courses");
			await page.getByLabel("Search title or slug").fill(`${prefix} Scale`);
			await expect(page.getByRole("status")).toContainText("100 results");
			await expect(page.locator(".studio-row")).toHaveCount(20);
			expect(calls.some((name) => name.startsWith("listAdminLessons"))).toBe(
				false,
			);
			await page.getByRole("button", { name: "Next", exact: true }).click();
			await expect(page).toHaveURL(/page=2/);
			await expect(page.getByRole("status")).toContainText("Halaman 2 / 5");
			await page
				.getByLabel("Status", { exact: true })
				.selectOption("published");
			await expect(page.getByRole("status")).toContainText("50 results");
			await expect(page).toHaveURL(/page=1/);
			await page.getByLabel("Category", { exact: true }).selectOption("Code");
			await expect(
				page.getByText("No matching records.", { exact: false }),
			).toBeVisible();
			await page.getByLabel("Category", { exact: true }).selectOption("");
			await expect(page.getByLabel("Category", { exact: true })).toHaveValue(
				"",
			);
			await page.getByLabel("Status", { exact: true }).selectOption("archived");
			await expect(page.getByRole("status")).toContainText("10 results");
			await page.getByLabel("Status", { exact: true }).selectOption("all");
			await expect(page.getByRole("status")).toContainText("100 results");
			await page
				.getByLabel("Search title or slug")
				.fill(`${prefix} Scale Course 99`);
			await page
				.getByRole("link", { name: `${prefix} Scale Course 99`, exact: true })
				.click();
			await page.getByRole("button", { name: "Content", exact: true }).click();
			await expect(
				page.getByRole("button", { name: /Scale section.*50 lessons/ }),
			).toBeVisible();
			expect(calls.some((name) => name.startsWith("listAdminLessons"))).toBe(
				false,
			);
			await page
				.getByRole("button", { name: /Scale section.*50 lessons/ })
				.click();
			await expect(
				page.getByRole("link", { name: "Scale lesson 19", exact: true }),
			).toBeVisible();
			await expect(
				page.getByRole("link", { name: "Scale lesson 20", exact: true }),
			).toHaveCount(0);
			const lessons = page.locator('[id^="section-"]');
			await lessons.getByRole("button", { name: "Next", exact: true }).click();
			await expect(page).toHaveURL(/lessonPage=2/);
			await expect(
				lessons.getByRole("link", { name: "Scale lesson 20", exact: true }),
			).toBeVisible();
			await lessons.getByRole("button", { name: "Next", exact: true }).click();
			await expect(
				lessons.getByRole("link", { name: "Scale lesson 49", exact: true }),
			).toBeVisible();
			await lessons
				.getByRole("button", {
					name: `Move up ${prefix}-scale-c-99-s-l-49`,
					exact: true,
				})
				.click();
			await expect(lessons.getByRole("link").last()).toHaveText(
				"Scale lesson 48",
			);
			await lessons
				.getByRole("link", { name: "Scale lesson 49", exact: true })
				.click();
			await expect(
				page.getByLabel("Lesson notes", { exact: true }),
			).toHaveValue("PRIVATE SCALE NOTES");
			await page
				.getByLabel("Lesson title", { exact: true })
				.fill("Unsaved scale lesson");
			await page
				.locator("aside")
				.getByRole("link", { name: "Scale lesson 1", exact: true })
				.click();
			const dirty = page.getByRole("dialog", {
				name: "Discard unsaved changes?",
			});
			await dirty
				.getByRole("button", { name: "Discard changes", exact: true })
				.click();
			await expect(
				page.getByLabel("Lesson title", { exact: true }),
			).toHaveValue("Scale lesson 1");
		});
	});
