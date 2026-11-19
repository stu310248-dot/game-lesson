import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchEngine } from './match-engine.js';

function createGame() {
  return new MatchEngine(() => {});
}

test('three strikes retire the batter and fourth ball awards a walk', () => {
  const game = createGame();
  game.pitch({ inZone: true });
  game.pitch({ inZone: true });
  game.pitch({ inZone: true });
  assert.equal(game.outs, 1);
  assert.equal(game.strikes, 0);
  assert.equal(game.batterNumber, 2);

  game.pitch({ inZone: false });
  game.pitch({ inZone: false });
  game.pitch({ inZone: false });
  game.pitch({ inZone: false });
  assert.deepEqual(game.bases, [true, false, false]);
  assert.equal(game.balls, 0);
});

test('foul ball does not become strike three', () => {
  const game = createGame();
  game.pitch({ inZone: true });
  game.pitch({ inZone: true });
  game.foul();
  assert.equal(game.strikes, 2);
  assert.equal(game.outs, 0);
});

test('walk advances only forced runners and scores on bases-loaded walk', () => {
  const game = createGame();
  game.bases = [false, true, true];
  game.walk();
  assert.deepEqual(game.bases, [true, true, true]);
  assert.equal(game.score[0], 0);

  game.bases = [true, true, true];
  game.walk();
  assert.deepEqual(game.bases, [true, true, true]);
  assert.equal(game.score[0], 1);
});

test('single, double, triple and home run advance runners and score correctly', () => {
  const single = createGame();
  single.bases = [true, true, true];
  single.hit('single');
  assert.deepEqual(single.bases, [true, true, true]);
  assert.equal(single.score[0], 1);

  const double = createGame();
  double.bases = [true, true, true];
  double.hit('double');
  assert.deepEqual(double.bases, [false, true, true]);
  assert.equal(double.score[0], 2);

  const triple = createGame();
  triple.bases = [true, true, true];
  triple.hit('triple');
  assert.deepEqual(triple.bases, [false, false, true]);
  assert.equal(triple.score[0], 3);

  const homer = createGame();
  homer.bases = [true, true, true];
  homer.hit('homer');
  assert.deepEqual(homer.bases, [false, false, false]);
  assert.equal(homer.score[0], 4);
});

test('three outs switch sides and clear the bases', () => {
  const game = createGame();
  game.bases = [true, true, true];
  game.addOut('出局一');
  game.addOut('出局二');
  game.addOut('出局三');
  assert.equal(game.inning, 1);
  assert.equal(game.half, '下');
  assert.equal(game.outs, 0);
  assert.deepEqual(game.bases, [false, false, false]);
});

test('a tie after the bottom of the ninth enters extra innings', () => {
  const game = createGame();
  game.inning = 9;
  game.half = '下';
  game.addOut('出局一');
  game.addOut('出局二');
  game.addOut('出局三');
  assert.equal(game.inning, 10);
  assert.equal(game.half, '上');
  assert.equal(game.gameOver, false);
});

test('home team can walk off with a hit or a bases-loaded walk', () => {
  const hit = createGame();
  hit.inning = 9;
  hit.half = '下';
  hit.score = [2, 2];
  hit.hit('homer');
  assert.equal(hit.gameOver, true);
  assert.match(hit.lastCall, /再見全壘打/);

  const walk = createGame();
  walk.inning = 9;
  walk.half = '下';
  walk.score = [2, 2];
  walk.bases = [true, true, true];
  walk.walk();
  assert.equal(walk.gameOver, true);
  assert.match(walk.lastCall, /再見保送/);
});

test('home lead after the top of the ninth ends the game without the bottom half', () => {
  const game = createGame();
  game.inning = 9;
  game.half = '上';
  game.score = [2, 3];
  game.addOut('出局一');
  game.addOut('出局二');
  game.addOut('出局三');
  assert.equal(game.gameOver, true);
  assert.equal(game.half, '下');
});


test('aggressive baserunning can score an extra runner on a single or double', () => {
  const single = createGame();
  single.bases = [false, true, true];
  single.pitch({ contact: true, result: 'single', aggressive: true });
  assert.equal(single.score[0], 2);
  assert.deepEqual(single.bases, [true, false, false]);

  const double = createGame();
  double.bases = [true, false, true];
  double.pitch({ contact: true, result: 'double', aggressive: true });
  assert.equal(double.score[0], 2);
  assert.deepEqual(double.bases, [false, true, false]);
});

test('selected runner can steal one base, score from third, or be thrown out', () => {
  const success = createGame();
  success.bases = [true, false, false];
  assert.equal(success.steal(0, true), true);
  assert.deepEqual(success.bases, [false, true, false]);

  const score = createGame();
  score.bases = [false, false, true];
  assert.equal(score.steal(2, true), true);
  assert.deepEqual(score.bases, [false, false, false]);
  assert.equal(score.score[0], 1);

  const caught = createGame();
  caught.bases = [true, false, false];
  assert.equal(caught.steal(0, false), false);
  assert.deepEqual(caught.bases, [false, false, false]);
  assert.equal(caught.outs, 1);
});

test('steal is rejected when the selected base is empty or next base is occupied', () => {
  const game = createGame();
  assert.equal(game.steal(0, true), false);
  game.bases = [true, true, false];
  assert.equal(game.steal(0, true), false);
  assert.deepEqual(game.bases, [true, true, false]);
});


test('ground-ball double play requires a runner on first and fewer than two outs', () => {
  const game = createGame();
  game.bases = [true, false, false];
  assert.equal(game.groundBallOut({ target: 'second', doublePlay: true }), true);
  assert.equal(game.outs, 2);
  assert.deepEqual(game.bases, [false, false, false]);

  const twoOuts = createGame();
  twoOuts.bases = [true, false, false];
  twoOuts.outs = 2;
  assert.equal(twoOuts.groundBallOut({ target: 'second', doublePlay: true }), true);
  assert.equal(twoOuts.outs, 0);
  assert.equal(twoOuts.half, '下');

  const noRunner = createGame();
  assert.equal(noRunner.groundBallOut({ target: 'second', doublePlay: true }), false);
  assert.equal(noRunner.outs, 0);
});
