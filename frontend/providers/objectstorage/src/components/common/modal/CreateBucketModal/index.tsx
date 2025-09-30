import { Text, IconButton, IconButtonProps, Button } from '@chakra-ui/react';
import AddIcon from '@/components/Icons/AddIcon';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useQuotaGuarded } from '@/hooks/useQuotaGuarded';
import useSessionStore from '@/store/session';

export default function CreateBucketModal({
  buttonType = 'min',
  ...styles
}: { buttonType: 'min' | 'max' } & Omit<IconButtonProps, 'aria-label'>) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { session } = useSessionStore();

  const handleCreateBucket = useQuotaGuarded(
    {
      requirements: {
        traffic: true
      },
      allowContinue: true,
      immediate: true
    },
    () => {
      router.push('/bucketConfig');
    }
  );

  return (
    <>
      {buttonType === 'min' ? (
        <IconButton
          icon={<AddIcon w="20px" h="20px" />}
          onClick={() => {
            if (!session) {
              router.push('/bucketConfig');
              return;
            }
            handleCreateBucket();
          }}
          variant={'white-bg-icon'}
          p="4px"
          {...styles}
          aria-label={'create Bucket'}
        ></IconButton>
      ) : (
        <Button
          variant={'solid'}
          gap={'8px'}
          py="7.5px"
          px="36px"
          onClick={() => {
            if (!session) {
              router.push('/bucketConfig');
              return;
            }
            handleCreateBucket();
          }}
          {...styles}
        >
          <AddIcon w="20px" h="20px" />
          <Text>{t('createBucket')}</Text>
        </Button>
      )}
    </>
  );
}
