const { findProjectByDir } = require('../command-helpers');

describe('command helpers', () => {
  describe('findProjectByDir', () => {
    const projects = [
      { id: 'p1', path: '/workspace/app' },
      { id: 'p2', path: '/workspace/other' },
    ];

    it('matches exact project path', () => {
      expect(findProjectByDir(projects, '/workspace/app')).toEqual(projects[0]);
    });

    it('matches nested path inside project', () => {
      expect(findProjectByDir(projects, '/workspace/app/src')).toEqual(projects[0]);
    });

    it('returns null when path does not belong to a project', () => {
      expect(findProjectByDir(projects, '/workspace/nope')).toBeNull();
    });
  });
});
