import { describe, expect, it } from "vitest";
import { activityExample } from "../../src/lib/activity-examples";
import { activityTranslationMatches } from "../../src/lib/course-translation";
import {
	branchingSchema,
	correctionResult,
	errorSpotSchema,
	scenarioNext,
	selectionCorrect,
	textSelectSchema,
} from "../../src/lib/generic-activity";
import { activitySchema, parseActivity } from "../../src/lib/lesson-activity";
import {
	activityTextFields,
	parseTranslation,
	setActivityText,
} from "../../src/lib/studio-translation";
import { publishableLessonInput } from "../../src/server/validation";

const selection = textSelectSchema.parse(activityExample("text-select"));
const error = errorSpotSchema.parse(activityExample("error-spot"));
const branch = branchingSchema.parse(activityExample("branching-scenario"));
const configs = [selection, error, branch];

describe("reusable activities", () => {
	it("validates starters, JSON round trips and published interactive lessons", () => {
		for (const config of configs) {
			expect(activitySchema.parse(config)).toEqual(config);
			expect(parseActivity(JSON.stringify(config))).toEqual(config);
			const lesson = {
				title: "Practice",
				sectionId: "section",
				description: "",
				content: "",
				videoUrl: null,
				activity: null,
				activityConfig: JSON.stringify(config),
				lessonType: "interactive",
				resourceLinks: "",
				durationSeconds: 60,
				sortOrder: 0,
				preview: true,
				published: true,
			};
			expect(publishableLessonInput.safeParse(lesson).success).toBe(true);
			expect(
				publishableLessonInput.safeParse({ ...lesson, lessonType: "quiz" })
					.success,
			).toBe(false);
			expect(
				publishableLessonInput.safeParse({ ...lesson, activity: "ipv4" })
					.success,
			).toBe(false);
		}
	});
	it("requires the exact selection set, not offsets or display text", () => {
		const task = selection.tasks[0];
		expect(selectionCorrect(task, [])).toBe(false);
		expect(selectionCorrect(task, ["scheme"])).toBe(false);
		expect(selectionCorrect(task, ["host", "path"])).toBe(false);
		expect(selectionCorrect(task, ["host", "host"])).toBe(false);
		expect(selectionCorrect(task, ["host"])).toBe(true);
		expect(
			selectionCorrect({ ...task, answerIds: ["host", "path"] }, [
				"path",
				"host",
			]),
		).toBe(true);
		expect(
			textSelectSchema.safeParse({
				...selection,
				tasks: [{ ...task, answerIds: ["unknown"] }],
			}).success,
		).toBe(false);
		expect(
			textSelectSchema.safeParse({
				...selection,
				tasks: [{ ...task, answerIds: [] }],
			}).success,
		).toBe(false);
		expect(
			textSelectSchema.safeParse({
				...selection,
				tasks: [{ ...task, segments: [task.segments[0], task.segments[0]] }],
			}).success,
		).toBe(false);
	});
	it("requires both the error field and an accepted correction", () => {
		const task = error.tasks[0];
		expect(correctionResult(task, "value", " APP.EXAMPLE.COM. ").correct).toBe(
			true,
		);
		expect(correctionResult(task, "type", "app.example.com")).toEqual({
			fieldCorrect: false,
			valueCorrect: true,
			correct: false,
		});
		expect(correctionResult(task, "value", "").correct).toBe(false);
		expect(
			correctionResult(task, "value", "https://app.example.com/start").correct,
		).toBe(false);
		expect(
			correctionResult(
				{ ...task, caseSensitive: true },
				"value",
				"APP.EXAMPLE.COM",
			).correct,
		).toBe(false);
		expect(
			errorSpotSchema.safeParse({
				...error,
				tasks: [{ ...task, errorFieldId: "unknown" }],
			}).success,
		).toBe(false);
		expect(
			errorSpotSchema.safeParse({
				...error,
				tasks: [{ ...task, acceptedValues: [""] }],
			}).success,
		).toBe(false);
	});
	it("follows stable branch IDs and rejects unknown or terminal choices", () => {
		expect(scenarioNext(branch, "start", "inspect")).toBe("evidence");
		expect(scenarioNext(branch, "evidence", "name")).toBe("success");
		expect(scenarioNext(branch, "start", "change")).toBe("retry");
		expect(scenarioNext(branch, "start", "unknown")).toBeNull();
		expect(scenarioNext(branch, "success", "inspect")).toBeNull();
	});
	it("rejects dangling targets, cycles, unreachable stages and missing success", () => {
		for (const nextId of ["unknown", "start"]) {
			const copy = structuredClone(branch);
			const start = copy.nodes[0];
			if (start.type !== "decision") throw Error("Expected decision");
			start.choices[0].nextId = nextId;
			expect(branchingSchema.safeParse(copy).success).toBe(false);
		}
		expect(
			branchingSchema.safeParse({ ...branch, startId: "success" }).success,
		).toBe(false);
		expect(
			branchingSchema.safeParse({
				...branch,
				nodes: [
					...branch.nodes,
					{
						id: "unused",
						type: "outcome",
						title: "Unused",
						text: "Unused",
						outcome: "retry",
					},
				],
			}).success,
		).toBe(false);
		expect(
			branchingSchema.safeParse({
				...branch,
				nodes: branch.nodes.map((node) =>
					node.type === "outcome" ? { ...node, outcome: "retry" } : node,
				),
			}).success,
		).toBe(false);
	});
	it("bounds payloads and rejects duplicate IDs and executable extra fields", () => {
		for (const config of configs) {
			expect(
				parseActivity(JSON.stringify({ ...config, version: 2 })),
			).toBeNull();
			expect(
				parseActivity(JSON.stringify({ ...config, onClick: "alert(1)" })),
			).toBeNull();
		}
		expect(parseActivity("x".repeat(64001))).toBeNull();
		expect(
			textSelectSchema.safeParse({
				...selection,
				tasks: [selection.tasks[0], selection.tasks[0]],
			}).success,
		).toBe(false);
		expect(
			branchingSchema.safeParse({
				...branch,
				nodes: [...branch.nodes, branch.nodes[0]],
			}).success,
		).toBe(false);
	});
	it("allows BM display copy while preserving IDs, answer keys and branching topology", () => {
		for (const config of configs) {
			const original = JSON.stringify(config);
			let translated = original;
			const fields = activityTextFields(original);
			expect(fields.length).toBeGreaterThan(3);
			for (const field of fields)
				translated = setActivityText(
					translated,
					field.path,
					`BM ${field.text}`,
				);
			expect(activityTranslationMatches(original, translated)).toBe(true);
			expect(() =>
				parseTranslation(
					"lesson",
					{
						title: "Latihan",
						description: "",
						content: "",
						activityConfig: translated,
					},
					{ title: "Practice", activityConfig: original },
					"interactive",
				),
			).not.toThrow();
		}
	});
	it("rejects translated grading, normalization, segment order and scenario changes", () => {
		const changedSelection = structuredClone(selection);
		changedSelection.tasks[0].answerIds = ["scheme"];
		expect(
			activityTranslationMatches(
				JSON.stringify(selection),
				JSON.stringify(changedSelection),
			),
		).toBe(false);
		changedSelection.tasks[0] = {
			...selection.tasks[0],
			segments: [...selection.tasks[0].segments].reverse(),
		};
		expect(
			activityTranslationMatches(
				JSON.stringify(selection),
				JSON.stringify(changedSelection),
			),
		).toBe(false);
		expect(
			activityTranslationMatches(
				JSON.stringify(error),
				JSON.stringify({
					...error,
					tasks: [{ ...error.tasks[0], acceptedValues: ["wrong"] }],
				}),
			),
		).toBe(false);
		expect(
			activityTranslationMatches(
				JSON.stringify(error),
				JSON.stringify({
					...error,
					tasks: [{ ...error.tasks[0], caseSensitive: true }],
				}),
			),
		).toBe(false);
		const changedBranch = structuredClone(branch);
		const start = changedBranch.nodes[0];
		if (start.type !== "decision") throw Error("Expected decision");
		start.choices[1].nextId = "evidence";
		expect(
			activityTranslationMatches(
				JSON.stringify(branch),
				JSON.stringify(changedBranch),
			),
		).toBe(false);
		expect(() =>
			setActivityText(JSON.stringify(branch), ["startId"], "retry"),
		).toThrow();
	});
});
