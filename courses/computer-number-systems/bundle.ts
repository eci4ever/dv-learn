import { readFileSync } from "node:fs";
import { activitySchema, type ActivityConfig } from "../../src/lib/lesson-activity.ts";
import { courseInput, publishableLessonInput, sectionInput } from "../../src/server/validation.ts";

const slug = "computer-number-systems";
const blueprint = readFileSync(new URL("./COURSE.md", import.meta.url), "utf8");
const sources = [
  "https://cs50.harvard.edu/x/notes/0/#computer-science-and-problem-solving",
  "https://docs.python.org/3/reference/lexical_analysis.html#integer-literals",
  "https://www.rfc-editor.org/rfc/rfc4648.html#section-8",
];
const question = (id: string, prompt: string, texts: string[], answerId: string, explanation: string) => ({
  id, prompt, choices: texts.map((text, i) => ({ id: String.fromCharCode(97 + i), text })), answerId, explanation,
});
const errorTask = (id: string, prompt: string, values: [string, string, string][], errorFieldId: string, answer: string, hint: string, explanation: string) => ({
  id, prompt, fields: values.map(([id, label, value]) => ({ id, label, value })), errorFieldId,
  acceptedValues: [answer], caseSensitive: false, hint, explanation,
});
const binaryHint = "Start at the right with 1. Include only the places with a bit of 1.";
const hexHint = "Use the digit values first, then the 16s and 1s places.";
const groupHint = "Use one four-bit group per hex digit, and preserve group order.";
const configs: ActivityConfig[] = [
  activitySchema.parse({ version: 1, kind: "practice-quiz", title: "Check the base", questions: [
    question("p1-digits", "Which digits are allowed in binary?", ["0 and 1", "1 and 2", "0 through 9"], "a", "Binary has two digit symbols, 0 and 1. The digit 2 is not allowed."),
    question("p1-valid", "Is decimal 101 a valid decimal number?", ["Yes", "No, it must be binary"], "a", "All three digits are allowed in decimal. The label establishes the interpretation."),
    question("p1-place", "What does the 4 contribute in decimal 407?", ["4", "40", "400"], "c", "4 is in the hundreds place. Count ones, tens, hundreds from the right, including the zero."),
  ] }),
  activitySchema.parse({ version: 1, kind: "error-spot", title: "Find the wrong decimal result", tasks: [
    errorTask("p2-13", "Exactly one field is wrong. Select it and enter the corrected decimal result using decimal digits only.", [["binary", "Binary", "00001101"], ["sum", "Active-place sum", "8 + 4 + 1"], ["decimal", "Decimal result", "11"]], "decimal", "13", binaryHint, "8 + 4 + 1 = 13. Read binary using place values, not the digit string as decimal."),
    errorTask("p2-128", "Find and correct the single wrong field. Use decimal digits only for the result.", [["binary", "Binary", "10000000"], ["sum", "Active-place sum", "128"], ["decimal", "Decimal result", "1"]], "decimal", "128", binaryHint, "The leftmost place in this eight-bit pattern is 128, not 1. Only that place is active."),
    errorTask("p2-zero", "Find and correct the single wrong field. Use decimal digits only for the result.", [["binary", "Binary", "00000000"], ["sum", "Active-place sum", "0"], ["decimal", "Decimal result", "8"]], "decimal", "0", binaryHint, "Every bit is zero, so no place contributes. Eight positions do not mean eight active bits."),
  ] }),
  activitySchema.parse({ version: 1, kind: "text-select", title: "Choose the active binary places", tasks: [
    ["p3-19", 19, [16, 2, 1], "00010011"],
    ["p3-42", 42, [32, 8, 2], "00101010"],
    ["p3-255", 255, [128, 64, 32, 16, 8, 4, 2, 1], "11111111"],
  ].map(([id, target, weights, pattern]) => {
    if (typeof id !== "string" || typeof target !== "number" || !Array.isArray(weights) || typeof pattern !== "string") throw new Error("Invalid authored selection task");
    return { id, prompt: `Select all place-value tiles that total decimal ${target}. Each tile can be used once. Selected means 1; unselected means 0.`,
      segments: [128, 64, 32, 16, 8, 4, 2, 1].map((weight) => ({ id: `b${weight}`, text: String(weight) })),
      answerIds: weights.map((weight) => `b${weight}`), hint: "Choose the largest tile no greater than the amount left, subtract it, then repeat.",
      explanation: `${weights.join(" + ")} = ${target}. Eight-bit binary: ${pattern}. Remove any extra tile; it changes the value.` };
  }) }),
  activitySchema.parse({ version: 1, kind: "error-spot", title: "Read the hex places", tasks: [
    errorTask("p4-a", "Select the wrong field and correct it. Use decimal digits only for the result.", [["hex", "Hex", "0xA"], ["decimal", "Decimal result", "11"]], "decimal", "10", hexHint, "A represents ten. B represents eleven."),
    errorTask("p4-3b", "Select the wrong field and correct it. Use decimal digits only for the result.", [["hex", "Hex", "0x3B"], ["sum", "Place-value calculation", "3 × 16 + 11"], ["decimal", "Decimal result", "311"]], "decimal", "59", hexHint, "3 × 16 + 11 = 48 + 11 = 59. Add the contributions; do not concatenate 3 and 11."),
    errorTask("p4-10", "Select the wrong field and correct it. Use decimal digits only for the result.", [["hex", "Hex", "0x10"], ["sum", "Place-value calculation", "1 × 16 + 0"], ["decimal", "Decimal result", "10"]], "decimal", "16", hexHint, "A one in the hex 16s place contributes sixteen. 0x10 is not decimal ten."),
  ] }),
  activitySchema.parse({ version: 1, kind: "error-spot", title: "Match four bits to one hex digit", tasks: [
    errorTask("p5-to-hex", "Select the wrong field. A hex correction must use 0x and exactly two hex digits. Letter case does not matter.", [["binary", "Binary", "00101101"], ["groups", "Four-bit groups", "0010 1101"], ["hex", "Hex result", "0x2C"]], "hex", "0x2D", groupHint, "0010 is 2. 1101 is 13, or D. Keep group order to get 0x2D."),
    errorTask("p5-to-binary", "Select the wrong field. Enter exactly eight binary digits, without a prefix or spaces.", [["hex", "Hex", "0x5E"], ["binary", "Eight-bit binary", "01011111"]], "binary", "01011110", groupHint, "5 becomes 0101. E is fourteen and becomes 1110. Together: 01011110."),
    errorTask("p5-leading", "Select the wrong field. The binary representation must have exactly eight digits, without a prefix or spaces.", [["hex", "Hex", "0x09"], ["decimal", "Decimal value", "9"], ["eight-bit-binary", "Eight-bit binary", "1001"]], "eight-bit-binary", "00001001", groupHint, "1001 has the right value but not the requested width. Add zeros on the left: 00001001. Adding them on the right changes the value."),
  ] }),
  activitySchema.parse({ version: 1, kind: "practice-quiz", title: "Number detective", questions: [
    question("Q1", "Which is not a valid binary digit string?", ["1010", "1020", "0000"], "b", "Binary allows only 0 and 1. The string 1020 contains 2."),
    question("Q2", "What is binary 00110100 in decimal?", ["52", "34", "13"], "a", "Add the active places: 32 + 16 + 4 = 52."),
    question("Q3", "Which eight-bit binary pattern represents decimal 73?", ["01001000", "10010010", "01001001"], "c", "64 + 8 + 1 = 73. The ones bit must be active."),
    question("Q4", "What is the largest unsigned eight-bit whole number in decimal?", ["256", "255", "128"], "b", "All eight places total 255. There are 256 values when zero is counted."),
    question("Q5", "What is hex 0x4F in decimal?", ["64", "415", "79"], "c", "4 × 16 + 15 = 79. F represents fifteen."),
    question("Q6", "Which hex representation matches binary 11000011?", ["0xC3", "0x3C", "0xC1"], "a", "1100 is C and 0011 is 3. Preserve group order."),
    question("Q7", "Which hex digit is invalid?", ["F", "A", "G"], "c", "Hex uses 0–9 and A–F. G is outside its alphabet."),
    question("Q8", "Which set represents the same value?", ["Decimal 16, binary 00010000, hex 0x10", "Decimal 16, binary 00001000, hex 0x10", "Decimal 16, binary 00010000, hex 0x16"], "a", "The first set totals sixteen in each base. Binary 00001000 is eight; hex 0x16 is twenty-two."),
    question("Q9", "Which eight-bit binary pattern represents zero?", ["00000001", "00000000", "10000000"], "b", "No place contributes when every bit is zero."),
    question("Q10", "Which statement is correct for unsigned eight-bit whole numbers?", ["256 fits in eight bits", "00000001 and 1 have different numeric values", "256 needs at least nine bits"], "c", "Decimal 256 is binary 100000000. Leading zeros affect width, not numeric value."),
  ] }),
];
export const course = courseInput.parse({ id: slug, slug, title: "Computer Number Systems: Decimal, Binary and Hex",
  description: "Read the same number in three different ways. Start with decimal place value, build binary numbers, and use hex to make binary easier to read. Six short lessons with worked examples, interactive practice and helpful feedback. Beginner-friendly, no videos or software installation required. Covers unsigned whole numbers from 0 to 255; about 60 minutes of active learning.",
  imageUrl: null, instructor: "DV Learn", category: "Computing fundamentals", level: "Beginner", published: false,
  archived: false, freeEnrollment: true, contentLanguage: "en", sortOrder: 1,
});
export const sections = ["Start with place value", "Binary", "Hexadecimal", "Put it together"].map((title, sortOrder) => sectionInput.parse({
  id: `${slug}-s${sortOrder + 1}`, courseId: slug, title, sortOrder,
}));
const definitions = [
  ["numbers-bases", "One value, different bases", "Identify a base, valid digits and decimal place values.", 7, 0],
  ["numbers-read-binary", "Read binary from right to left", "Add active binary place values and correct conversion mistakes.", 10, 1],
  ["numbers-build-binary", "Build an 8-bit number", "Choose the binary places needed to represent a decimal target.", 10, 1],
  ["numbers-hex", "Meet hex: sixteen digits", "Read hex digit values and convert two-digit hex numbers to decimal.", 10, 2],
  ["numbers-binary-hex", "Four bits make one hex digit", "Convert binary and hex through four-bit groups, preserving width and order.", 11, 2],
  ["numbers-detective", "Number detective", "Practise conversion, valid-digit checks and unsigned eight-bit boundaries.", 12, 3],
] as const;
export const lessons = definitions.map(([id, title, description, minutes, sectionIndex], index) => {
  const lessonBlock = blueprint.split(`## Lesson L${index + 1}: `)[1]?.split("\n## ")[0];
  const learnerCopy = lessonBlock?.split("### Learner copy\n")[1]?.split("### Author-only answer key and QA")[0];
  if (!learnerCopy || !learnerCopy.includes("#### Recap")) throw new Error(`Missing learner copy for ${id}`);
  const content = learnerCopy.trim().replace(/^#### Hint and feedback$/gm, "Common mistakes").replace(/^#### Practice P\d+$/gm, "Practice").replace(/^#### /gm, "");
  if (/Author-only|acceptedValues|errorFieldId/.test(content)) throw new Error("Author-only material leaked into learner content");
  return publishableLessonInput.parse({ id, sectionId: sections[sectionIndex].id, title, description,
    videoUrl: null, content, durationSeconds: minutes * 60, preview: true, published: true, sortOrder: index,
    resourceLinks: sources.join("\n"), lessonType: configs[index].kind === "practice-quiz" ? "quiz" : "interactive",
    activity: null, activityConfig: JSON.stringify(configs[index]),
  });
});
