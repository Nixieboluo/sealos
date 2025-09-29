import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { sealosApp } from 'sealos-desktop-sdk/app';

type State = {
  userQuota: WorkspaceQuotaItem[];
  setUserQuota: (quotas: WorkspaceQuotaItem[]) => void;
  fetchUserQuota: () => Promise<WorkspaceQuotaItem[]>;
  exceededQuotas: WorkspaceQuotaItem[];
  setExceededQuotas: (quotas: WorkspaceQuotaItem[]) => void;
  checkExceededQuotas: (
    request: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage' | 'traffic', number>>
  ) => WorkspaceQuotaItem[];
  exceededPromptOpen: boolean;
  setExceededPromptOpen: (open: boolean) => void;
  showExceededPromptControls: boolean;
  setExceededPromptControls: (open: boolean) => void;
  exceededPromptCallback: (() => void) | null;
  setExceededPromptCallback: (callback: (() => void) | null) => void;
};

export const useQuotaStore = create<State>()(
  devtools(
    immer((set, get) => ({
      userQuota: [],
      setUserQuota: (quotas) => {
        set({
          userQuota: quotas
        });
      },
      fetchUserQuota: async () => {
        const response = await sealosApp.getWorkspaceQuota();
        return response.quota;
      },
      exceededQuotas: [],
      setExceededQuotas: (quotas) => {
        set({
          exceededQuotas: quotas
        });
      },
      checkExceededQuotas: (request) => {
        const quota = get().userQuota;

        const exceededItems = quota.filter((item) => {
          if (!(item.type in request)) return false;

          if (item.limit - item.used < request[item.type as keyof typeof request]!) {
            return true;
          }
        });

        return exceededItems;
      },
      exceededPromptOpen: false,
      setExceededPromptOpen: (open) => {
        set({
          exceededPromptOpen: open
        });
      },
      showExceededPromptControls: true,
      setExceededPromptControls: (show) => {
        set({
          showExceededPromptControls: show
        });
      },
      exceededPromptCallback: null,
      setExceededPromptCallback: (callback) => {
        set({
          exceededPromptCallback: callback
        });
      }
    }))
  )
);
