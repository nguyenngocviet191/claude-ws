const createCommandPath = require.resolve('../commands/create');

jest.mock(createCommandPath, () => ({
  run: jest.fn(),
}));

const { getSubcommand, runSubcommand } = require('../subcommands');
const mockedCreateCommand = require(createCommandPath);

describe('subcommands', () => {
  beforeEach(() => {
    mockedCreateCommand.run.mockClear();
  });

  describe('getSubcommand', () => {
    it('returns the subcommand when it is supported', () => {
      expect(getSubcommand(['node', 'claude-ws', 'create'])).toBe('create');
    });

    it('returns null for unknown commands', () => {
      expect(getSubcommand(['node', 'claude-ws', 'unknown'])).toBeNull();
    });
  });

  describe('runSubcommand', () => {
    it('dispatches to the matching command module', () => {
      const handled = runSubcommand(['node', 'claude-ws', 'create', 'demo', './app']);

      expect(handled).toBe(true);
      expect(mockedCreateCommand.run).toHaveBeenCalledWith(['demo', './app']);
    });

    it('returns false when no supported subcommand is present', () => {
      const handled = runSubcommand(['node', 'claude-ws', '--help']);

      expect(handled).toBe(false);
      expect(mockedCreateCommand.run).not.toHaveBeenCalled();
    });
  });
});
