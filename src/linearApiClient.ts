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

async function getUserId(emailOrName: string): Promise<string | null> {
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

async function getLabelIds(labelNames: string[], teamId: string): Promise<string[]> {
  const query = `
    query($teamId: String!) {
      team(id: $teamId) {
        issueLabels {
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

    const result = await response.json() as { data?: { team?: { issueLabels?: { nodes?: Array<{ id: string; name: string }> } } } };
    const labels = result.data?.team?.issueLabels?.nodes || [];

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
