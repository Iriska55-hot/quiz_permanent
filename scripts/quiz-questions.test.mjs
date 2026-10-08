import test from "node:test";
import assert from "node:assert/strict";
import { quiz } from "../src/project.js";

test("all five questions keep three answers without offering correction of old permanent makeup", () => {
  assert.equal(quiz.questions.length, 5);
  for (const question of quiz.questions) {
    assert.equal(question.options.length, 3, question.title);
  }
  const visibleQuestions = quiz.questions.flatMap((question) => [question.title, ...question.options.map((option) => option.label)]).join(" ");
  assert.doesNotMatch(visibleQuestions, /auffrisch|korrigier|altes permanent make-up/i);
});
