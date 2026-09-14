process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const authController = require('../src/controllers/authController');
const User = require('../src/models/User');

const originalFindOne = User.findOne;
const originalCompare = bcrypt.compare;

const makeResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return res;
};

test('login accepts uppercase email characters and normalizes them', async () => {
  User.findOne = async (query) => {
    assert.equal(query.email, 'user@example.com');
    return {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test User',
      email: 'user@example.com',
      password: 'hashed-password',
      role: 'user',
    };
  };

  bcrypt.compare = async (password, hash) => {
    assert.equal(password, 'secret123');
    assert.equal(hash, 'hashed-password');
    return true;
  };

  const res = makeResponse();
  await authController.loginUser({ body: { email: 'User@Example.com', password: 'secret123' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.email, 'user@example.com');
  assert.ok(res.body.token);
});

test.afterEach(() => {
  User.findOne = originalFindOne;
  bcrypt.compare = originalCompare;
});
