import { createClient, Client } from '@libsql/client';

/**
 * Database Provider Factory for Timear
 * 
 * Implements per-workspace database isolation using Turso.
 * Each Linear workspace gets its own Turso database instance.
 */

export interface TimeEntry {
  id: string;
  issueId: string;
  userId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  state?: string;
  priority?: number;
  assigneeId?: string;
  projectId?: string;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  state?: string;
  leadId?: string;
  teamIds: string[];
  createdAt: string;
  updatedAt: string;
  url?: string;
}

export interface Team {
  id: string;
  name: string;
  key: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceDatabaseProvider {
  private client: Client;
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    
    const tursoUrl = process.env.TURSO_BASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (!tursoUrl || !tursoToken) {
      throw new Error('TURSO_BASE_URL and TURSO_AUTH_TOKEN must be configured');
    }

    this.client = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });

    this.initializeSchema();
  }

  /**
   * Initialize database schema for this workspace
   */
  private async initializeSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        issue_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        state TEXT,
        priority INTEGER,
        assignee_id TEXT,
        project_id TEXT,
        team_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        url TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        state TEXT,
        lead_id TEXT,
        team_ids TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        url TEXT
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        key TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_time_entries_workspace ON time_entries(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(workspace_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_issue ON time_entries(workspace_id, issue_id);
      CREATE INDEX IF NOT EXISTS idx_issues_workspace ON issues(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_teams_workspace ON teams(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_users_workspace ON users(workspace_id);
    `;

    try {
      await this.client.executeMultiple(schema);
    } catch (error) {
      console.error('Error initializing schema:', error);
    }
  }

  /**
   * Time Entry Operations
   */

  async getTimeEntries(filters: {
    issueId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TimeEntry[]> {
    let query = 'SELECT * FROM time_entries WHERE workspace_id = ?';
    const params: any[] = [this.workspaceId];

    if (filters.issueId) {
      query += ' AND issue_id = ?';
      params.push(filters.issueId);
    }

    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }

    if (filters.startDate) {
      query += ' AND start_time >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND start_time <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY start_time DESC';

    const result = await this.client.execute({ sql: query, args: params });
    return result.rows as unknown as TimeEntry[];
  }

  async createTimeEntry(entry: TimeEntry): Promise<TimeEntry> {
    const query = `
      INSERT INTO time_entries (
        id, workspace_id, issue_id, user_id, start_time, end_time,
        duration, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.client.execute({
      sql: query,
      args: [
        entry.id,
        this.workspaceId,
        entry.issueId,
        entry.userId,
        entry.startTime,
        entry.endTime,
        entry.duration,
        entry.description || null,
        entry.createdAt,
      ],
    });

    return entry;
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry> {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.endTime !== undefined) {
      setClauses.push('end_time = ?');
      params.push(updates.endTime);
    }

    if (updates.duration !== undefined) {
      setClauses.push('duration = ?');
      params.push(updates.duration);
    }

    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id, this.workspaceId);

    const query = `
      UPDATE time_entries
      SET ${setClauses.join(', ')}
      WHERE id = ? AND workspace_id = ?
    `;

    await this.client.execute({ sql: query, args: params });

    const result = await this.client.execute({
      sql: 'SELECT * FROM time_entries WHERE id = ? AND workspace_id = ?',
      args: [id, this.workspaceId],
    });

    return result.rows[0] as unknown as TimeEntry;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM time_entries WHERE id = ? AND workspace_id = ?',
      args: [id, this.workspaceId],
    });
  }

  async getActiveTimer(userId: string): Promise<TimeEntry | null> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM time_entries WHERE workspace_id = ? AND user_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1',
      args: [this.workspaceId, userId],
    });

    return (result.rows[0] as unknown as TimeEntry) || null;
  }

  async stopActiveTimer(userId: string): Promise<TimeEntry | null> {
    const activeTimer = await this.getActiveTimer(userId);
    
    if (!activeTimer) {
      return null;
    }

    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(activeTimer.startTime).getTime();

    return this.updateTimeEntry(activeTimer.id, {
      endTime,
      duration,
    });
  }

  /**
   * Linear Data Sync Operations
   */

  async upsertIssue(issue: Issue): Promise<void> {
    const query = `
      INSERT INTO issues (
        id, workspace_id, title, description, state, priority,
        assignee_id, project_id, team_id, created_at, updated_at, url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        state = excluded.state,
        priority = excluded.priority,
        assignee_id = excluded.assignee_id,
        project_id = excluded.project_id,
        team_id = excluded.team_id,
        updated_at = excluded.updated_at,
        url = excluded.url
    `;

    await this.client.execute({
      sql: query,
      args: [
        issue.id,
        this.workspaceId,
        issue.title,
        issue.description || null,
        issue.state || null,
        issue.priority || null,
        issue.assigneeId || null,
        issue.projectId || null,
        issue.teamId || null,
        issue.createdAt,
        issue.updatedAt,
        issue.url || null,
      ],
    });
  }

  async deleteIssue(id: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM issues WHERE id = ? AND workspace_id = ?',
      args: [id, this.workspaceId],
    });
  }

  async getIssues(): Promise<Issue[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM issues WHERE workspace_id = ? ORDER BY updated_at DESC',
      args: [this.workspaceId],
    });

    return result.rows as unknown as Issue[];
  }

  async upsertProject(project: Project): Promise<void> {
    const query = `
      INSERT INTO projects (
        id, workspace_id, name, description, state, lead_id,
        team_ids, created_at, updated_at, url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        state = excluded.state,
        lead_id = excluded.lead_id,
        team_ids = excluded.team_ids,
        updated_at = excluded.updated_at,
        url = excluded.url
    `;

    await this.client.execute({
      sql: query,
      args: [
        project.id,
        this.workspaceId,
        project.name,
        project.description || null,
        project.state || null,
        project.leadId || null,
        JSON.stringify(project.teamIds),
        project.createdAt,
        project.updatedAt,
        project.url || null,
      ],
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM projects WHERE id = ? AND workspace_id = ?',
      args: [id, this.workspaceId],
    });
  }

  async getProjects(): Promise<Project[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM projects WHERE workspace_id = ? ORDER BY updated_at DESC',
      args: [this.workspaceId],
    });

    return result.rows as unknown as Project[];
  }

  async upsertTeam(team: Team): Promise<void> {
    const query = `
      INSERT INTO teams (
        id, workspace_id, name, key, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        key = excluded.key,
        description = excluded.description,
        updated_at = excluded.updated_at
    `;

    await this.client.execute({
      sql: query,
      args: [
        team.id,
        this.workspaceId,
        team.name,
        team.key,
        team.description || null,
        team.createdAt,
        team.updatedAt,
      ],
    });
  }

  async deleteTeam(id: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM teams WHERE id = ? AND workspace_id = ?',
      args: [id, this.workspaceId],
    });
  }

  async getTeams(): Promise<Team[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM teams WHERE workspace_id = ? ORDER BY name',
      args: [this.workspaceId],
    });

    return result.rows as unknown as Team[];
  }

  async upsertUser(user: User): Promise<void> {
    const query = `
      INSERT INTO users (
        id, workspace_id, name, email, avatar_url, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        avatar_url = excluded.avatar_url,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
    `;

    await this.client.execute({
      sql: query,
      args: [
        user.id,
        this.workspaceId,
        user.name,
        user.email,
        user.avatarUrl || null,
        user.isActive ? 1 : 0,
        user.createdAt,
        user.updatedAt,
      ],
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.client.execute({
      sql: 'DELETE FROM users WHERE id = ? AND workspace_id = ?',
      args: [id, this.workspaceId],
    });
  }

  async getUsers(): Promise<User[]> {
    const result = await this.client.execute({
      sql: 'SELECT * FROM users WHERE workspace_id = ? ORDER BY name',
      args: [this.workspaceId],
    });

    return result.rows as unknown as User[];
  }

  /**
   * Analytics Operations
   */

  async getAnalytics(params: {
    groupBy: 'issue' | 'user' | 'team' | 'project';
    startDate: string;
    endDate: string;
  }): Promise<any[]> {
    let query: string;

    switch (params.groupBy) {
      case 'issue':
        query = `
          SELECT 
            te.issue_id,
            i.title as issue_title,
            SUM(te.duration) as total_duration,
            COUNT(*) as entry_count
          FROM time_entries te
          LEFT JOIN issues i ON te.issue_id = i.id
          WHERE te.workspace_id = ?
            AND te.start_time >= ?
            AND te.start_time <= ?
            AND te.duration IS NOT NULL
          GROUP BY te.issue_id, i.title
          ORDER BY total_duration DESC
        `;
        break;

      case 'user':
        query = `
          SELECT 
            te.user_id,
            u.name as user_name,
            SUM(te.duration) as total_duration,
            COUNT(*) as entry_count
          FROM time_entries te
          LEFT JOIN users u ON te.user_id = u.id
          WHERE te.workspace_id = ?
            AND te.start_time >= ?
            AND te.start_time <= ?
            AND te.duration IS NOT NULL
          GROUP BY te.user_id, u.name
          ORDER BY total_duration DESC
        `;
        break;

      case 'team':
        query = `
          SELECT 
            i.team_id,
            t.name as team_name,
            SUM(te.duration) as total_duration,
            COUNT(*) as entry_count
          FROM time_entries te
          LEFT JOIN issues i ON te.issue_id = i.id
          LEFT JOIN teams t ON i.team_id = t.id
          WHERE te.workspace_id = ?
            AND te.start_time >= ?
            AND te.start_time <= ?
            AND te.duration IS NOT NULL
            AND i.team_id IS NOT NULL
          GROUP BY i.team_id, t.name
          ORDER BY total_duration DESC
        `;
        break;

      case 'project':
        query = `
          SELECT 
            i.project_id,
            p.name as project_name,
            SUM(te.duration) as total_duration,
            COUNT(*) as entry_count
          FROM time_entries te
          LEFT JOIN issues i ON te.issue_id = i.id
          LEFT JOIN projects p ON i.project_id = p.id
          WHERE te.workspace_id = ?
            AND te.start_time >= ?
            AND te.start_time <= ?
            AND te.duration IS NOT NULL
            AND i.project_id IS NOT NULL
          GROUP BY i.project_id, p.name
          ORDER BY total_duration DESC
        `;
        break;
    }

    const result = await this.client.execute({
      sql: query,
      args: [this.workspaceId, params.startDate, params.endDate],
    });

    return result.rows as any[];
  }
}

/**
 * Factory to get or create workspace database provider
 */
export class DatabaseProviderFactory {
  private static providers = new Map<string, WorkspaceDatabaseProvider>();

  static getProvider(workspaceId: string): WorkspaceDatabaseProvider {
    if (!this.providers.has(workspaceId)) {
      this.providers.set(workspaceId, new WorkspaceDatabaseProvider(workspaceId));
    }

    return this.providers.get(workspaceId)!;
  }

  static clearProviders(): void {
    this.providers.clear();
  }
}
