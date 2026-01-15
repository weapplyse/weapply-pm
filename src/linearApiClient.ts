import { LinearTicketData } from './types.js';
import { config } from './config.js';

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const LINEAR_API_KEY = config.linearApiKey || '';

interface CreateIssueResponse {
  data: {
    issueCreate: {
      issue: {
        id: string;
        identifier: string;
        title: string;
        url: string;
      };
      success: boolean;
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * Creates a Linear ticket using Linear's GraphQL API
 * This allows automatic ticket creation without requiring MCP/Cursor
 */
export async function createLinearTicketViaAPI(
  ticketData: LinearTicketData
): Promise<{ success: boolean; issueId?: string; issueUrl?: string; error?: string }> {
  try {
    // First, we need to get the team ID from the team name
    const teamId = await getTeamId(ticketData.team);
    if (!teamId) {
      return {
        success: false,
        error: `Team "${ticketData.team}" not found`,
      };
    }

    // Build the mutation
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `;

    const variables: any = {
      input: {
        title: ticketData.title,
        description: ticketData.description,
        teamId: teamId,
      },
    };

    // Add optional fields
    if (ticketData.project) {
      const projectId = await getProjectId(ticketData.project, teamId);
      if (projectId) {
        variables.input.projectId = projectId;
      }
    }

    if (ticketData.assignee) {
      const assigneeId = await getUserId(ticketData.assignee);
      if (assigneeId) {
        variables.input.assigneeId = assigneeId;
      }
    }

    if (ticketData.labels && ticketData.labels.length > 0) {
      const labelIds = await getLabelIds(ticketData.labels, teamId);
      if (labelIds.length > 0) {
        variables.input.labelIds = labelIds;
      }
    }

    if (ticketData.priority !== undefined) {
      variables.input.priority = ticketData.priority;
    }

    // Make the API call
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });

    const result = await response.json() as CreateIssueResponse;

    if (result.errors && result.errors.length > 0) {
      return {
        success: false,
        error: result.errors.map((e) => e.message).join(', '),
      };
    }

    if (result.data?.issueCreate?.success) {
      return {
        success: true,
        issueId: result.data.issueCreate.issue.id,
        issueUrl: result.data.issueCreate.issue.url,
      };
    }

    return {
      success: false,
      error: 'Unknown error creating issue',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update an existing Linear issue
 */
export async function updateLinearIssue(
  issueId: string,
  updates: {
    title?: string;
    description?: string;
    labels?: string[];
    priority?: number;
    assignee?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const mutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            title
          }
        }
      }
    `;

    const input: any = {};

    if (updates.title) {
      input.title = updates.title;
    }

    if (updates.description) {
      input.description = updates.description;
    }

    if (updates.priority !== undefined) {
      input.priority = updates.priority;
    }

    if (updates.assignee) {
      const assigneeId = await getUserId(updates.assignee);
      if (assigneeId) {
        input.assigneeId = assigneeId;
      }
    }

    // Get issue to find team for labels
    const issueQuery = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          team {
            id
          }
        }
      }
    `;

    const issueResponse = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: issueQuery,
        variables: { id: issueId },
      }),
    });

    const issueResult = await issueResponse.json() as { data?: { issue?: { team?: { id: string } } } };
    const teamId = issueResult.data?.issue?.team?.id;

    if (updates.labels && updates.labels.length > 0 && teamId) {
      const labelIds = await getLabelIds(updates.labels, teamId);
      if (labelIds.length > 0) {
        input.labelIds = labelIds;
      }
    }

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: issueId,
          input,
        },
      }),
    });

    const result = await response.json() as { data?: { issueUpdate?: { success: boolean } }; errors?: Array<{ message: string }> };

    if (result.errors && result.errors.length > 0) {
      return {
        success: false,
        error: result.errors.map((e) => e.message).join(', '),
      };
    }

    if (result.data?.issueUpdate?.success) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Unknown error updating issue',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get issue details including description
 */
export async function getIssue(issueId: string): Promise<{
  success: boolean;
  issue?: {
    id: string;
    title: string;
    description: string;
    teamId: string;
  };
  error?: string;
}> {
  try {
    const query = `
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          title
          description
          team {
            id
          }
        }
      }
    `;

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { id: issueId },
      }),
    });

    const result = await response.json() as {
      data?: { issue?: { id: string; title: string; description: string; team?: { id: string } } };
      errors?: Array<{ message: string }>;
    };

    if (result.errors && result.errors.length > 0) {
      return {
        success: false,
        error: result.errors.map((e) => e.message).join(', '),
      };
    }

    if (result.data?.issue) {
      return {
        success: true,
        issue: {
          id: result.data.issue.id,
          title: result.data.issue.title,
          description: result.data.issue.description || '',
          teamId: result.data.issue.team?.id || '',
        },
      };
    }

    return {
      success: false,
      error: 'Issue not found',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getTeamId(teamNameOrId: string): Promise<string | null> {
  const query = `
    query {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json() as { data?: { teams?: { nodes?: Array<{ id: string; name: string; key: string }> } } };
    const teams = result.data?.teams?.nodes || [];

    // Try to find by name or key (case-insensitive)
    const team = teams.find(
      (t: any) =>
        t.name.toLowerCase() === teamNameOrId.toLowerCase() ||
        t.key.toLowerCase() === teamNameOrId.toLowerCase() ||
        t.id === teamNameOrId
    );

    return team?.id || null;
  } catch (error) {
    console.error('Error fetching teams:', error);
    return null;
  }
}

export { getTeamId };

async function getProjectId(projectNameOrId: string, teamId: string): Promise<string | null> {
  const query = `
    query($teamId: String!) {
      team(id: $teamId) {
        projects {
          nodes {
            id
            name
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { teamId },
      }),
    });

    const result = await response.json() as { data?: { team?: { projects?: { nodes?: Array<{ id: string; name: string }> } } } };
    const projects = result.data?.team?.projects?.nodes || [];

    const project = projects.find(
      (p: any) =>
        p.name.toLowerCase() === projectNameOrId.toLowerCase() ||
        p.id === projectNameOrId
    );

    return project?.id || null;
  } catch (error) {
    console.error('Error fetching projects:', error);
    return null;
  }
}

/**
 * Get user ID by email or name
 */
export async function getUserIdByEmail(emailOrName: string): Promise<string | null> {
  const query = `
    query {
      users {
        nodes {
          id
          email
          name
          displayName
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json() as { data?: { users?: { nodes?: Array<{ id: string; email?: string; name?: string; displayName?: string }> } } };
    const users = result.data?.users?.nodes || [];

    const user = users.find(
      (u: any) =>
        u.email?.toLowerCase() === emailOrName.toLowerCase() ||
        u.name?.toLowerCase() === emailOrName.toLowerCase() ||
        u.displayName?.toLowerCase() === emailOrName.toLowerCase() ||
        u.id === emailOrName
    );

    return user?.id || null;
  } catch (error) {
    console.error('Error fetching users:', error);
    return null;
  }
}

// Alias for backwards compatibility
async function getUserId(emailOrName: string): Promise<string | null> {
  return getUserIdByEmail(emailOrName);
}

/**
 * Get or create a project by name
 */
export async function getOrCreateProject(
  projectName: string,
  teamId: string
): Promise<{ id: string; created: boolean } | null> {
  // First try to find existing project
  const query = `
    query {
      projects(first: 100) {
        nodes {
          id
          name
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json() as { data?: { projects?: { nodes?: Array<{ id: string; name: string }> } } };
    const projects = result.data?.projects?.nodes || [];

    const existing = projects.find(
      (p) => p.name.toLowerCase() === projectName.toLowerCase()
    );

    if (existing) {
      return { id: existing.id, created: false };
    }

    // Create new project
    const createMutation = `
      mutation CreateProject($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          success
          project {
            id
            name
          }
        }
      }
    `;

    const createResponse = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: createMutation,
        variables: {
          input: {
            name: projectName,
            teamIds: [teamId],
          },
        },
      }),
    });

    const createResult = await createResponse.json() as {
      data?: { projectCreate?: { success: boolean; project?: { id: string } } };
      errors?: Array<{ message: string }>;
    };

    if (createResult.data?.projectCreate?.success && createResult.data.projectCreate.project) {
      console.log(`📁 Created new project: ${projectName}`);
      return { id: createResult.data.projectCreate.project.id, created: true };
    }

    if (createResult.errors) {
      console.error('Error creating project:', createResult.errors);
    }

    return null;
  } catch (error) {
    console.error('Error in getOrCreateProject:', error);
    return null;
  }
}

/**
 * Add issue to a project
 */
export async function addIssueToProject(
  issueId: string,
  projectId: string
): Promise<boolean> {
  const mutation = `
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: issueId,
          input: { projectId },
        },
      }),
    });

    const result = await response.json() as { data?: { issueUpdate?: { success: boolean } } };
    return result.data?.issueUpdate?.success || false;
  } catch (error) {
    console.error('Error adding issue to project:', error);
    return false;
  }
}

/**
 * Remove issue from its current project
 */
export async function removeFromProject(issueId: string): Promise<boolean> {
  const mutation = `
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: issueId,
          input: { projectId: null },
        },
      }),
    });

    const result = await response.json() as { data?: { issueUpdate?: { success: boolean } } };
    return result.data?.issueUpdate?.success || false;
  } catch (error) {
    console.error('Error removing issue from project:', error);
    return false;
  }
}

/**
 * Create a sub-issue under a parent issue
 */
export async function createSubIssue(
  teamId: string,
  parentIssueId: string,
  title: string,
  description: string,
  labels: string[] = []
): Promise<{ success: boolean; issueId?: string; error?: string }> {
  try {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `;

    const input: any = {
      title,
      description,
      teamId,
      parentId: parentIssueId,
    };

    // Add labels if provided
    if (labels.length > 0) {
      const labelIds = await getLabelIds(labels, teamId);
      if (labelIds.length > 0) {
        input.labelIds = labelIds;
      }
    }

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { input },
      }),
    });

    const result = await response.json() as CreateIssueResponse;

    if (result.errors && result.errors.length > 0) {
      return {
        success: false,
        error: result.errors.map((e) => e.message).join(', '),
      };
    }

    if (result.data?.issueCreate?.success) {
      return {
        success: true,
        issueId: result.data.issueCreate.issue.id,
      };
    }

    return {
      success: false,
      error: 'Unknown error creating sub-issue',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getLabelIds(labelNames: string[], teamId: string): Promise<string[]> {
  const query = `
    query($teamId: String!) {
      team(id: $teamId) {
        labels {
          nodes {
            id
            name
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { teamId },
      }),
    });

    const result = await response.json() as { data?: { team?: { labels?: { nodes?: Array<{ id: string; name: string }> } } } };
    const labels = result.data?.team?.labels?.nodes || [];

    const labelIds = labelNames
      .map((name) => {
        const label = labels.find(
          (l: any) => l.name.toLowerCase() === name.toLowerCase()
        );
        return label?.id;
      })
      .filter((id): id is string => id !== undefined);

    return labelIds;
  } catch (error) {
    console.error('Error fetching labels:', error);
    return [];
  }
}
