import { describe, expect, it } from "vitest";
import {
	course,
	lessons,
	sections,
} from "../../courses/computer-number-systems/bundle.ts";
import {
	correctionResult,
	selectionCorrect,
} from "../../src/lib/generic-activity.ts";
import { parseActivity } from "../../src/lib/lesson-activity.ts";
import { lessonIssues } from "../../src/lib/lesson-readiness.ts";

describe("reviewed Computer Number Systems bundle", () => {
	it("has six supported public previews and no video or billing requirement", () => {
		expect(course.freeEnrollment).toBe(true);
		expect(course.published).toBe(false);
		expect(lessons).toHaveLength(6);
		expect(lessons.reduce((sum, l) => sum + l.durationSeconds, 0)).toBe(3600);
		expect(new Set(lessons.map((l) => l.id)).size).toBe(6);
		for (const lesson of lessons) {
			expect(lessonIssues(lesson)).toEqual([]);
			expect(lesson.preview).toBe(true);
			expect(lesson.videoUrl).toBeNull();
			expect(sections.some((s) => s.id === lesson.sectionId)).toBe(true);
			expect(lesson.content).toContain("Worked example");
			expect(lesson.content).toContain("Recap");
			expect(lesson.content).not.toMatch(
				/Author-only|####|acceptedValues|errorFieldId/,
			);
		}
	});
	it("checks every error correction, normalization and wrong/empty boundary", () => {
		const expected = [
			"13",
			"128",
			"0",
			"10",
			"59",
			"16",
			"0x2D",
			"01011110",
			"00001001",
		];
		const actual: string[] = [];
		for (const lesson of lessons) {
			const config = parseActivity(lesson.activityConfig);
			if (config?.kind !== "error-spot") continue;
			for (const task of config.tasks) {
				actual.push(task.acceptedValues[0]);
				expect(
					correctionResult(
						task,
						task.errorFieldId,
						` ${task.acceptedValues[0].toLowerCase()} `,
					).correct,
				).toBe(true);
				expect(correctionResult(task, task.errorFieldId, "wrong").correct).toBe(
					false,
				);
				expect(correctionResult(task, task.errorFieldId, "").correct).toBe(
					false,
				);
				expect(
					correctionResult(
						task,
						task.fields.find((f) => f.id !== task.errorFieldId)?.id ?? "",
						task.acceptedValues[0],
					).correct,
				).toBe(false);
			}
		}
		expect(actual).toEqual(expected);
		const config = parseActivity(lessons[4].activityConfig);
		if (config?.kind !== "error-spot") throw Error("Missing grouping tasks");
		expect(correctionResult(config.tasks[0], "hex", "2D").correct).toBe(false);
		expect(
			correctionResult(config.tasks[1], "binary", "0101 1110").correct,
		).toBe(false);
		expect(
			correctionResult(config.tasks[2], "eight-bit-binary", "1001").correct,
		).toBe(false);
	});
	it("selection keys reconstruct each target and respect exact sets", () => {
		const config = parseActivity(lessons[2].activityConfig);
		if (config?.kind !== "text-select")
			throw Error("Missing binary construction");
		const targets = [19, 42, 255];
		const patterns = ["00010011", "00101010", "11111111"];
		config.tasks.forEach((task, i) => {
			expect(
				task.answerIds.reduce((sum, id) => sum + Number(id.slice(1)), 0),
			).toBe(targets[i]);
			expect(
				task.segments
					.map((s) => (task.answerIds.includes(s.id) ? "1" : "0"))
					.join(""),
			).toBe(patterns[i]);
			expect(selectionCorrect(task, [...task.answerIds].reverse())).toBe(true);
			expect(selectionCorrect(task, task.answerIds.slice(1))).toBe(false);
			expect(selectionCorrect(task, [])).toBe(false);
		});
	});
	it("keeps the reviewed final answer key and arithmetic boundaries", () => {
		const config = parseActivity(lessons[5].activityConfig);
		if (config?.kind !== "practice-quiz") throw Error("Missing final quiz");
		expect(config.questions.map((q) => q.answerId)).toEqual([
			"b",
			"a",
			"c",
			"b",
			"c",
			"a",
			"c",
			"a",
			"b",
			"c",
		]);
		expect(0b00110100).toBe(52);
		expect(0b01001001).toBe(73);
		expect(0x4f).toBe(79);
		expect(0b11000011).toBe(0xc3);
		expect(0b11111111).toBe(255);
		expect((256).toString(2)).toHaveLength(9);
	});
});
