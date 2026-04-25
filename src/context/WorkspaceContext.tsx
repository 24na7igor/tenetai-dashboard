import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { API_BASE } from '../config';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  tier: 'free' | 'mid' | 'enterprise';
  max_users: number;
  max_agents: number;
  max_executions_per_month: number;
  retention_days: number;
  is_active: boolean;
  created_at: string;
}

interface WorkspaceWithRole {
  workspace: Workspace;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

interface WorkspaceContextType {
  workspaces: WorkspaceWithRole[];
  currentWorkspace: Workspace | null;
  currentRole: string | null;
  isLoading: boolean;
  setCurrentWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);


export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/workspaces`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkspaces(response.data);

      // Set current workspace from localStorage or first workspace
      const savedWorkspaceId = localStorage.getItem('tenet_workspace_id');
      const found = response.data.find((w: WorkspaceWithRole) => w.workspace.id === savedWorkspaceId);

      if (found) {
        setCurrentWorkspaceState(found.workspace);
        setCurrentRole(found.role);
      } else if (response.data.length > 0) {
        setCurrentWorkspaceState(response.data[0].workspace);
        setCurrentRole(response.data[0].role);
        localStorage.setItem('tenet_workspace_id', response.data[0].workspace.id);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setCurrentRole(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, token]);

  const setCurrentWorkspace = (workspace: Workspace) => {
    setCurrentWorkspaceState(workspace);
    localStorage.setItem('tenet_workspace_id', workspace.id);

    const found = workspaces.find(w => w.workspace.id === workspace.id);
    setCurrentRole(found?.role || null);
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const response = await axios.post(
      `${API_BASE}/workspaces`,
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    await fetchWorkspaces();
    return response.data;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        currentRole,
        isLoading,
        setCurrentWorkspace,
        refreshWorkspaces: fetchWorkspaces,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
