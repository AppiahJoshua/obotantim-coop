const { MODULES_BY_ROLE, parseDisabledModules, hasModuleAccess } = require('../src/utils/moduleAccess');

describe('module access overrides', () => {
  test('allows role-default modules unless explicitly disabled', () => {
    expect(hasModuleAccess({ role: 'manager', disabled_modules: [] }, 'messages')).toBe(true);
    expect(hasModuleAccess({ role: 'manager', disabled_modules: '["messages"]' }, 'messages')).toBe(false);
  });

  test('does not grant a module outside the user role', () => {
    expect(hasModuleAccess({ role: 'content_editor', disabled_modules: [] }, 'registrations')).toBe(false);
  });

  test('super admins always retain full access', () => {
    expect(hasModuleAccess({ role: 'super_admin', disabled_modules: MODULES_BY_ROLE.super_admin }, 'settings')).toBe(true);
  });

  test('safely parses stored module lists', () => {
    expect(parseDisabledModules('["messages"]')).toEqual(['messages']);
    expect(parseDisabledModules('invalid')).toEqual([]);
  });
});