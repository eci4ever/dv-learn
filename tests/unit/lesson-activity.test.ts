import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type ActivityConfig,
	activityIssues,
	activitySchema,
	cacheRun,
	parseActivity,
	quizResults,
	recordFeedback,
} from "../../src/lib/lesson-activity";
import { publishableLessonInput } from "../../src/server/validation";

const bundle = JSON.parse(
	readFileSync(
		new URL("../../courses/dns-fundamentals/course.json", import.meta.url),
		"utf8",
	),
);
const configs: ActivityConfig[] = bundle.lessons
	.filter((l: { config?: unknown }) => l.config)
	.map((l: { config: unknown }) => activitySchema.parse(l.config));

describe("configured course activities", () => {
	it("validates every published lesson in the reviewed bundle", () => {
		for (const l of bundle.lessons)
			expect(() =>
				publishableLessonInput.parse({
					...l,
					activity: null,
					activityConfig: l.config ? JSON.stringify(l.config) : null,
					videoUrl: null,
					resourceLinks: l.sources.join("\n"),
					durationSeconds: l.minutes * 60,
					sortOrder: 0,
					preview: true,
					published: true,
				}),
			).not.toThrow();
		expect(configs).toHaveLength(4);
	});
	it("rejects malformed, oversized and unknown-version payloads", () => {
		for (const value of [
			"{",
			"x".repeat(64001),
			JSON.stringify({ ...configs[0], version: 2 }),
		])
			expect(parseActivity(value)).toBeNull();
		expect(
			activityIssues({
				lessonType: "reading",
				activityConfig: JSON.stringify(configs[0]),
			}),
		).not.toEqual([]);
		expect(
			activityIssues({
				lessonType: "interactive",
				activity: "ipv4",
				activityConfig: JSON.stringify(configs[0]),
			}),
		).not.toEqual([]);
	});
	it("checks all record fields with DNS-name and IPv6 normalization", () => {
		const config = configs.find((c) => c.kind === "dns-records");
		if (config?.kind !== "dns-records") throw new Error("Missing records");
		for (const task of config.tasks) {
			const input = {
				owner: `${task.owner.toUpperCase()}.`,
				type: task.expected.type,
				value: task.expected.value,
				preference: String(task.expected.preference ?? ""),
			};
			expect(recordFeedback(task, input)).toEqual([]);
			expect(
				recordFeedback(task, { ...input, value: "wrong" }).length,
			).toBeGreaterThan(0);
			expect(
				recordFeedback(task, { ...input, owner: "wrong.example" }).length,
			).toBeGreaterThan(0);
			if (task.expected.type === "AAAA")
				expect(
					recordFeedback(task, { ...input, value: "2001:0db8:0:0:0:0:0:10" }),
				).toEqual([]);
			if (task.expected.type === "MX")
				expect(
					recordFeedback(task, { ...input, preference: "10.5" }).length,
				).toBeGreaterThan(0);
			if (task.expected.type === "TXT")
				expect(
					recordFeedback(task, {
						...input,
						value: task.expected.value.toUpperCase(),
					}).length,
				).toBeGreaterThan(0);
		}
	});
	it("expires at the boundary and restarts TTL only on a fresh lookup", () => {
		const config = configs.find((c) => c.kind === "dns-cache");
		if (config?.kind !== "dns-cache") throw new Error("Missing cache");
		expect(
			cacheRun(config).map(({ address, ttl, refreshed }) => [
				address,
				ttl,
				refreshed,
			]),
		).toEqual([
			["192.0.2.10", 180, false],
			["192.0.2.10", 1, false],
			["192.0.2.20", 300, true],
			["192.0.2.20", 299, false],
		]);
		expect(
			cacheRun({ ...config, ttlSeconds: 0 }).every(
				(r) => r.ttl === 0 && r.refreshed,
			),
		).toBe(true);
		expect(
			activitySchema.safeParse({ ...config, queryTimes: [300, 120] }).success,
		).toBe(false);
	});
	it("grades by stable choice IDs, including missing and unknown answers", () => {
		const config = configs.find((c) => c.kind === "practice-quiz");
		if (config?.kind !== "practice-quiz") throw new Error("Missing quiz");
		expect(quizResults(config, {}).every((r) => !r.correct)).toBe(true);
		expect(
			quizResults(
				config,
				Object.fromEntries(config.questions.map((q) => [q.id, q.answerId])),
			).every((r) => r.correct),
		).toBe(true);
		expect(
			activitySchema.safeParse({
				...config,
				questions: [{ ...config.questions[0], answerId: "unknown" }],
			}).success,
		).toBe(false);
		expect(
			activitySchema.safeParse({
				...config,
				questions: [config.questions[0], config.questions[0]],
			}).success,
		).toBe(false);
	});
});
