import { useQuotaStore } from '@/store/quota';
import { useUserStore } from '@/store/user';

export type InvokeOptions = {
  requirements: Partial<Record<'cpu' | 'memory' | 'gpu' | 'nodeport' | 'storage', number>> & {
    traffic?: boolean | number;
  };
  immediate: boolean;
  allowContinue: boolean;
};

export function useQuotaGuarded(options: InvokeOptions, callback: () => void) {
  const quotaStore = useQuotaStore();
  const { session } = useUserStore();

  return () => {
    const requirements = {
      ...options.requirements,
      traffic:
        typeof options.requirements.traffic === 'boolean'
          ? // 'boolean' => requires traffic to be not exhausted, automatically skip traffic check for PAYG plan
            options.requirements.traffic === true
            ? session?.subscription?.type === 'PAYG'
              ? undefined
              : 1
            : undefined
          : // 'number' => use the exact requirement
            options.requirements.traffic
    };

    // [TODO] Add 'immediate' option
    quotaStore
      .fetchUserQuota()
      .then((quota) => {
        quotaStore.setUserQuota(quota);

        const exceededQuotas = quotaStore.checkExceededQuotas(requirements);

        if (exceededQuotas.length > 0) {
          quotaStore.setExceededQuotas(exceededQuotas);
          quotaStore.setExceededPromptControls(options.allowContinue);
          if (options.allowContinue) {
            quotaStore.setExceededPromptCallback(callback);
          } else {
            quotaStore.setExceededPromptCallback(null);
          }

          return true;
        }
        quotaStore.setExceededPromptCallback(null);
        return false;
      })
      .then((exceeded) => {
        quotaStore.setExceededPromptOpen(exceeded);

        if (!exceeded) {
          callback();
        }
      });
  };
}
