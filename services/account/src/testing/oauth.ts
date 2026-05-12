import type {
  AuthFnSocialProfile,
  AuthFnSocialProviderConfig,
  SocialOAuthPluginConfig
} from '@authfn/core';

export interface MockOAuthUser {
  providerAccountId: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
}

export interface MockOAuthConfig {
  oauthProviders: Partial<Record<'google' | 'apple', AuthFnSocialProviderConfig>>;
  oauthPlugin: Omit<SocialOAuthPluginConfig, 'providers'>;
  setUser(provider: 'google' | 'apple', code: string, user: MockOAuthUser): void;
  clear(): void;
}

export function createMockOAuthConfig(input: {
  returnTo?: string[];
  redirectUris?: string[];
} = {}): MockOAuthConfig {
  const users = new Map<string, MockOAuthUser>();

  function key(provider: string, code: string): string {
    return `${provider}:${code}`;
  }

  function defaultUser(provider: 'google' | 'apple', code: string): MockOAuthUser {
    return {
      providerAccountId: `${provider}-${code}`,
      email: `${provider}-${code}@example.test`,
      emailVerified: true,
      name: `${provider} ${code}`
    };
  }

  function profileResolver(provider: 'google' | 'apple') {
    return ({ tokenSet }: Parameters<NonNullable<AuthFnSocialProviderConfig['profileResolver']>>[0]): AuthFnSocialProfile => {
      const code = tokenSet.accessToken.replace(/^mock:[^:]+:/, '');
      const user = users.get(key(provider, code)) ?? defaultUser(provider, code);
      return {
        providerAccountId: user.providerAccountId,
        email: user.email,
        emailVerified: user.emailVerified ?? true,
        name: user.name,
        profile: {
          provider,
          code
        }
      };
    };
  }

  const google: AuthFnSocialProviderConfig = {
    clientId: 'test-google-client',
    clientSecret: 'test-google-secret',
    allowlistedRedirectUris: input.redirectUris ?? [],
    allowlistedReturnTo: input.returnTo ?? ['http://127.0.0.1:8787/auth/callback'],
    scopes: ['openid', 'email', 'profile'],
    linkByVerifiedEmail: true,
    profileResolver: profileResolver('google')
  };
  const apple: AuthFnSocialProviderConfig = {
    clientId: 'test-apple-client',
    clientSecret: 'test-apple-secret',
    allowlistedRedirectUris: input.redirectUris ?? [],
    allowlistedReturnTo: input.returnTo ?? ['http://127.0.0.1:8787/auth/callback'],
    scopes: ['name', 'email'],
    linkByVerifiedEmail: true,
    profileResolver: profileResolver('apple')
  };

  return {
    oauthProviders: {
      google,
      apple
    },
    oauthPlugin: {
      tokenHttpClient: {
        async exchangeToken(request) {
          const code = request.code ?? 'default';
          return {
            accessToken: `mock:${request.provider.id}:${code}`,
            tokenType: 'Bearer',
            expiresIn: 300,
            idToken: `mock-id-token-${code}`
          };
        },
        async revokeToken() {
          return undefined;
        }
      }
    },
    setUser(provider, code, user) {
      users.set(key(provider, code), user);
    },
    clear() {
      users.clear();
    }
  };
}
