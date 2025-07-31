const assert = require('assert');
const sinon = require('sinon');
const Leaderboard = require('../scripts/leaderboard');

let leaderboard;
let localStorageStub;

describe('Leaderboard', () => {
  beforeEach(() => {
    // Mock localStorage
    localStorageStub = {
      getItem: sinon.stub(),
      setItem: sinon.stub()
    };
    global.localStorage = localStorageStub;

    leaderboard = new Leaderboard();
  });

  afterEach(() => {
    delete global.localStorage;
  });

  describe('constructor', () => {
    it('initializes with default values', () => {
      assert.strictEqual(leaderboard.maxEntries, 10);
      assert.strictEqual(leaderboard.storageKey, 'pacmanLeaderboard');
      assert(Array.isArray(leaderboard.scores));
    });

    it('loads existing scores from localStorage', () => {
      const mockScores = [{ score: 1000, name: 'Player1', level: 5, date: '2023-01-01T00:00:00.000Z' }];
      localStorageStub.getItem.returns(JSON.stringify(mockScores));

      const lb = new Leaderboard();
      assert.deepEqual(lb.scores, mockScores);
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorageStub.getItem.returns('invalid json');

      const lb = new Leaderboard();
      assert.deepEqual(lb.scores, []);
    });
  });

  describe('addScore', () => {
    it('adds a score to empty leaderboard', () => {
      const result = leaderboard.addScore(1000, 'Player1', 5);

      assert.strictEqual(result.madeLeaderboard, true);
      assert.strictEqual(result.position, 1);
      assert.strictEqual(result.isNewRecord, true);
      assert.strictEqual(leaderboard.scores.length, 1);
      assert.strictEqual(leaderboard.scores[0].score, 1000);
      assert.strictEqual(leaderboard.scores[0].name, 'Player1');
      assert.strictEqual(leaderboard.scores[0].level, 5);
    });

    it('inserts score in correct position', () => {
      leaderboard.addScore(1000, 'Player1', 5);
      leaderboard.addScore(1500, 'Player2', 7);
      leaderboard.addScore(500, 'Player3', 3);

      assert.strictEqual(leaderboard.scores[0].score, 1500);
      assert.strictEqual(leaderboard.scores[1].score, 1000);
      assert.strictEqual(leaderboard.scores[2].score, 500);
    });

    it('limits to maximum entries', () => {
      // Fill leaderboard to capacity
      for (let i = 0; i < 11; i++) {
        leaderboard.addScore(1000 - i, `Player${i}`, 1);
      }

      assert.strictEqual(leaderboard.scores.length, 10);
      assert.strictEqual(leaderboard.scores[9].score, 991); // Lowest score kept
    });

    it('rejects scores that do not make the leaderboard', () => {
      // Fill leaderboard
      for (let i = 0; i < 10; i++) {
        leaderboard.addScore(1000 - i, `Player${i}`, 1);
      }

      const result = leaderboard.addScore(500, 'BadPlayer', 1);

      assert.strictEqual(result.madeLeaderboard, false);
      assert.strictEqual(result.position, null);
      assert.strictEqual(leaderboard.scores.length, 10);
    });

    it('uses default name for empty string', () => {
      leaderboard.addScore(1000, '', 5);
      assert.strictEqual(leaderboard.scores[0].name, 'Anonymous');
    });

    it('trims whitespace from names', () => {
      leaderboard.addScore(1000, '  Player1  ', 5);
      assert.strictEqual(leaderboard.scores[0].name, 'Player1');
    });
  });

  describe('getHighScore', () => {
    it('returns 0 for empty leaderboard', () => {
      assert.strictEqual(leaderboard.getHighScore(), 0);
    });

    it('returns highest score', () => {
      leaderboard.addScore(1000, 'Player1', 5);
      leaderboard.addScore(1500, 'Player2', 7);

      assert.strictEqual(leaderboard.getHighScore(), 1500);
    });
  });

  describe('wouldMakeLeaderboard', () => {
    it('returns true for empty leaderboard', () => {
      assert.strictEqual(leaderboard.wouldMakeLeaderboard(100), true);
    });

    it('returns true when leaderboard is not full', () => {
      leaderboard.addScore(1000, 'Player1', 5);
      assert.strictEqual(leaderboard.wouldMakeLeaderboard(500), true);
    });

    it('returns true for score higher than lowest', () => {
      // Fill leaderboard
      for (let i = 0; i < 10; i++) {
        leaderboard.addScore(1000 - i, `Player${i}`, 1);
      }

      assert.strictEqual(leaderboard.wouldMakeLeaderboard(995), true);
      assert.strictEqual(leaderboard.wouldMakeLeaderboard(990), false);
    });
  });

  describe('getStatistics', () => {
    it('returns empty stats for no scores', () => {
      const stats = leaderboard.getStatistics();

      assert.strictEqual(stats.totalGames, 0);
      assert.strictEqual(stats.averageScore, 0);
      assert.strictEqual(stats.highestLevel, 0);
      assert.strictEqual(stats.oldestEntry, null);
      assert.strictEqual(stats.newestEntry, null);
    });

    it('calculates correct statistics', () => {
      leaderboard.addScore(1000, 'Player1', 5);
      leaderboard.addScore(2000, 'Player2', 10);

      const stats = leaderboard.getStatistics();

      assert.strictEqual(stats.totalGames, 2);
      assert.strictEqual(stats.averageScore, 1500);
      assert.strictEqual(stats.highestLevel, 10);
      assert(stats.oldestEntry);
      assert(stats.newestEntry);
    });
  });

  describe('clearScores', () => {
    it('removes all scores', () => {
      leaderboard.addScore(1000, 'Player1', 5);
      leaderboard.clearScores();

      assert.strictEqual(leaderboard.scores.length, 0);
    });
  });

  describe('formatScore', () => {
    it('pads scores to 6 digits', () => {
      assert.strictEqual(leaderboard.formatScore(123), '000123');
      assert.strictEqual(leaderboard.formatScore(123456), '123456');
    });
  });

  describe('saveScores and loadScores', () => {
    it('saves scores to localStorage', () => {
      leaderboard.addScore(1000, 'Player1', 5);

      assert(localStorageStub.setItem.called);
      const savedData = JSON.parse(localStorageStub.setItem.getCall(0).args[1]);
      assert.strictEqual(savedData[0].score, 1000);
    });

    it('handles localStorage errors gracefully', () => {
      localStorageStub.setItem.throws(new Error('Storage full'));

      // Should not throw
      assert.doesNotThrow(() => {
        leaderboard.addScore(1000, 'Player1', 5);
      });
    });
  });
});
