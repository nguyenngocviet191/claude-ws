/**
 * Unit tests for bin/lib/cli-parser.js
 */

const { parse } = require('../cli-parser');

describe('cli-parser', () => {
  const FLAG_SCHEMA = {
    flags: {
      port: { type: 'string', alias: 'p', default: '8556' },
      host: { type: 'string', default: 'localhost' },
      'data-dir': { type: 'string' },
      'log-dir': { type: 'string' },
      verbose: { type: 'boolean', alias: 'v' },
      force: { type: 'boolean', alias: 'f' },
      open: { type: 'boolean', default: true },
    },
  };

  describe('parse', () => {
    it('should parse simple flags', () => {
      const result = parse(['--port', '3000', '--host', '0.0.0.0'], FLAG_SCHEMA);

      expect(result.flags.port).toBe('3000');
      expect(result.flags.host).toBe('0.0.0.0');
    });

    it('should parse flags with equals sign', () => {
      const result = parse(['--port=3000', '--host=0.0.0.0'], FLAG_SCHEMA);

      expect(result.flags.port).toBe('3000');
      expect(result.flags.host).toBe('0.0.0.0');
    });

    it('should parse boolean flags', () => {
      const result = parse(['--verbose', '--force'], FLAG_SCHEMA);

      expect(result.flags.verbose).toBe(true);
      expect(result.flags.force).toBe(true);
    });

    it('should parse boolean negation', () => {
      const result = parse(['--no-open'], FLAG_SCHEMA);

      expect(result.flags.open).toBe(false);
    });

    it('should parse short aliases', () => {
      const result = parse(['-p', '3000', '-v'], FLAG_SCHEMA);

      expect(result.flags.port).toBe('3000');
      expect(result.flags.verbose).toBe(true);
    });

    it('should use default values', () => {
      const result = parse([], FLAG_SCHEMA);

      expect(result.flags.port).toBe('8556');
      expect(result.flags.host).toBe('localhost');
      expect(result.flags.verbose).toBe(false);
    });

    it('should extract positional arguments', () => {
      const result = parse(['positional1', 'positional2'], FLAG_SCHEMA);

      expect(result.args).toEqual(['positional1', 'positional2']);
    });

    it('should handle mixed flags and arguments', () => {
      const result = parse(['--port', '3000', 'arg1', '-v', 'arg2'], FLAG_SCHEMA);

      expect(result.flags.port).toBe('3000');
      expect(result.flags.verbose).toBe(true);
      expect(result.args).toEqual(['arg1', 'arg2']);
    });

    it('should handle arguments after --', () => {
      const result = parse(['--port', '3000', '--', 'not-a-flag'], FLAG_SCHEMA);

      expect(result.flags.port).toBe('3000');
      expect(result.args).toEqual(['not-a-flag']);
    });

    it('should handle unknown flags', () => {
      const result = parse(['--unknown-flag', 'value', 'arg1'], FLAG_SCHEMA);

      expect(result.flags['unknown-flag']).toBeUndefined();
      expect(result.args).toEqual(['--unknown-flag', 'value', 'arg1']);
    });

    it('should handle short flags with values', () => {
      const result = parse(['-p', '3000', '-f'], FLAG_SCHEMA);

      expect(result.flags.port).toBe('3000');
      expect(result.flags.force).toBe(true);
    });
  });
});
