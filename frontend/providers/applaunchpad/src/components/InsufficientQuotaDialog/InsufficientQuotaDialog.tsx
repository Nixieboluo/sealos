import { sealosApp } from 'sealos-desktop-sdk/app';
import { InsufficientQuotaDialogView } from './InsufficientQuotaDialogView';
import { useQuotaStore } from '@/store/quota';

export function InsufficientQuotaDialog() {
  const quotaStore = useQuotaStore();

  const handleOpenCostcenter = () => {
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        mode: 'upgrade'
      },
      messageData: {
        type: 'InternalAppCall',
        mode: 'upgrade'
      }
    });
  };

  return (
    <InsufficientQuotaDialogView
      onOpenCostCenter={handleOpenCostcenter}
      items={quotaStore.exceededQuotas}
      open={quotaStore.exceededPromptOpen}
      onOpenChange={quotaStore.setExceededPromptOpen}
      showControls={quotaStore.showExceededPromptControls}
      onConfirm={quotaStore.exceededPromptCallback ?? (() => {})}
    />
  );
}
