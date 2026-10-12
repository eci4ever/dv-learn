import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { hashPassword } from "../../src/server/password";

function sql(command: string) {
	return execFileSync(
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
			"--json",
			"--command",
			command,
		],
		{ encoding: "utf8", stdio: "pipe" },
	);
}

test("verified student enrolls free, returns from login and saves completion without purchase", async ({
	page,
	context,
	baseURL,
}) => {
	test.skip(
		process.env.PLAYWRIGHT_ALLOW_LOCAL_FIXTURES !== "1",
		"Local-only authenticated fixture",
	);
	test.setTimeout(90_000);
	if (
		!baseURL ||
		!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
	)
		throw new Error("Enrollment fixtures are local-only");
	const id = `free-flow-${Date.now()}`;
	const email = `${id}@example.test`;
	const password = "Free-enrollment-fixture-57!";
	const hash = await hashPassword(password);
	sql(`INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES ('${id}','Free Student','${email}',1,0,0);
INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES ('${id}','${id}','credential','${id}','${hash}',0,0);
INSERT INTO courses(id,slug,title,published,free_enrollment) VALUES ('${id}','${id}','Free Enrollment Fixture',1,1);
INSERT INTO sections(id,course_id,title) VALUES ('${id}','${id}','Free basics');
INSERT INTO lessons(id,section_id,title,content,published,preview,lesson_type,sort_order) VALUES ('${id}-1','${id}','First free lesson','Free reading',1,1,'reading',0),('${id}-2','${id}','Second free lesson','Free reading',1,1,'reading',1);`);
	try {
		await context.route("**/*", (route) =>
			["localhost", "127.0.0.1"].includes(
				new URL(route.request().url()).hostname,
			)
				? route.continue()
				: route.abort(),
		);
		await context.setExtraHTTPHeaders({ "cf-connecting-ip": "192.0.2.181" });
		await page.goto(`/courses/${id}`);
		await page
			.getByRole("link", { name: "Start course — Free", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "Mark as complete", exact: true }),
		).toBeDisabled();
		await page
			.getByRole("link", { name: "Sign in to save progress", exact: true })
			.click();
		expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
			`/learn/${id}/${id}-1`,
		);
		await page.locator('input[name="email"]').fill(email);
		await page.locator('input[name="password"]').fill(password);
		await page.getByRole("button", { name: "Sign in ↗", exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`/learn/${id}/${id}-1$`));
		await expect(
			page.getByRole("button", { name: "Mark as complete", exact: true }),
		).toBeDisabled();
		await page
			.getByRole("button", { name: "Enroll free", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "Mark as complete", exact: true }),
		).toBeEnabled();
		await page
			.getByRole("button", { name: "Mark as complete", exact: true })
			.click();
		await expect(
			page.getByRole("button", { name: "✓ Complete", exact: true }),
		).toBeDisabled();
		await page.reload();
		await expect(
			page.getByRole("button", { name: "✓ Complete", exact: true }),
		).toBeDisabled();
		await page.goto("/dashboard");
		await expect(
			page.getByRole("link", { name: "Resume lesson", exact: true }),
		).toHaveAttribute("href", `/learn/${id}/${id}-2`);
		const result = JSON.parse(
			sql(
				`SELECT (SELECT count(*) FROM free_enrollments WHERE user_id='${id}') AS enrollments,(SELECT count(*) FROM course_access WHERE user_id='${id}') AS grants,(SELECT count(*) FROM orders WHERE user_id='${id}') AS orders;`,
			),
		)[0].results[0];
		expect(result).toEqual({ enrollments: 1, grants: 0, orders: 0 });
	} finally {
		sql(
			`DELETE FROM rate_limit WHERE key LIKE '%${email}%'; DELETE FROM courses WHERE id='${id}'; DELETE FROM user WHERE id='${id}';`,
		);
	}
});
