import assert from 'node:assert/strict';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import test from 'node:test';
import { NodeApp } from 'astro/app/node';

const hosts = [
  'dev-selection-26-test-tufts-jumbocode.vercel.app',
  'dev-selection-26-git-main-tufts-jumbocode.vercel.app',
  'dev-selection-26.vercel.app',
];
process.env.VERCEL_URL = hosts[0];
process.env.VERCEL_BRANCH_URL = hosts[1];
process.env.VERCEL_PROJECT_PRODUCTION_URL = hosts[2];
const { default: config } = await import('../../astro.config.mjs');

function forwardedRequest(host, origin = `https://${host}`) {
  const req = new IncomingMessage(new Socket());
  req.method = 'POST';
  req.url = '/api/auth/signin';
  req.headers = {
    host: 'localhost',
    'x-forwarded-host': host,
    'x-forwarded-proto': 'https',
    origin,
    'content-type': 'application/x-www-form-urlencoded',
  };
  return NodeApp.createRequest(req, {
    skipBody: true,
    allowedDomains: config.security.allowedDomains,
  });
}

test('Vercel deployment, branch, and production hosts retain their public origin', () => {
  assert.equal(config.security.checkOrigin, true);
  for (const host of hosts) {
    const request = forwardedRequest(host);
    assert.equal(new URL(request.url).origin, request.headers.get('origin'));
  }
});

test('untrusted forwarded hosts cannot set the request origin', () => {
  for (const host of ['attacker.example', 'another-project.vercel.app', `${hosts[0]}.attacker.example`]) {
    const request = forwardedRequest(host);
    assert.notEqual(new URL(request.url).origin, request.headers.get('origin'));
  }
});

test('cross-site origins still differ on a trusted deployment', () => {
  const request = forwardedRequest(hosts[0], 'https://attacker.example');
  assert.notEqual(new URL(request.url).origin, request.headers.get('origin'));
});
