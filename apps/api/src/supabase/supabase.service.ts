import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { EnvConfig } from '../config/env.validation';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly supabaseUrl: string;
  private readonly publishableKey: string;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.supabaseUrl = this.configService.get('SUPABASE_URL');
    this.publishableKey = this.configService.get('SUPABASE_PUBLISHABLE_KEY');

    this.client = createClient(
      this.supabaseUrl,
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Creates a Supabase client authenticated with the user's JWT.
   * This client is subject to RLS — tenant isolation is enforced at the DB level.
   * Uses the publishable (anon) key, NOT service-role key.
   */
  getClientForUser(accessToken: string): SupabaseClient {
    return createClient(this.supabaseUrl, this.publishableKey, {
      accessToken: async () => accessToken,
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /**
   * Creates a fresh Supabase client for user-facing auth operations
   * (signInWithPassword, refreshSession). Uses the service role key — callers
   * must NOT use this client for data queries (would bypass RLS).
   */
  createAuthClient(): SupabaseClient {
    return createClient(
      this.supabaseUrl,
      this.configService.get('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
}
