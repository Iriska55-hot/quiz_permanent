import test from "node:test";
import assert from "node:assert/strict";
import { quiz, questionOptions } from "../src/project.js";

test("three questions each have three useful answers for every zone", () => {
  assert.equal(quiz.questions.length, 3);
  for (const zone of [0, 1, 2]) {
    for (const question of quiz.questions) {
      assert.equal(questionOptions(question, { bottleneck: zone }).length, 3, question.title);
    }
  }
  const visibleQuestions = quiz.questions.flatMap((question) => [question.title, ...[0, 1, 2].flatMap(zone => questionOptions(question, { bottleneck: zone }).map(option => option.label))]).join(" ");
  assert.doesNotMatch(visibleQuestions, /auffrisch|korrigier|altes permanent make-up/i);
  assert.notDeepEqual(questionOptions(quiz.questions[2], { bottleneck: 0 }), questionOptions(quiz.questions[2], { bottleneck: 1 }));
});
