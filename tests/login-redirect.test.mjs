import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the form handler with browser/auth boundaries stubbed, without real credentials.
async function submitLogin(query = '', failure, role = 'business_owner') {
  const currentUrl = `https://owner.example/login${query}`;
  const navigations = [], calls = [], stateUpdates = [];
  const jsx = (type, props) => ({ type, props });
  const source = ts.transpileModule(fs.readFileSync(new URL('../components/auth-flow.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const compiled = { exports: {} };
  const imports = {
    react: {
      Suspense: 'suspense', useEffect() {}, useRef: () => ({ current: [] }),
      useState: initial => [typeof initial === 'function' ? initial() : initial, value => stateUpdates.push(value)],
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': () => null,
    'next/navigation': {
      useSearchParams: () => new URL(currentUrl).searchParams,
      useRouter: () => ({ replace: url => navigations.push(['router', url]), refresh() {}, push() {} }),
    },
    'next-auth/react': {
      async signIn(provider, options) {
        calls.push({ provider, options });
        // Auth.js reads error/code from the returned callback URL, even for a successful POST.
        const url = new URL(options.redirectTo ?? currentUrl, currentUrl);
        if (failure) { url.searchParams.set('error', 'CredentialsSignin'); url.searchParams.set('code', failure); }
        return { ok: true, error: url.searchParams.get('error'), code: url.searchParams.get('code'), url: failure ? null : url.href };
      },
      getSession: async () => ({ user: { role } }),
    },
    'lucide-react': {},
    '@/lib/api': {},
    '@/lib/roles': { isBusinessDashboardRole: role => ['business_owner', 'employee'].includes(role) },
  };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    URL, window: { location: { origin: new URL(currentUrl).origin, replace: url => navigations.push(['document', url]) } },
  })(name => { assert.ok(name in imports, `Unexpected import: ${name}`); return imports[name]; }, compiled, compiled.exports);
  const formElement = compiled.exports.AuthFlow({ mode: 'login' }).props.children;
  const tree = formElement.type(formElement.props);
  const form = tree.props.children.find(child => child?.type === 'form');
  await form.props.onSubmit({ preventDefault() {} });
  return { navigations, calls, stateUpdates };
}

test('successful login navigates immediately even when the login URL contains an old auth error', async () => {
  for (const query of ['', '?error=session_required', '?error=session_expired', '?error=CredentialsSignin&code=wrong_password']) {
    const result = await submitLogin(query);
    assert.equal(result.calls[0].options.redirectTo, '/dashboard');
    assert.deepEqual(result.navigations, [['document', '/dashboard']]);
  }
});

test('login preserves local callback routes for owners and employees', async () => {
  for (const role of ['business_owner', 'employee']) {
    const result = await submitLogin('?error=session_required&callbackUrl=%2Ftasks%3Fview%3Dmine', undefined, role);
    assert.deepEqual(result.navigations, [['document', '/tasks?view=mine']]);
  }
});

test('external and login callback URLs fall back to the dashboard', async () => {
  for (const target of ['https://other.example', '//other.example', '/\\other.example', '/login?error=session_required']) {
    const result = await submitLogin(`?callbackUrl=${encodeURIComponent(target)}`);
    assert.deepEqual(result.navigations, [['document', '/dashboard']]);
  }
});

test('invalid credentials and MFA failures stay on the form with actionable feedback', async () => {
  for (const failure of ['wrong_password', 'mfa_required']) {
    const result = await submitLogin('?error=session_required', failure);
    assert.deepEqual(result.navigations, []);
    assert.ok(result.stateUpdates.includes(failure === 'wrong_password' ? 'The password is incorrect. Please try again.' : 'Enter a fresh code from your authenticator app.'));
    if (failure === 'mfa_required') assert.ok(result.stateUpdates.includes(true));
  }
});

test('a disallowed session role cannot navigate to the dashboard', async () => {
  const result = await submitLogin('', undefined, 'admin');
  assert.deepEqual(result.navigations, []);
  assert.ok(result.stateUpdates.includes('Please sign in with your business owner account.'));
});
